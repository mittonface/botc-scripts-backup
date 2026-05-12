# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

A scraper and static site that archives custom Blood on the Clocktower scripts from botcscripts.com. It bulk-downloads ~9,400+ scripts via API, generates a searchable Hugo-based static site, and auto-updates daily via GitHub Actions.

Live site: https://scripts.ottawaplaysbotc.com/

## Commands

```bash
# Install dependencies
uv sync

# Run the scraper (incremental — skips existing files)
make run

# Build the static site (copies scripts to Hugo static dir, then builds)
make site

# Serve locally on 0.0.0.0:1313
make serve

# Rebuild manifest from existing script files
uv run python scraper.py --rebuild-manifest

# Force re-download all scripts
uv run python scraper.py --force --delay 0.5
```

## Architecture

**Data flow:**

1. `scraper.py` paginates through `botcscripts.com/api/scripts/` (20 results/page, ~476 pages), writing each script to `scripts/{pk}_v{version}.json` and building `scripts/manifest.json`
2. `make site` copies `scripts/` into `site/static/scripts/` (via symlink) and runs Hugo
3. `site/layouts/index.html` is a single-page app that loads `manifest.json` dynamically, then fetches individual script JSONs on demand

**Key files:**
- `scraper.py` — all scraping logic; handles pagination, retries, incremental updates, manifest generation, and character extraction
- `scripts/manifest.json` — master index with metadata + character lists; the site's primary data source
- `site/layouts/index.html` — the entire frontend (~1500 lines); search, filtering, download UI
- `.github/workflows/daily-scrape.yml` — nightly cron at 2 AM UTC; auto-commits new scripts
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on push to `main`

**Script file format** (BotC standard):
```json
[
  {"id": "_meta", "name": "Script Name", "author": "Author Name"},
  {"id": "character1"},
  ...
]
```

**Manifest entry format:**
```json
{
  "pk": 20093,
  "name": "Script Name",
  "author": "Author",
  "version": "1.0.0",
  "script_type": "Full",
  "filename": "20093_v1.0.0.json",
  "characters": ["pixie", "empath", ...]
}
```

**Incremental scraping:** The scraper skips files that already exist. If a full page of results is already downloaded, it stops early — so daily runs only download new scripts. Character extraction happens at scrape time and is stored in the manifest so the browser never needs to parse individual script files for filtering.
