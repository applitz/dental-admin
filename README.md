# dental-admin — Platform Admin Console

Vodett **platform operations** UI — tenants, countries, feature flags, runtime settings.

| URL | Purpose |
|-----|---------|
| `https://admin.vodett.ai` | Production |
| `http://localhost:3002` | Local dev |

## Docs

- [ADMIN.md](./docs/ADMIN.md) — UI architecture
- [dental-api M-Platform](https://github.com/applitz/dental-api/blob/main/docs/modules/M-platform-admin.md) — API & rollout plan

## Auth

1. Login at **app.vodett.ai/login** with platform admin credentials
2. Redirect here → **secret key** challenge (`/challenge`)
3. API gate token required for all `/api/v1/platform/*` calls

## Dev

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

## Deploy

Coolify + GitHub → `admin.vodett.ai`. See `Dockerfile` and dental-api `docs/DEPLOY-VPS.md`.

## Related repos

| Repo | Role |
|------|------|
| `dental-api` | Backend + platform routes |
| `dental-web` | Clinic app + shared login |
| `dental-patient` | Patient portal (planned) |
