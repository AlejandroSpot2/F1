from __future__ import annotations

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
    (2026, "Australian Grand Prix", "Australia"),
    (2026, "Chinese Grand Prix", "China"),
    (2026, "Japanese Grand Prix", "Japan"),
]

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


def is_dnf(classified_position: object) -> bool:
    return not str(classified_position).isdigit()


def build_race_payload(year: int, event_name: str, circuit: str) -> dict:
    session = fastf1.get_session(year, event_name, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=True)

    laps = session.laps.copy()
    results = session.results.copy()
    laps["LapTimeSeconds"] = to_seconds(laps["LapTime"])
    laps["TrackState"] = laps["TrackStatus"].apply(classify_track_status)

    valid_laps = laps[
        laps["LapTimeSeconds"].notna()
        & laps["Position"].notna()
        & laps["LapNumber"].notna()
        & laps["IsAccurate"].fillna(False)
    ].copy()

    clean_laps = valid_laps[valid_laps["TrackState"] == "Green"].copy()
    if clean_laps.empty:
        clean_laps = valid_laps.copy()

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

    position_change_proxy = 0.0
    for _, driver_laps in valid_laps.groupby("Driver"):
        ordered = driver_laps.sort_values("LapNumber")
        position_change_proxy += ordered["Position"].diff().abs().fillna(0).sum()

    max_lap = int(valid_laps["LapNumber"].max())
    status_rows = []
    for lap_number in range(1, max_lap + 1):
        lap_statuses = valid_laps.loc[valid_laps["LapNumber"] == lap_number, "TrackStatus"]
        combined = "".join(sorted({str(value) for value in lap_statuses.dropna()}))
        status_rows.append(
            {
                "lap": lap_number,
                "state": classify_track_status(combined),
            }
        )

    neutralized_lap_count = sum(1 for row in status_rows if row["state"] != "Green")
    dnf_count = int(results["ClassifiedPosition"].apply(is_dnf).sum())

    top_finishers = (
        results.sort_values("Position")
        .dropna(subset=["Position"])
        .head(5)
        .reset_index(drop=True)
    )

    step_drivers = []
    for idx, row in top_finishers.iterrows():
        abbreviation = row["Abbreviation"]
        color = str(row.get("TeamColor") or "").strip()
        color = f"#{color}" if color else DEFAULT_COLORS[idx % len(DEFAULT_COLORS)]

        driver_positions = (
            valid_laps.loc[valid_laps["Driver"] == abbreviation, ["LapNumber", "Position"]]
            .sort_values("LapNumber")
            .drop_duplicates(subset=["LapNumber"])
        )

        step_drivers.append(
            {
                "driver": abbreviation,
                "team": row["TeamName"],
                "finalPosition": int(row["Position"]),
                "gridPosition": int(row["GridPosition"]),
                "color": color,
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
            "positionChangeProxy": round(float(position_change_proxy), 1),
            "neutralizedLapCount": neutralized_lap_count,
            "dnfCount": dnf_count,
        },
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
        ("positionChangeProxy", "Position-change proxy"),
        ("neutralizedLapCount", "Neutralized laps"),
        ("dnfCount", "DNFs"),
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


def main() -> None:
    ensure_cache()
    races = [build_race_payload(*event) for event in EVENTS]

    payload = {
        "projectTitle": "From DRS to Mario Mushrooms",
        "subtitle": "A comparison of Formula 1's first three races in 2025 and 2026",
        "generatedFrom": "FastF1",
        "races": races,
        "scorecard": build_scorecard(races),
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
