# Situation Monitor - Static OSINT Dashboard

A lightweight, dark-themed OSINT monitoring dashboard built with **pure HTML/CSS/JavaScript** and designed to deploy directly on **GitHub Pages**.

## Features

- 3-panel intelligence layout (live feed, map, details)
- Leaflet map with OpenStreetMap tiles
- Marker clustering for event layers
- Heatmap visualization of event density
- Simulated aircraft + ship tracking with dynamic updates
- Optional WebSocket ingest for:
  - `new_event`
  - `aircraft_update`
  - `ship_update`
- News ingest adapters for:
  - GDELT
  - NewsAPI (optional key)
  - Curated conflict RSS feeds (Reuters, BBC, Al Jazeera, Defense News)
  - X signal ingest through Nitter RSS search
  - Generic RSS (via rss2json)
- Search + time filtering (1h, 6h, 24h, 7d)
- Responsive mobile stack layout

## File Structure

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `news.js`
- `map.js`
- `ws.js`

## Run Locally

Because this project is static, you can run it in two ways:

1. Open `index.html` directly in your browser.
2. Or serve it via a small static server (recommended for API calls):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main` (or your chosen branch), folder `/ (root)`
4. Save and wait for Pages to publish.

No backend or build step is required.

## API Configuration

Edit `news.js`:

```js
const config = {
  newsApiKey: "YOUR_NEWSAPI_KEY",
  gdeltEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc",
  rssToJsonEndpoint: "https://api.rss2json.com/v1/api.json",
  xRssEndpoint: "https://nitter.net/search/rss",
  curatedConflictFeeds: [
    "https://www.reuters.com/world/rss",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.defensenews.com/arc/outboundfeeds/rss/"
  ]
};
```

Notes:
- If `newsApiKey` is empty, NewsAPI ingest is skipped automatically.
- GDELT endpoint is used by default.
- X ingest uses Nitter RSS search (`xRssEndpoint`) to avoid requiring X API keys.
- `curatedConflictFeeds` can be extended with trusted regional or defense feeds.
- RSS adapter expects a public feed URL.

## WebSocket Integration

Pass a WebSocket URL through the page query string:

```text
index.html?ws=wss://your-server.example/ws
```

Expected message format:

```json
{ "type": "new_event", "data": { "id": "evt-x", "title": "...", "summary": "...", "description": "...", "category": "...", "severity": "low|medium|high", "coords": [12.34, 56.78], "timestamp": 1710000000000, "sources": [{"label":"Source","url":"https://..."}] } }
```

```json
{ "type": "aircraft_update", "data": { "id": "ac-1", "callsign": "FLT1001", "lat": 35.1, "lng": 28.2, "heading": 90, "altitude": 32000, "speed": 450 } }
```

```json
{ "type": "ship_update", "data": { "id": "ship-1", "name": "MV Horizon 1", "lat": 40.1, "lng": 22.5, "course": 180, "speed": 14.2 } }
```

## Notes

- This project is fully static and GitHub Pages compatible.
- External APIs may enforce CORS/rate limits depending on your plan.
- If no WebSocket is configured, the dashboard still runs with local seeded + simulated data.
