# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"직관 도장깨기" — a static web app for tracking which seat/section you watched a musical, baseball, or basketball game from, across different venues, and reviewing your visit history (photo, review, date) per seat. Records are stored in Supabase.

## Running locally

There is no build step. `index.html` loads React 18, ReactDOM, and Babel Standalone from CDN `<script>` tags, then loads the app's own files as `<script type="text/babel" src="...">` — JSX is transpiled in the browser on every page load. There is no `package.json`, no bundler, no test suite, and no linter configured.

To run it, just serve the repo root over HTTP (opening `index.html` via `file://` will break relative fetches):

```
python -m http.server 8000
```

Then open `http://localhost:8000`. Reflect any change by reloading the page — there's no dev server/HMR.

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main`. GitHub Pages only serves from **public** repos on the free plan — if the repo is private, this workflow will not publish anything.

## Architecture

### No bundler → global `window.*` namespace

Every data file, helper, and component attaches its exports to `window` (e.g. `window.VENUES`, `window.WedgeMap`, `window.getEntries`) instead of using `import`/`export`. **Script order in `index.html` is the dependency order** — a file can only reference `window.X` if the script defining `X` was loaded earlier in the `<script>` list. When adding a new file, add its `<script>` tag in the right position (data → lib → components → `App.jsx` → `main.jsx`).

### Data layer (`src/data/`)

- **`venues.js`** — `window.CATEGORIES` (뮤지컬/야구/농구) and `window.VENUES`. Each venue has `map: { kind, sections, ... }`:
  - `kind: "block"` — theater-style seating rendered by `BlockMap.jsx`: individual seat dots laid out by row/column math (see `realBlockFloor`, `wingColumn`). Used for musical venues (블루스퀘어, 충무아트센터, LG아트센터).
  - `kind: "wedge"` — stadium-style radial seating rendered by `WedgeMap.jsx`. Sections come in two flavors:
    - **Parametric** (`startAngle`/`endAngle`/`innerRadius`/`outerRadius`/`zone`) — an idealized fan/ring shape computed by `wedgePath()`/`polarPoint()`. Used when there's no real seating-chart image (고척스카이돔), built via the `numberedRing()`/`rangeNums()` helpers.
    - **Polygon** (`points`: `[x,y][]`) — used when the venue has a real seating-chart background image (`backgroundImage`, e.g. `image/잠실야구장.svg`, 잠실 old). These coordinates were extracted directly from the image's pixels (per-tier-color connected-component analysis → convex hull → numbered by angle order from the stadium center), not hand-computed, so the clickable/colorable region hugs the actual seat block instead of an approximated wedge. If you need to add another real-image-backed venue, replicate that extraction approach rather than hand-tuning angles — hand-tuned parametric wedges do not line up with a real illustrated chart (rings aren't concentric circles, section widths aren't uniform).
  - Also color helpers: `categoryColor()`, `seatColorForCount()` (visit-count → gradient color), `WEDGE_TIER_COLORS`.
- **`shows.js`** — optional metadata (`window.SHOWS`) about specific musical runs, matched to entries by exact string equality on `title`. Empty by default; the app works fine without it since filtering/aggregation only needs `entry.title`.
- **`supabaseConfig.js`** — `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY`. Safe to commit: it's the public anon key, and access control is via Supabase Row Level Security, not key secrecy.

### Storage layer (`src/lib/storage.js`)

Supabase-backed, cache-first: `window.loadAllEntries()` fetches every row from the `seat_entries` table **once** (called by `App.jsx` on mount) into an in-memory `{ [venueId]: { [sectionId]: entry[] } }` cache. After that, `getEntries()`/`getVenueEntries()`/`isConquered()` read the cache synchronously — no network round-trip per venue/section switch. `addEntry()`/`deleteEntry()` write through to Supabase then patch the cache in place, so the UI never needs to re-fetch. If `supabaseConfig.js` isn't configured, `getClient()` returns `null` and the app degrades to read-only (writes throw).

### Component flow (`src/App.jsx` → `src/components/`)

`App.jsx` owns top-level state: selected `category` → filtered `venues` → selected `venueId` → `venue`. It renders `CategorySelector` → `VenueSelector` → (`WedgeMap` or `BlockMap` depending on `venue.map.kind`) → `SeatModal` (opened on section click, writes a new entry via `storage.js`). A `showFilter` (by exact `title` match) narrows which entries are counted/colored on the map without re-fetching.
