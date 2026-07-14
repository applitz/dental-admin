# Quick Start Commands

---

## Prerequisites

- Node **20–25** (`nvm use` if `.nvmrc` present)
- **dental-api** running locally (`uvicorn src.main:app --reload --port 8000`)
- **dental-web** for login redirect (port **3000**)

## Setup

```bash
cd /Users/mac/Documents/projects/dental-admin
nvm use
npm install
cp .env.example .env.local
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLINIC_APP_URL=http://localhost:3000
```

On **dental-web** `.env.local` (required for local auth callback):

```env
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3002
```

## Development

```bash
npm run dev          # http://localhost:3002
npm run lint
npm run typecheck
npm run build        # production build (webpack)
npm start            # serve build on :3002
```

## Local auth flow

1. Open `http://localhost:3002/en` → redirects to **dental-web** login
2. Log in with platform admin (`admin@vodett.ai` + API seed password)
3. Redirect to `/en/auth/callback` → tokens in sessionStorage
4. `/en/challenge` → enter **platform gate secret** (API `PLATFORM_GATE_SECRET`)
5. All `/api/v1/platform/*` calls need `Authorization` + `X-Platform-Gate`

## Production URLs

| App | URL |
|-----|-----|
| Admin (this repo) | `https://admin.vodett.ai` |
| Clinic login | `https://app.vodett.ai` |
| API | `https://api.vodett.ai` |

Port in Docker/Coolify: **3000** (container); local dev uses **3002**.

## Related repos

| Repo | Path | Role |
|------|------|------|
| dental-api | `../dental-api` | BE + `docs/modules/M-platform-admin.md` |
| dental-web | `../dental-web` | Clinic app + shared login |
| dental | `../dental/CLAUDE.md` | Multi-repo map |

**Scope:** UI only in this repo unless prompt includes API changes.

---

**Last Updated**: 2026-06-29
