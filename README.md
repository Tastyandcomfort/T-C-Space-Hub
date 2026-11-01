# T&C Space Hub — Apple-style Mission Control

A standalone, responsive space dashboard for GitHub Pages. It uses a clean Apple-inspired layout with a left navigation rail, overview metric cards, orbital map, 3D Earth, Voyager mission panels, space-weather events, astronomy and asteroid watch.

## Files
- `index.html` — dashboard structure
- `styles.css` — complete responsive light/dark design
- `app.js` — satellite calculations, map/globe, NASA feeds and theme behaviour

## Publish on GitHub Pages
1. Extract the ZIP.
2. Open your independent `tc-space-hub` repository.
3. Replace `index.html`, `styles.css`, `app.js`, and `README.md` with these files.
4. Commit the changes to the `main` branch.
5. Open **Settings → Pages** and confirm **Deploy from a branch → main → / (root)**.
6. Open the GitHub Pages URL after deployment finishes.

## Appearance
The top-right appearance control supports **System**, **Light**, and **Dark**. The selection is stored in the browser. The dashboard adapts for desktop, tablet and mobile screens.

## Map: no provider API key required
The satellite map now uses standard OpenStreetMap tiles (`tile.openstreetmap.org`) through Leaflet. It does **not** require a MapTiler, Mapbox or CARTO API key. OpenStreetMap attribution remains visible on the map as required by its tile usage policy. Dark mode applies a visual filter to the map tiles; it does not switch to a separate paid map provider.

Please use the public tile service respectfully and follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). For high-traffic production use, choose a tile provider or host your own tiles.

## Data services
- **CelesTrak:** public satellite GP/OMM orbital elements; no API key. The browser propagates an estimated position with satellite.js. Search suggestions are requested as the user types and cached briefly; orbital element records are cached for up to two hours.
- **NASA DONKI:** solar flares, CMEs and geomagnetic events. The app currently uses `DEMO_KEY`; a free personal NASA API key is recommended for regular use. Replace `NASA_API_KEY` near the top of `app.js`.
- **NASA NeoWs:** near-Earth object close approaches; uses the same NASA key setting.
- **NASA APOD:** NASA Science astronomy feature endpoint with an official APOD fallback link.
- **Voyager:** links to NASA's official mission position page. The hub does not transmit commands to Voyager or claim to receive a public continuous engineering telemetry feed.
- **3D Earth:** globe.gl and public texture assets loaded from CDNs.

## Accuracy and limitations
- Satellite positions and velocity are calculated estimates propagated from CelesTrak-published orbital elements. They are not a direct live radio telemetry feed; accuracy degrades as elements age. They are not suitable for navigation, collision avoidance or safety-critical decisions. The UI shows the selected satellite’s own data, not unrelated catalogue records.
- Space-weather data is an event feed, not an official alert service. Consult NOAA SWPC for operational alerts.
- Public APIs and CDNs can be rate-limited or temporarily unavailable. The dashboard shows fallback messages when a feed cannot be reached.
- Internet access is required. GitHub Pages must be served over HTTPS.

## Technology
HTML · CSS · JavaScript · Leaflet · OpenStreetMap · satellite.js · globe.gl · NASA APIs · CelesTrak

## App icon and T&C website links

This version includes the supplied T&C Space Hub artwork as responsive brand artwork and as installable app icons:

- `assets/space-hub-icon-192.png`
- `assets/space-hub-icon-512.png`
- `manifest.webmanifest`

The footer includes Apple-inspired link badges to:

- T&C Main Website: https://tastyandcomfort.github.io/T-C/
- T&C News Hub: https://tastyandcomfort.github.io/news/

On mobile, the navigation changes into a translucent bottom dock with safe-area spacing. On tablets and desktops, the dashboard uses a compact side rail and fluid content grids.
