# T&C Space Hub — Earth & Space Observatory (starter)

A static, GitHub Pages-compatible dashboard using public scientific data.

## Included working feeds

- NOAA SWPC planetary Kp index (JSON)
- NOAA SWPC solar regions (JSON)
- USGS earthquakes, past day (GeoJSON; source says these feeds update every minute)
- NASA EONET open natural events (API v3)
- 2D event map using Leaflet + public CARTO basemap
- 3D globe using Globe.gl with earthquake and NASA event markers
- Responsive layout and light/dark theme toggle

## Deploy to GitHub Pages

1. Download and unzip the project.
2. Open your GitHub repository.
3. Upload `index.html`, `styles.css`, `app.js`, and this README to the repository root (or replace the files in a separate test branch first).
4. Commit the changes.
5. In repository Settings → Pages, select the branch and folder used by your site.
6. Open the published Pages URL and test on mobile and desktop.

No build step or server is required. The external libraries are loaded from public CDNs.

## API notes

### NOAA SWPC
- `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
- `https://services.swpc.noaa.gov/json/solar_regions.json`
- NOAA's public JSON directory: https://services.swpc.noaa.gov/json/

### USGS
- `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
- USGS documents the summary feeds as updating every minute: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

### NASA EONET
- `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`
- API documentation: https://eonet.gsfc.nasa.gov/docs/v3

### NASA DONKI (next integration)
NASA API portal: https://api.nasa.gov/
A free NASA API key is recommended. `DEMO_KEY` is used only as a starter fallback and has stricter limits. Add a key only if needed; do not commit a private or restricted key to a public repository.

### NASA FIRMS (next integration)
Requires a free MAP_KEY: https://firms.modaps.eosdis.nasa.gov/api/map_key
Do not add a private key to public client-side code if the provider's usage terms or key restrictions require secrecy. A server-side proxy may be needed.

### NASA GIBS (next integration)
NASA GIBS provides imagery and map services: https://gibs.earthdata.nasa.gov/
Imagery layers have different availability and time delays. Add a selected layer only after verifying its date coverage and map service parameters.

### ISRO MOSDAC (next integration)
Official ISRO description: https://www.isro.gov.in/MOSDAC.html
MOSDAC provides browse products, OGC web services, satellite products and some near-real-time products. Access differs by product/user category; some programmatic data requires registration or authorization. Do not assume a single unrestricted public JSON API.

### ESA Copernicus (next integration)
https://dataspace.copernicus.eu/
Access and API registration depend on product and service.

### CelesTrak (next integration)
https://celestrak.org/
Orbital elements are model inputs. Satellite locations must be calculated using an orbit propagator (for example SGP4); they are not direct live GPS telemetry.

## Important scientific limitations

- The refresh interval in this starter is five minutes, but each provider publishes at its own cadence. A refresh does not make a source more real-time.
- Kp is a geomagnetic activity index, not a direct measurement of local weather.
- USGS earthquake reports can be revised after initial publication.
- EONET event locations may be points, polygons or approximate locations; this starter plots points and a simple representative point for polygons.
- The 3D globe is a visualization, not a high-resolution live 3D reconstruction of Earth.
- All displayed observations should be interpreted with source timestamps and provider documentation.

## Before replacing your existing live website

Test this starter in a separate GitHub repository or branch first. Keep a backup of your currently published Space Hub files.
