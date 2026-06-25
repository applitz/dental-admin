# Platform Admin UI

[API module](https://github.com/applitz/dental-api/blob/main/docs/modules/M-platform-admin.md)

**Production URL:** `https://admin.vodett.ai` (no path prefix)

## Routes

| Path | Purpose |
|------|---------|
| `/auth/callback` | Receives login tokens from `app.vodett.ai` |
| `/[locale]/challenge` | Platform secret key |
| `/[locale]` | Dashboard |
| `/[locale]/tenants` | Tenant list |
| `/[locale]/markets` | Market rollout |
| `/[locale]/settings` | Runtime config |
| `/[locale]/audit` | Platform audit log |

## Env

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.vodett.ai` |
| `NEXT_PUBLIC_CLINIC_APP_URL` | `https://app.vodett.ai` |

## Cross-app login

`dental-web` sets `NEXT_PUBLIC_ADMIN_APP_URL=https://admin.vodett.ai` so platform admins are sent here after login.
