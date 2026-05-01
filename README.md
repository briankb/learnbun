# Learn Bun Coming Soon

Simple Bun v1.3 landing page with a waitlist form and SQLite persistence.

## Stack

- Bun `1.3.x`
- TypeScript
- `Bun.serve()` route definitions
- Bun HTML entrypoint bundling
- `bun:sqlite` for local persistence

## Run locally

```bash
bun install
bun run dev
```

The app runs on `http://localhost:3000` by default.

## Waitlist storage

Emails are stored in `data/interest.sqlite`.

Table schema:

```sql
CREATE TABLE waitlist_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Production

```bash
bun install
bun run start
```

Set `PORT` if your platform provides one.

## Coolify on a Linux VPS

Use the included `Dockerfile`.

- Build Pack: `Dockerfile`
- Port: `3000`
- Persistent volume: mount a volume to `/app/data`

That volume is what keeps the SQLite database across deploys and container restarts.
