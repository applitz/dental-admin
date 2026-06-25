# AI Agent Memory — Admin Repo

1. Read **dental-api** [docs/modules/M-platform-admin.md](https://github.com/applitz/dental-api/blob/main/docs/modules/M-platform-admin.md)
2. Read [docs/ADMIN.md](docs/ADMIN.md)
3. Implement **admin UI only** unless prompt includes API changes

**Stack:** Next.js 15+, TypeScript, Tailwind, next-intl (`en`, `de`).

**Security:** Every screen requires platform gate token (secret key step). Never log PHI or secrets.

**API:** `NEXT_PUBLIC_API_URL` → `/api/v1/platform/*` (not clinic `/api/v1/patients`).

## Feature checklist

1. **Gate** — challenge page before any data route
2. **i18n** — en + de for all UI strings
3. **Audit** — destructive actions show confirm + reason field (when API supports)
