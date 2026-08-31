from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

import fastf1
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".fastf1_cache"
OUTPUT_FILE = ROOT / "assets" / "data" / "alpha-release.json"
OUTPUT_JS_FILE = ROOT / "js" / "alpha-release-data.js"

EVENTS = [
    (2025, "Australian Grand Prix", "Australia"),
    (2025, "Chinese Grand Prix", "China"),
    (2025, "Japanese Grand Prix", "Japan"),
    (2025, "Miami Grand Prix", "Miami"),
    (2025, "Canadian Grand Prix", "Canada"),
    (2025, "Monaco Grand Prix", "Monaco"),
    (2025, "Spanish Grand Prix", "Barcelona"),
    (2025, "Austrian Grand Prix", "Austria"),
    (2025, "British Grand Prix", "Great Britain"),
    (2025, "Belgian Grand Prix", "Belgium"),
    (2025, "Hungarian Grand Prix", "Hungary"),
    (2025, "Dutch Grand Prix", "Netherlands"),
    (2026, "Australian Grand Prix", "Australia"),
    (2026, "Chinese Grand Prix", "China"),
    (2026, "Japanese Grand Prix", "Japan"),
    (2026, "Miami Grand Prix", "Miami"),
    (2026, "Canadian Grand Prix", "Canada"),
    (2026, "Monaco Grand Prix", "Monaco"),
    (2026, "Barcelona-Catalunya Grand Prix", "Barcelona"),
    (2026, "Austrian Grand Prix", "Austria"),
    (2026, "British Grand Prix", "Great Britain"),
    (2026, "Belgian Grand Prix", "Belgium"),
    (2026, "Hungarian Grand Prix", "Hungary"),
    (2026, "Dutch Grand Prix", "Netherlands"),
]

# Fallback colors keep the step charts readable when FastF1 does not provide a
# team color for a driver result row.
DEFAULT_COLORS = [
    "#8f4f18",
    "#2f6f63",
    "#b35d2c",
    "#5a4a3b",
    "#7a6a57",
]


def ensure_cache() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))


def to_seconds(series: pd.Series) -> pd.Series:
    return series.dt.total_seconds()


def classify_track_status(value: str) -> str:
    # FastF1 track status can contain multiple status digits for a lap. Keep the
    # most disruptive state so the timeline does not collapse everything into
    # generic yellow-flag periods.
    text = "" if pd.isna(value) else str(value)
    if "5" in text:
        return "Red Flag"
    if "4" in text:
        return "Safety Car"
    if "6" in text or "7" in text:
        return "VSC"
    if "2" in text:
        return "Yellow"
    return "Green"


def classification_bucket(classified_position: object, status: object) -> str:
    """Group official result states without mislabelling every non-classification as a DNF."""
    classified_text = "" if pd.isna(classified_position) else str(classified_position).strip()
    if classified_text.isdigit():
        return "classified"
    try:
        classified_number = float(classified_text)
        if classified_number.is_integer() and classified_number > 0:
            return "classified"
    except (TypeError, ValueError):
        pass

    status_text = "" if pd.isna(status) else str(status).strip().lower()
    if "disqual" in status_text:
        return "disqualified"
    if "did not start" in status_text or "withdraw" in status_text:
        return "didNotStart"
    if "did not qualify" in status_text:
        return "didNotQualify"
    return "unclassified"


def build_race_payload(year: int, event_name: str, circuit: str) -> dict:
    session = fastf1.get_session(year, event_name, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=True)

    laps = session.laps.copy()
    results = session.results.copy()
    laps["LapTimeSeconds"] = to_seconds(laps["LapTime"])
    laps["TrackState"] = laps["TrackStatus"].apply(classify_track_status)

    timed_laps = laps[
        laps["LapTimeSeconds"].notna()
        & laps["LapNumber"].notna()
        & laps["IsAccurate"].fillna(False)
    ].copy()

    clean_laps = timed_laps[timed_laps["TrackState"] == "Green"].copy()
    if clean_laps.empty:
        clean_laps = timed_laps.copy()

    # Position sampling and lap timing answer different questions. Requiring an
    # accurate lap time here used to drop starts, pit laps and late-race laps
    # from the running-order story.
    position_laps = laps[
        laps["Driver"].notna()
        & laps["Position"].notna()
        & laps["LapNumber"].notna()
    ].copy()

    best_laps = (
        clean_laps.groupby("Driver", as_index=False)
        .agg(
            bestLapSec=("LapTimeSeconds", "min"),
            maxSpeedST=("SpeedST", "max"),
            team=("Team", "first"),
        )
        .dropna(subset=["bestLapSec"])
    )

    fastest_lap_sec = float(best_laps["bestLapSec"].min())
    median_best_lap_sec = float(best_laps["bestLapSec"].median())
    median_speed_trap = float(best_laps["maxSpeedST"].dropna().median())

    position_change_total = 0.0
    position_transition_count = 0
    for _, driver_laps in position_laps.groupby("Driver"):
        # This is a movement proxy, not an overtake counter. Count only adjacent
        # observed laps, then normalize by the number of driver-lap transitions
        # so races of different length and field size are more comparable.
        ordered = (
            driver_laps.sort_values("LapNumber")
            .drop_duplicates(subset=["LapNumber"], keep="last")
        )
        lap_step = ordered["LapNumber"].diff()
        position_step = ordered["Position"].diff().abs()
        consecutive = lap_step.eq(1) & position_step.notna()
        position_change_total += float(position_step.loc[consecutive].sum())
        position_transition_count += int(consecutive.sum())

    position_change_rate = (
        position_change_total / position_transition_count * 100
        if position_transition_count
        else 0.0
    )

    status_laps = laps[laps["LapNumber"].notna() & laps["TrackStatus"].notna()].copy()
    status_laps["PositionNumeric"] = pd.to_numeric(
        status_laps["Position"], errors="coerce"
    )
    max_lap = int(status_laps["LapNumber"].max())
    status_rows = []
    for lap_number in range(1, max_lap + 1):
        # FastF1's lap number belongs to each individual car. Unioning every
        # driver's status for lap N smears an incident across adjacent race laps
        # once cars are lapped. Use the car running P1 as the canonical race-lap
        # clock; if that row is absent, fall back to the highest-running sampled
        # car for that lap instead of unioning asynchronous personal laps.
        lap_samples = status_laps.loc[
            status_laps["LapNumber"] == lap_number
        ].sort_values(["PositionNumeric", "Time"], na_position="last")
        leader_samples = lap_samples.loc[lap_samples["PositionNumeric"] == 1]
        canonical_status = ""
        if not leader_samples.empty:
            canonical_status = leader_samples.iloc[0]["TrackStatus"]
        elif not lap_samples.empty:
            canonical_status = lap_samples.iloc[0]["TrackStatus"]
        status_rows.append(
            {
                "lap": lap_number,
                "state": classify_track_status(canonical_status),
            }
        )

    caution_lap_count = sum(1 for row in status_rows if row["state"] != "Green")
    neutralized_states = {"VSC", "Safety Car", "Red Flag"}
    neutralized_lap_count = sum(1 for row in status_rows if row["state"] in neutralized_states)

    classification_breakdown = {
        "classified": 0,
        "unclassified": 0,
        "disqualified": 0,
        "didNotStart": 0,
        "didNotQualify": 0,
    }
    for _, result in results.iterrows():
        bucket = classification_bucket(result.get("ClassifiedPosition"), result.get("Status"))
        classification_breakdown[bucket] += 1
    not_classified_count = sum(
        count for key, count in classification_breakdown.items() if key != "classified"
    )
    drivers_completing_lap_count = int(
        pd.to_numeric(results.get("Laps"), errors="coerce").fillna(0).gt(0).sum()
    )

    top_finishers = (
        results.sort_values("Position")
        .dropna(subset=["Position"])
        .head(5)
        .reset_index(drop=True)
    )

    step_drivers = []
    for idx, row in top_finishers.iterrows():
        abbreviation = row["Abbreviation"]
        raw_color = row.get("TeamColor")
        color = "" if pd.isna(raw_color) else str(raw_color).strip()
        color = f"#{color}" if color else DEFAULT_COLORS[idx % len(DEFAULT_COLORS)]

        driver_positions = (
            position_laps.loc[position_laps["Driver"] == abbreviation, ["LapNumber", "Position"]]
            .sort_values("LapNumber")
            .drop_duplicates(subset=["LapNumber"], keep="last")
        )

        completed_laps = 0 if pd.isna(row.get("Laps")) else int(row.get("Laps"))
        grid_position = 0 if pd.isna(row.get("GridPosition")) else int(row.get("GridPosition"))
        if completed_laps > 0:
            final_row = pd.DataFrame(
                [{"LapNumber": completed_laps, "Position": int(row["Position"])}]
            )
            driver_positions = (
                pd.concat([driver_positions, final_row], ignore_index=True)
                .sort_values("LapNumber")
                .drop_duplicates(subset=["LapNumber"], keep="last")
            )

        step_drivers.append(
            {
                "driver": abbreviation,
                "team": row["TeamName"],
                "finalPosition": int(row["Position"]),
                "gridPosition": grid_position,
                "color": color,
                "positionObservationCount": int(len(driver_positions)),
                "positionCoverage": round(
                    len(driver_positions) / completed_laps if completed_laps else 0.0,
                    3,
                ),
                "positions": [
                    {
                        "lap": int(lap),
                        "position": int(position),
                    }
                    for lap, position in driver_positions.itertuples(index=False, name=None)
                ],
            }
        )

    return {
        "raceKey": f"{year}-{circuit.lower()}",
        "raceLabel": f"{year} {circuit}",
        "year": year,
        "circuit": circuit,
        "eventName": event_name,
        "totalLaps": max_lap,
        "metrics": {
            "medianBestLapSec": round(median_best_lap_sec, 3),
            "fastestLapSec": round(fastest_lap_sec, 3),
            "medianSpeedTrap": round(median_speed_trap, 2),
            "positionChangeTotal": round(position_change_total, 1),
            "positionTransitionCount": position_transition_count,
            "positionChangeRate": round(position_change_rate, 2),
            "cautionLapCount": caution_lap_count,
            "neutralizedLapCount": neutralized_lap_count,
            "notClassifiedCount": not_classified_count,
            "driversCompletingLapCount": drivers_completing_lap_count,
        },
        "classificationBreakdown": classification_breakdown,
        "statusTimeline": status_rows,
        "topFinishers": step_drivers,
    }


def build_scorecard(races: list[dict]) -> list[dict]:
    by_circuit: dict[str, dict[int, dict]] = {}
    for race in races:
        by_circuit.setdefault(race["circuit"], {})[race["year"]] = race

    metrics = [
        ("medianBestLapSec", "Median best lap (s)"),
        ("fastestLapSec", "Fastest lap (s)"),
        ("medianSpeedTrap", "Median speed trap (km/h)"),
        ("positionChangeRate", "Movement / 100 driver-lap transitions"),
        ("cautionLapCount", "Caution-affected laps"),
        ("neutralizedLapCount", "SC/VSC/red-flag laps"),
        ("notClassifiedCount", "Not officially classified"),
    ]

    scorecard = []
    for circuit, seasons in by_circuit.items():
        older = seasons[2025]["metrics"]
        newer = seasons[2026]["metrics"]
        for key, label in metrics:
            scorecard.append(
                {
                    "circuit": circuit,
                    "metricKey": key,
                    "metricLabel": label,
                    "season2025": older[key],
                    "season2026": newer[key],
                    "delta": round(newer[key] - older[key], 3),
                }
            )
    return scorecard


def build_summary(races: list[dict]) -> dict:
    by_circuit: dict[str, dict[int, dict]] = {}
    for race in races:
        by_circuit.setdefault(race["circuit"], {})[race["year"]] = race

    paired = {
        circuit: seasons
        for circuit, seasons in by_circuit.items()
        if 2025 in seasons and 2026 in seasons
    }

    def deltas(metric_key: str) -> list[float]:
        return [
            seasons[2026]["metrics"][metric_key] - seasons[2025]["metrics"][metric_key]
            for seasons in paired.values()
        ]

    def mean(values: list[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    pace_deltas = deltas("medianBestLapSec")
    fastest_deltas = deltas("fastestLapSec")
    speed_deltas = deltas("medianSpeedTrap")
    movement_deltas = deltas("positionChangeRate")

    def season_total(metric_key: str, year: int) -> float:
        return sum(
            seasons[year]["metrics"][metric_key]
            for seasons in paired.values()
        )

    return {
        "circuitCount": len(paired),
        "raceCount": len(paired) * 2,
        "seasons": [2025, 2026],
        "circuits": list(paired.keys()),
        "pace": {
            "slowerCircuits": sum(delta > 0 for delta in pace_deltas),
            "fasterCircuits": sum(delta < 0 for delta in pace_deltas),
            "meanDeltaSec": round(mean(pace_deltas), 3),
            "fastestLapMeanDeltaSec": round(mean(fastest_deltas), 3),
        },
        "speedTrap": {
            "lowerCircuits": sum(delta < 0 for delta in speed_deltas),
            "higherCircuits": sum(delta > 0 for delta in speed_deltas),
            "meanDeltaKmh": round(mean(speed_deltas), 2),
        },
        "movement": {
            "lowerCircuits": sum(delta < 0 for delta in movement_deltas),
            "higherCircuits": sum(delta > 0 for delta in movement_deltas),
            "meanDeltaPer100": round(mean(movement_deltas), 2),
        },
        "raceControl": {
            "cautionLaps2025": int(season_total("cautionLapCount", 2025)),
            "cautionLaps2026": int(season_total("cautionLapCount", 2026)),
            "neutralizedLaps2025": int(season_total("neutralizedLapCount", 2025)),
            "neutralizedLaps2026": int(season_total("neutralizedLapCount", 2026)),
        },
        "classification": {
            "notClassified2025": int(season_total("notClassifiedCount", 2025)),
            "notClassified2026": int(season_total("notClassifiedCount", 2026)),
        },
    }


def main() -> None:
    ensure_cache()
    races = [build_race_payload(*event) for event in EVENTS]

    payload = {
        "schemaVersion": 2,
        "projectTitle": "Regulation Delta: The Ghost Lap",
        "subtitle": "A matched-circuit comparison of Formula 1 in 2025 and 2026",
        "generatedFrom": "FastF1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fastf1Version": fastf1.__version__,
        "analysisScope": "Matched race sessions; descriptive comparison, not causal attribution",
        "races": races,
        "scorecard": build_scorecard(races),
        "summary": build_summary(races),
        "metricDefinitions": {
            "medianBestLapSec": "Median of each driver's best accurate green-flag lap.",
            "fastestLapSec": "Fastest accurate green-flag lap in the race sample.",
            "medianSpeedTrap": "Median of each driver's maximum speed-trap reading on accurate green-flag laps.",
            "positionChangeRate": "Absolute position-slot movement per 100 consecutive observed driver-lap transitions; includes strategy, retirements and race-control effects, so it is not an overtake count.",
            "cautionLapCount": "Leader-clock race laps with a local yellow, VSC, Safety Car or red flag state.",
            "neutralizedLapCount": "Leader-clock race laps under VSC, Safety Car or red flag; local yellow-only laps are excluded.",
            "notClassifiedCount": "Drivers without a numeric official classification, separated into unclassified, disqualified, DNS and DNQ categories in each race payload.",
        },
        "caveats": [
            "Weather, tire choice, track evolution, strategy and field composition are not controlled.",
            "Matched circuits reveal association; they do not isolate the regulations as the cause.",
            "Running-order movement is a normalized proxy, not a clean-overtake counter.",
        ],
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    OUTPUT_JS_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS_FILE.write_text(
        "window.ALPHA_RELEASE_DATA = " + json.dumps(payload, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_FILE}")
    print(f"Wrote {OUTPUT_JS_FILE}")


if __name__ == "__main__":
    main()
