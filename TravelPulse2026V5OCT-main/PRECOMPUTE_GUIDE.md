# Dashboard Precompute Guide

Use this when dashboard loading becomes slow because the browser is calculating too much data.

## What This Does

The dashboard now uses a precompute step:

1. Read the normalized survey record chunks from `data/records-*.json`.
2. Calculate dashboard summaries before the page loads.
3. Save fast JSON files in `data/precomputed/`.
4. Let `app-final.js` render charts from those ready summaries.

This reduces repeated browser calculation for Source Market, Destination Market, Travel Behaviour, Airline, and Hotels.

## When To Run

Run this after you update the survey data files.

```bash
python scripts/precompute_dashboard.py
```

## Output Files

The script creates:

```text
data/precomputed/filters.json
data/precomputed/source_market.json
data/precomputed/destination_market.json
data/precomputed/travel_behaviour.json
data/precomputed/airline.json
data/precomputed/hotels.json
```

It also updates `data/manifest.json` so the dashboard knows where these files are.

## How The Dashboard Loads

On first load:

1. `bootstrap.json` loads first.
2. `filters.json` loads first.
3. The default tab summary loads first.
4. Other tab summaries load only when that tab opens.
5. Raw records still load in the background for advanced filters and detailed drilldowns.

## Beginner Steps

1. Open the project folder in VS Code.
2. Open Terminal.
3. Run:

```bash
python scripts/precompute_dashboard.py
```

4. Start your local server as usual.
5. Open `index.html` through the local server.

Do not open the file directly with `file://`, because browser fetches may fail.
