#!/usr/bin/env python3
import argparse
import json
import os
import time
from typing import Any


BASE_API_URL = "https://www.botcscripts.com/api/scripts/?format=json"
MAX_RETRIES = 3


def fetch_with_retry(url: str, delay: float) -> dict[str, Any]:
    """Fetch a JSON API page, retrying transient request failures."""
    try:
        import requests
    except ModuleNotFoundError as exc:
        raise RuntimeError("Missing dependency: install requests with `uv sync`.") from exc

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()

            if delay > 0:
                time.sleep(delay)

            if not isinstance(data, dict):
                raise ValueError(f"Expected API response object, got {type(data).__name__}")

            return data
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt == MAX_RETRIES:
                break
            time.sleep(2**attempt)

    raise RuntimeError(f"Failed to fetch {url} after {MAX_RETRIES + 1} attempts") from last_error


def build_script_json(result: dict[str, Any]) -> list[dict[str, Any]]:
    """Return canonical BotC script JSON, preserving API-provided content."""
    content = result.get("content")
    if isinstance(content, str):
        content = json.loads(content)

    if not isinstance(content, list):
        raise ValueError(f"Script {result.get('pk')} content is not a JSON array")

    script = content.copy()
    first_item = script[0] if script else None
    if not isinstance(first_item, dict) or first_item.get("id") != "_meta":
        script.insert(
            0,
            {
                "id": "_meta",
                "name": result.get("name") or "",
                "author": result.get("author") or "",
            },
        )

    return script


def script_filename(pk: Any, version: Any) -> str:
    safe_version = str(version).replace("/", "_").replace(" ", "_")
    return f"{pk}_v{safe_version}.json"


def extract_characters(content: Any) -> list[str]:
    """Extract character IDs from script content, excluding _meta."""
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return []
    if not isinstance(content, list):
        return []
    return [e["id"] for e in content if isinstance(e, dict) and e.get("id") not in (None, "_meta")]


def manifest_entry(result: dict[str, Any], filename: str) -> dict[str, Any]:
    return {
        "pk": result.get("pk"),
        "script_id": result.get("script_id"),
        "name": result.get("name"),
        "author": result.get("author"),
        "version": result.get("version"),
        "script_type": result.get("script_type"),
        "filename": filename,
        "characters": extract_characters(result.get("content")),
    }


def write_manifest(output_dir: str, manifest: list[dict[str, Any]]) -> str:
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as manifest_file:
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
        manifest_file.write("\n")
    return manifest_path


def rebuild_manifest(output_dir: str) -> None:
    """Rebuild manifest.json from existing script files, adding character lists."""
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        existing: list[dict[str, Any]] = json.load(f)

    updated = []
    missing = 0
    for entry in existing:
        script_path = os.path.join(output_dir, entry["filename"])
        if os.path.exists(script_path):
            with open(script_path, encoding="utf-8") as f:
                content = json.load(f)
            characters = extract_characters(content)
        else:
            characters = entry.get("characters", [])
            missing += 1
        updated.append({**entry, "characters": characters})

    write_manifest(output_dir, updated)
    if missing:
        print(f"Warning: {missing} script files not found; kept existing character data.")
    print(f"Rebuilt manifest with character data for {len(updated)} entries.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bulk-download Blood on the Clocktower scripts from botcscripts.com."
    )
    parser.add_argument(
        "--output-dir",
        default="./scripts",
        help="Directory to write script JSON files and manifest.json. Default: ./scripts",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing script JSON files instead of skipping them.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Seconds to sleep after each successful API request. Default: 0.5",
    )
    parser.add_argument(
        "--rebuild-manifest",
        action="store_true",
        help="Rebuild manifest.json from existing script files (adds character lists). Does not scrape.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    if args.rebuild_manifest:
        rebuild_manifest(args.output_dir)
        return

    url: str | None = BASE_API_URL
    manifest: list[dict[str, Any]] = []
    saved = 0
    skipped = 0
    page = 0
    interrupted = False

    try:
        while url:
            page += 1
            print(f"Fetching page {page}...", flush=True)
            data = fetch_with_retry(url, args.delay)
            results = data.get("results", [])
            if not isinstance(results, list):
                raise ValueError(f"Expected 'results' array from {url}")

            page_saved = 0
            page_skipped = 0
            for result in results:
                if not isinstance(result, dict):
                    raise ValueError(f"Expected script result object, got {type(result).__name__}")

                filename = script_filename(result.get("pk"), result.get("version"))
                output_path = os.path.join(args.output_dir, filename)

                if os.path.exists(output_path) and not args.force:
                    skipped += 1
                    page_skipped += 1
                else:
                    script = build_script_json(result)
                    with open(output_path, "w", encoding="utf-8") as output_file:
                        json.dump(script, output_file, ensure_ascii=False, indent=2)
                        output_file.write("\n")
                    saved += 1
                    page_saved += 1

                manifest.append(manifest_entry(result, filename))

            next_url = data.get("next")
            if next_url is not None and not isinstance(next_url, str):
                raise ValueError(f"Expected 'next' to be a URL or null from {url}")
            url = next_url
            print(
                f"Processed page {page}: saved {page_saved}, skipped {page_skipped} "
                f"({len(manifest)} manifest entries total).",
                flush=True,
            )
    except KeyboardInterrupt:
        interrupted = True
        print("\nInterrupted by user. Writing manifest for processed pages...", flush=True)

    manifest_path = write_manifest(args.output_dir, manifest)
    if interrupted:
        print(f"Stopped early after {page} pages.")
    print(f"Saved {saved} scripts, skipped {skipped} existing scripts.")
    print(f"Wrote manifest with {len(manifest)} entries to {manifest_path}.")


if __name__ == "__main__":
    main()
