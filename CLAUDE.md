# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev      # hot-reload dev server (uses --hot)
bun run start    # production server
bun run check    # TypeScript type-check (no emit)
```

No test runner is configured. Verification is manual — see the checklist in `AGENTS.md`.

## Architecture

Single-file server in `src/server.ts` using `Bun.serve()` with a static route map. No framework.

**HTML bundling**: `src/index.html` is imported directly (`import index from "./index.html"`). Bun bundles it at startup, pulling in `src/main.ts` (client-side fetch for the waitlist form) and `src/styles.css`.

**Admin UI**: Rendered as inline HTML strings inside `src/server.ts` (`renderAdminPage`, `renderAdminLogin`). There are no template files.

**Auth**: Cookie-based, in-memory `Set<string>` of session tokens. Sessions are lost on restart. Credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars — the server throws on startup if either is missing.

**Database**: `bun:sqlite` writing to `data/interest.sqlite` (local) or `/app/data/interest.sqlite` (container). Do not change this path without updating the Coolify volume mount and `README.md`.

## Required env vars

```
ADMIN_USERNAME=
ADMIN_PASSWORD=
PORT=3000          # optional, defaults to 3000
```

## Deployment

Docker via root `Dockerfile`, hosted on Coolify (Linux VPS). Container port `3000`. Persistent volume must be mounted to `/app/data` to survive deploys.

## Constraints

- Keep it dependency-light. Prefer Bun-native APIs.
- Do not introduce a framework unless explicitly asked.
- Do not change the SQLite path without also updating the Coolify volume config and `README.md`.
- `data/interest.sqlite` may contain live waitlist data — never commit it.
