.PHONY: run site serve

run:
	uv run python scraper.py

site:
	cp scripts/manifest.json site/data/manifest.json
	cp scripts/*.json site/static/scripts/
	hugo --source site --destination ../public

serve:
	cp scripts/manifest.json site/data/manifest.json
	hugo server --source site --bind 0.0.0.0
