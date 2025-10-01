# PTO & Time‑Off Tracker — Shared (Vercel KV)

This version persists data in a shared backend so everyone sees the same PTO across devices.

## Quick Deploy (Vercel + KV)

1. **Create a new Vercel project** and import this repo.
2. In Vercel, go to **Storage → Add New → KV database** (free plan is fine).
3. Back in the project, **Settings → Environment Variables**, click **"Connect Store"** and attach your KV to the project. This automatically sets:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`
4. Deploy. Your site serves `index.html` and the API is at `/api/state`.

## How it works

- Frontend loads/saves shared state via `fetch('/api/state?org=<ORG_ID>')`.
- We also save to `localStorage` as an offline fallback and debounce network writes.
- Change the organization id in `index.html`:
  ```js
  const ORG_ID = "fishers-it";
  ```

## Endpoints

- `GET /api/state?org=<id>` → `{ org, pto }`
- `POST /api/state?org=<id>` with `{ org, pto }` body → `{ ok: true }`

## Notes

- If you need multiple independent teams, use different `ORG_ID`s (or create separate projects).
- Vercel KV has generous free limits and low latency.
- If you prefer Postgres (Supabase, Neon) or Git-based persistence, I can provide an alternative backend.
