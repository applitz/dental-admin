# dental-admin — Platform Admin Console

Vodett **platform operations** UI — tenants, markets, feature flags, runtime settings.

| URL | Purpose |
|-----|---------|
| `https://admin.vodett.ai` | Production |
| `http://localhost:3002` | Local dev |

## Vodett domains

| Domain | App |
|--------|-----|
| `app.vodett.ai` | Clinic (staff) |
| `patient.vodett.ai` | Patient portal |
| `admin.vodett.ai` | Platform admin (this repo) |
| `api.vodett.ai` | API |

## Auth

1. Login at **app.vodett.ai/login** with platform admin credentials
2. Redirect to **admin.vodett.ai** → secret key challenge (`/en/challenge`)
3. API gate token required for all `/api/v1/platform/*` calls

## Dev

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Set on **dental-web** `.env.local`: `NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3002`

## Coolify

| Setting | Value |
|---------|--------|
| **Domain** | `https://admin.vodett.ai` |
| **Port** | `3000` |
| `NEXT_PUBLIC_API_URL` | `https://api.vodett.ai` |
| `NEXT_PUBLIC_CLINIC_APP_URL` | `https://app.vodett.ai` |

No `basePath` — app is served at the subdomain root.

## Related repos

| Repo | Role |
|------|------|
| `dental-api` | Backend + platform routes |
| `dental-web` | Clinic app + shared login |
