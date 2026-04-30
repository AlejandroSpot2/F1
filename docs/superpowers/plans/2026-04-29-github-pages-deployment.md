# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the static F1 project site to GitHub Pages at `https://alejandrospot2.github.io/F1/`.

**Architecture:** The project is a static site with `index.html` at the repository root and relative links to `css/`, `js/`, `assets/`, `docs/`, and `visualizations/`. GitHub Pages can serve the repository root directly from the `main` branch without a build step.

**Tech Stack:** Git, GitHub CLI, GitHub Pages static hosting, HTML/CSS/JavaScript/D3.

---

### Task 1: Publish Repository

**Files:**
- Modify: local git metadata only
- Test: `index.html` served by GitHub Pages

- [ ] **Step 1: Confirm clean publish state**

Run: `git status --short --branch`
Expected: files are either tracked or ready for the initial commit; no unrelated user changes should be reverted.

- [ ] **Step 2: Create initial commit**

Run:

```bash
git add .
git commit -m "Publish static F1 site"
```

Expected: one commit containing the static site and deployment notes.

- [ ] **Step 3: Rename default branch to main**

Run: `git branch -M main`
Expected: local branch is `main`.

- [ ] **Step 4: Create GitHub repository**

Run: `gh repo create alejandrospot2/F1 --public --source . --remote origin --push`
Expected: GitHub repository exists and `origin` points to it.

### Task 2: Enable GitHub Pages

**Files:**
- Modify: GitHub repository Pages settings only
- Test: `https://alejandrospot2.github.io/F1/`

- [ ] **Step 1: Configure Pages source**

Run: `gh api repos/alejandrospot2/F1/pages -X POST -f source.branch=main -f source.path=/`
Expected: Pages source is `main` branch root. If Pages already exists, update it with `gh api repos/alejandrospot2/F1/pages -X PUT -f source.branch=main -f source.path=/`.

- [ ] **Step 2: Verify Pages status**

Run: `gh api repos/alejandrospot2/F1/pages --jq .html_url`
Expected: output is `https://alejandrospot2.github.io/F1/`.

- [ ] **Step 3: Verify the live page**

Open `https://alejandrospot2.github.io/F1/` after GitHub finishes building.
Expected: the F1 landing page loads, styles apply from `css/site.css`, and D3 charts render from `js/alpha-release-data.js`.
