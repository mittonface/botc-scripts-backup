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

# Build the static site to ./public
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

1. `scraper.py` paginates through `botcscripts.com/api/scripts/` (20 results/page, ~476 pages), writing each script to `scripts/{pk}_v{version}.json` and rebuilding `scripts/manifest.json`.
2. `site/static/scripts` is a checked-in symlink to `../../scripts`, so Hugo serves the script files and manifest directly — no copy step at build time.
3. `make site` runs Hugo; the frontend is a single-page app that fetches `manifest.json` on load, then fetches individual script JSONs on demand when a card is opened.

**Frontend layout** (post-`presentation-layer-refactor`):

```
site/
├── assets/
│   ├── css/site.css                 # all styles
│   └── js/
│       ├── main.js                  # entry: wires modules, kicks off loadData()
│       ├── state.js                 # single `state` object + subscribe/render
│       ├── data.js                  # parallel fetch of manifest + characters
│       ├── roles.js, utils.js
│       ├── cards.js                 # card render + infinite-scroll observer
│       ├── filters.js               # search box + type buttons
│       ├── char-filter.js           # character combobox
│       ├── modal.js                 # script detail dialog + focus trap
│       └── script-tool.js           # gzip+base64 URL encoding for official tool
├── data/characters.json             # id → [name, role] — hand-maintained
└── layouts/
    ├── index.html                   # ~75-line shell
    └── partials/{controls,modal}.html
```

**Asset pipeline.** `index.html` uses Hugo's built-in `resources.Get | js.Build (esm, minify) | fingerprint` for JS and `minify | fingerprint` for CSS — no npm, no Vite. `characters.json` is materialized at build time via `resources.FromString "characters.json" (.Site.Data.characters | jsonify) | fingerprint` and its URL is passed to JS through a `data-characters-url` attribute on the entry `<script>` tag (so the fingerprint stays consistent). Don't hardcode a path to it from JS.

**State model.** One `state` object in `state.js`. Modules mutate it directly and call `render()`; subscribers (currently just `cards.js`) re-draw. No framework, no event bus — keep it that way.

**Key files outside the frontend:**
- `scraper.py` — all scraping logic; handles pagination, retries, incremental updates, manifest generation, and character extraction.
- `scripts/manifest.json` — master index with metadata + character lists; the site's primary data source. Sorted by `pk` descending so newest appears first.
- `.github/workflows/daily-scrape.yml` — nightly cron at 2 AM UTC; auto-commits new scripts.
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on push to `main` (and after a successful daily scrape).

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

**Incremental scraping.** The scraper skips files that already exist. If a full page of results is already downloaded, it stops early — so daily runs only download new scripts. Character extraction happens at scrape time and is stored in the manifest so the browser never needs to parse individual script files for filtering.

## Gotchas

- **`site/data/characters.json` is hand-maintained.** It is not produced by the scraper. When official Blood on the Clocktower adds a character, this file needs a manual entry (`"id": ["Display Name", "role"]`). Surfacing role metadata in the scraper-built manifest is an open follow-up from `REFACTOR.md`.
- **Don't reintroduce monolithic `index.html`.** The presentation layer was deliberately split per `REFACTOR.md`; new behaviour should land in a focused module under `site/assets/js/`, not back inline.
- **No npm / bundler / framework.** Hugo's `js.Build` (esbuild) is the only build dependency. If you're tempted to add one, re-read the "Non-goals" section of `REFACTOR.md` first.