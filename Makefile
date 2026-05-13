.PHONY: run site serve

run:
	uv run python scraper.py

site:
	hugo --source site --destination ../public

serve:
	hugo server --source site --bind 0.0.0.0
