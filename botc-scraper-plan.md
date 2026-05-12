# Plan: botcscripts.com Script Scraper

## Context

The user wants a script to bulk-download all ~9,462 Blood on the Clocktower custom scripts from botcscripts.com in JSON format. The site has a Django REST API at `/api/scripts/?format=json` that returns paginated script data including the full script content — meaning we can gather everything in ~476 API page requests rather than 9,462 individual download requests. The script should support incremental re-runs (skip already-downloaded files) so it can be run regularly to pick up new scripts.

## Files to Create

- `scraper.py` — main script
- `requirements.txt` — `requests` only
- `Makefile` — `run` target

## API Details

- **Base URL**: `https://www.botcscripts.com/api/scripts/?format=json`
- **Pagination**: follow `next` URL in each response until `null`
- **Per-page fields**: `pk`, `script_id`, `name`, `version`, `script_type`, `author`, `content`
- **`content`**: already the canonical BotC JSON array (may start with `{"id": "_meta", ...}`)

## Output Structure

```
./scripts/
├── <pk>_v<version>.json    # one per script
└── manifest.json           # metadata index for all scripts
```

Each JSON file is the canonical BotC format:

```json
[
  {"id": "_meta", "name": "...", "author": "..."},
  {"id": "character1"},
  ...
]
```

`manifest.json` is an array of `{pk, script_id, name, author, version, script_type, filename}` objects for all scripts in the output directory.

## Implementation

### CLI

```
python scraper.py [--output-dir ./scripts] [--force] [--delay 0.3]
```

### Core functions

**`fetch_with_retry(url, delay)`**

- `requests.get()` with `timeout=30`
- Exponential backoff on failure: sleep `2^attempt` seconds, max 3 retries
- Sleep `delay` seconds after each successful fetch (rate limiting)

**`build_script_json(result)`**

- Pass `content` array through directly (preserves custom `_meta` fields like `bootlegger`, `logo`)
- If `content[0]["id"] != "_meta"`, prepend `{"id": "_meta", "name": ..., "author": ...}`

**`script_filename(pk, version)`**

- Returns `f"{pk}_v{version.replace('/', '_').replace(' ', '_')}.json"`

**`main()`**

1. Parse args, `os.makedirs(output_dir, exist_ok=True)`
2. Loop: `url = BASE_API_URL` → fetch → for each result:
   - If file exists and not `--force`: add to manifest, increment skipped
   - Else: `build_script_json()`, write with `json.dump(..., ensure_ascii=False, indent=2)`, add to manifest, increment saved
3. `url = data["next"]`; exit when `None`
4. Write `manifest.json`
5. Print summary: saved, skipped counts

### Key decisions

- Use `pk` (not `script_id`) in filenames — DB primary key, guaranteed unique, matches site URL pattern
- Pass `content` through without reconstruction — preserves all custom `_meta` fields
- `ensure_ascii=False` — script names contain non-ASCII characters
- Manifest built in-memory during run (covers both saved and skipped scripts)

## Verification

1. `pip install -r requirements.txt`
2. `make run` — confirm first page fetched, files appear in `./scripts/`
3. Interrupt after a few pages, re-run — confirm skipped count matches existing file count
4. `python scraper.py --force --delay 0` — confirm files are overwritten
5. Check one output file manually: should be valid JSON array starting with `_meta`
6. Check `manifest.json`: should have one entry per file in `./scripts/` (excluding itself)
