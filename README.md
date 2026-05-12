# BotC Scripts Backup

An archive of custom [Blood on the Clocktower](https://bloodontheclocktower.com/) scripts scraped from [botcscripts.com](https://botcscripts.com), with a searchable static site as a community backup.

**Live site:** https://scripts.ottawaplaysbotc.com/

The archive contains 9,400+ scripts and updates automatically every night.

## Setup

Requires Python 3.11+ and [`uv`](https://github.com/astral-sh/uv).

```bash
uv sync
```

## Usage

```bash
# Download only new scripts (the full backlog is already archived — don't re-scrape everything)
make run

# Force re-download everything (avoid unless necessary)
uv run python scraper.py --force

# Rebuild the manifest index from existing script files
uv run python scraper.py --rebuild-manifest

# Build the static site
make site

# Serve the site locally at http://localhost:1313
make serve
```

## How It Works

1. `scraper.py` paginates through the botcscripts.com API and saves each script as `scripts/{pk}_v{version}.json`, plus a `scripts/manifest.json` index with metadata and character lists.
2. `make site` copies those files into the Hugo static directory and builds the site to `public/`.
3. A GitHub Actions cron job runs the scraper nightly and commits any new scripts to the repo.
4. Pushes to `main` trigger a deploy to GitHub Pages.
