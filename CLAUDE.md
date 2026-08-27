# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"티켓북" — a static, login-gated web app with two sub-features reached from a hub screen: **예매 일정** (register a ticketing-open date, get a push reminder before it, and once you've bought tickets, log the actual viewing details and sync them to Google Calendar) and **직관 도장깨기** (track which seat/section you watched a musical, baseball, or basketball game from, across different venues, with visit history — photo, review, date — per seat). Records are stored in Supabase.

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

`main.jsx` renders `AuthGate.jsx`, not `App.jsx` directly. `AuthGate` owns the Supabase auth session (Google sign-in via `auth.js`); logged out → `LoginScreen`, logged in → `<window.Home key={session.user.id}/>`. Keying `Home` on the user id forces a full remount (and therefore a fresh `loadAllEntries()`/`loadAllSchedules()`) whenever the signed-in account changes.

`Home.jsx` owns a `screen` state ("hub" | "schedule" | "seats") and is the app's only navigation — there's no router, just conditional rendering. It always shows the top bar (email + 로그아웃) and, below it: `HubScreen.jsx` (the "티켓북" hub — profile-style hero + a stack of pill buttons; only "예매 일정" and "직관 도장깨기" are wired up, everything else is a disabled "준비중" placeholder), or `ScheduleView.jsx`, or `<window.App/>` (the original venue/map/modal flow: selected `category` → filtered `venues` → selected `venueId` → `venue`, rendering `CategorySelector` → `VenueSelector` → `WedgeMap`/`BlockMap` → `SeatModal` on section click, with a `showFilter` by exact `title` match). `App.jsx` itself has no knowledge of the hub — it's unchanged from before the hub existed.

### Auth / 예매 일정 / 웹 푸시

- **Auth**: `src/lib/auth.js` wraps `signInWithOAuth({provider:'google', scopes:'.../calendar.events'})` — the Calendar scope is requested up front at login, not separately. `storage.js` exposes `window.getSupabaseClient` so every lib module shares one client instance instead of each calling `createClient()`. Every table (`seat_entries`, `schedules`, `schedule_reminders`, `push_subscriptions`) has `user_id uuid default auth.uid()` + RLS scoped to `auth.uid()`, so client code never has to pass `user_id` explicitly.
- **예매 일정 (schedules) is two-phase**, matching the real-world flow: (1) register a `schedules` row with just `title` + `ticketing_at` (ticketing-open time) + reminder minutes via `ScheduleModal.jsx`/`window.addSchedule` — no Google Calendar call happens here. (2) once tickets are actually secured, `ViewingInfoModal.jsx`/`window.addViewingInfo` fills in `viewing_at`/`venue_name`/`seat_info`/`vendor` on that *same* row and only *then* creates the Google Calendar event (summary = title, start = `viewing_at`, description = venue/seat/vendor) — editing later deletes and recreates the calendar event rather than patching it. `src/lib/schedules.js` follows the same cache-then-read pattern as `storage.js`, but the cache is intentionally *not* preserved across logins — it's simply re-populated on `Home`'s remount. `schedule_reminders.user_id`/`fire_at` are computed by a Postgres `BEFORE INSERT` trigger from `schedules.ticketing_at` (see `supabase/setup.sql`), not trusted from the client — reminders are always relative to the ticketing-open time, never the viewing time.
- **Google Calendar sync** (`src/lib/googleCalendar.js`): calls the Calendar REST API directly from the browser using `session.provider_token`. That token is short-lived (~1h) and Supabase doesn't auto-refresh it — calendar sync is best-effort (the viewing info still saves even if the calendar call fails) and there's deliberately no server-side token-refresh infrastructure for this.
- **Web push** (`src/lib/push.js`, `sw.js`, `manifest.json`): PWA push, not a native app. `window.registerPushNotifications()` must run from a user click (permission prompts need a gesture). The actual "fire N minutes before ticketing opens" scheduling is the one piece of real backend in this project: `supabase/functions/send-reminders` (Deno Edge Function) is invoked every minute by `pg_cron` (see `supabase/setup.sql` STEP 2, and `supabase/config.toml`'s `verify_jwt = false` — required since pg_cron authenticates with a custom `CRON_SECRET`, not a Supabase JWT) and sends VAPID-signed web push via `npm:web-push` to everyone's due, unsent `schedule_reminders`.
- **GitHub Pages is a project page** (`/AI-TEST/`) — every path added for this feature (manifest, `sw.js` registration, icons, OAuth `redirectTo`) must stay relative; a leading `/` resolves to the wrong path on Pages.
