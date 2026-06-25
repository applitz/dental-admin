# Platform Admin UI

[API module](https://github.com/applitz/dental-api/blob/main/docs/modules/M-platform-admin.md)

## Routes

| Path | Purpose |
|------|---------|
| `/auth/callback` | Receives login from `app.vodett.ai` |
| `/[locale]/challenge` | Platform secret key |
| `/[locale]` | Dashboard |
| `/[locale]/tenants` | Tenant list |
| `/[locale]/countries` | Country rollout |
| `/[locale]/settings` | Runtime config |
| `/[locale]/features` | Feature flags |
| `/[locale]/audit` | Platform audit log |

## Env

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.vodett.ai` |
| `NEXT_PUBLIC_CLINIC_APP_URL` | `https://app.vodett.ai` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | `.vodett.ai` (prod) |

## Phase status

| Phase | Status |
|-------|--------|
| 0 Scaffold | ✅ This repo |
| 1 Auth + gate | 🔲 API + login redirect |
| 2 Tenants read-only | 🔲 |
| 3 Country wizard | 🔲 |
| 4 Settings from env | 🔲 |
