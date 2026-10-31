# T&C Space Hub

An independent, responsive space dashboard for GitHub Pages, featuring an Apple-inspired interface with Light, Dark and System appearance modes.

## Included
- Apple-inspired interface with adaptive Light / Dark / System themes (choice saved in the browser).
- ISS and selected satellite tracking on a Leaflet map.
- Browser-side orbit propagation using satellite.js and CelesTrak OMM/JSON orbital elements.
- Search for satellites by name; optional Starlink sample loader.
- 3D Earth globe with selected satellite marker using globe.gl; globe imagery adapts to the selected theme.
- Voyager 1 and 2 mission section with official NASA position/mission links.
- NASA DONKI solar flares, coronal mass ejections and geomagnetic storm events.
- NASA Astronomy Picture of the Day (current WordPress API).
- NASA NeoWs near-Earth asteroid close-approach feed.
- Responsive mobile layout and data-source transparency.

## Deploy to GitHub Pages
1. Download and unzip this folder.
2. Open your independent GitHub repository (for example, `tc-space-hub`).
3. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root, replacing the previous versions.
4. In **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
5. Open the published Pages URL. HTTPS is required for public APIs and map tiles.

## Appearance settings
Use the appearance selector in the top-right corner:
- **System** follows the device/browser appearance.
- **Light** uses a bright, clean interface.
- **Dark** uses a dark interface.

The selected preference is saved locally in the browser. The satellite map and 3D Earth imagery also switch to matching light/dark styles.

## NASA API key
The project uses `DEMO_KEY` so it can run without setup for light testing. For a personal site, get a free key at https://api.nasa.gov/ and replace `NASA_API_KEY` near the top of `app.js`. Never put a paid/private key in a public GitHub repository. NASA API rate limits apply; caching is enabled in the browser.

## Data sources and refresh behaviour
- **CelesTrak GP API:** public OMM/JSON orbital elements. No key required. The app caches each catalogue query for 2 hours. The displayed satellite position is calculated locally from the element set; it is not continuous satellite telemetry.
- **NASA DONKI:** recent solar flare, CME and geomagnetic-storm records. Cached for 20 minutes.
- **NASA NeoWs:** near-Earth-object close approaches for the next 7 days. Cached for 30 minutes.
- **NASA APOD:** current NASA Science WordPress APOD endpoint. Cached for 6 hours.
- **Voyager:** the NASA Voyager page is linked as the authoritative source for current position. There is no public consumer command API and this page does not transmit to Voyager or claim to receive its live engineering telemetry.
- **3D globe and map:** public CDN libraries and CARTO/OpenStreetMap map tiles. Internet connection required.

## Important accuracy notes
- Satellite positions are propagated estimates from public orbital elements. They are not suitable for navigation, conjunction assessment, collision avoidance, or safety-critical use.
- CelesTrak asks users to fetch GP data only as needed and not more often than every 2 hours. Do not remove the cache or poll the service more frequently.
- NASA `DEMO_KEY` has strict rate limits. If feeds fail during testing, add your own free NASA key and retry later.
- Public APIs/CDNs can change, impose rate limits, or be temporarily unavailable. The UI displays fallback messages rather than fabricating live data.
- Voyager distance and position are intentionally linked to NASA's official tracker instead of inventing a value from a static number.

## Technology
HTML · CSS · JavaScript · Leaflet · satellite.js · globe.gl · NASA APIs · CelesTrak

## Attribution
Independent fan/educational project. Not affiliated with NASA, JPL, CelesTrak, or any government space agency. Follow each data provider's terms and usage policies.
