# AGENTS.md

This repository contains a small Bun-powered landing page for `learnbun.com` style marketing, plus a waitlist capture flow backed by SQLite and a minimal admin panel.

## Purpose

- Public site: `/`
- Waitlist API: `/api/interest`
- Admin login and list view: `/admin`
- SQLite download: `/admin/download`

The app is intentionally simple and dependency-light. Do not introduce a framework unless explicitly requested.

## Stack

- Bun `1.3.x`
- TypeScript
- `Bun.serve()` route map in `src/server.ts`
- Bun HTML entrypoint import via `import index from "./index.html"`
- SQLite via `bun:sqlite`
- Docker deployment via the root `Dockerfile`
- Hosting target: Coolify on a Linux VPS

## Key Files

- `src/server.ts`
  - Main HTTP server
  - SQLite setup and queries
  - Admin authentication
  - Admin HTML rendering
- `src/index.html`
  - Main landing page markup
- `src/main.ts`
  - Client-side form submission for the waitlist
- `src/styles.css`
  - Styling for the public landing page
- `Dockerfile`
  - Production container for Coolify
- `README.md`
  - Human deployment notes

## Runtime Requirements

These environment variables are expected in production:

```env
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
```

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are required. `src/server.ts` is expected to fail fast if they are missing.

## Data Model

The SQLite database lives at:

- `data/interest.sqlite` locally
- `/app/data/interest.sqlite` inside the Coolify container

Current table:

```sql
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Do not change the DB path casually. Coolify persistence is configured around mounting `/app/data`.

## Coolify Assumptions

- Deployment uses the root `Dockerfile`
- Container port is `3000`
- Persistent storage must be mounted to `/app/data`
- If data disappears between deploys, check the volume mount first

If you change storage paths, startup behavior, or ports, update `README.md` as part of the same change.

## Admin Behavior

- Admin auth is cookie-based and currently in-memory
- Active sessions are stored in a process-local `Set`
- Restarting the app invalidates existing admin sessions
- `/admin/download` should only be accessible to authenticated admins

If you improve auth, preserve the current minimal UX unless asked to redesign it.

## Change Guidelines

- Keep the app simple
- Prefer Bun-native APIs over adding libraries
- Avoid adding external databases for this project unless explicitly requested
- Avoid leaking secrets into repo files, comments, examples, or docs
- Do not hardcode admin credentials
- Preserve the single-page marketing feel of the landing page

## Verification

After meaningful changes, verify as many of these as apply:

1. `bun run check`
2. Start the app with required env vars set
3. Load `/`
4. Submit a new email to `/api/interest`
5. Confirm duplicate email handling still returns a conflict
6. Log into `/admin`
7. Confirm the signup list renders
8. Confirm `/admin/download` still returns the SQLite file

## Notes For Future Agents

- This repo may contain live or semi-live waitlist data in `data/interest.sqlite` during local work. Do not commit that file.
- The admin HTML is rendered inline from `src/server.ts`, not from a template file.
- The public page should stay visually adjacent to `learnbun.com` in tone, but should not copy it exactly.
