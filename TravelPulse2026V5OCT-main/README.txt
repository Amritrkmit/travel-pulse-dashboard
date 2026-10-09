Travel Pulse map fix

Replace these three files in the dashboard with the files in this folder:
1. app-final.js
2. dest-sentiment-engine.js
3. world.geojson

Main fixes:
- Uses the Natural Earth 1:10m country-level GeoJSON already supplied.
- Bahrain and Singapore use real country polygons; synthetic BH/SG circles are disabled.
- Country matching prefers ISO-3 codes, with name matching only as fallback.
- Selected countries keep their actual metric/sentiment fill.
- Selection uses Escalent Purple (#530095) border/shadow.
- Removed blur/grayscale treatment from unselected countries.
- Added a neutral sphere background so unassigned/disputed map gaps do not appear as stark white holes.
- Destination sentiment map uses the same country resolution logic.

No survey calculations or sentiment formulas were changed.
