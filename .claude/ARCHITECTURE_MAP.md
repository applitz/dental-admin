# Architecture Map

**Platform admin console** — Vodett internal ops (not clinic day-to-day).  
Module spec: `../dental-api/docs/modules/M-platform-admin.md` · App doc: `docs/ADMIN.md`

---

## Directory structure

```
dental-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css
│   │   └── [locale]/
│   │       ├── layout.tsx             # next-intl provider
│   │       ├── page.tsx               # Dashboard (/)
│   │       ├── challenge/page.tsx     # Platform gate secret
│   │       ├── auth/callback/page.tsx # Tokens from dental-web login
│   │       └── [section]/page.tsx     # tenants | markets | features | settings | audit | system
│   ├── components/
│   │   ├── admin-shell.tsx            # Shell + sidebar nav + view routing
│   │   ├── tenant-detail-panel.tsx
│   │   ├── market-wizard.tsx
│   │   ├── settings-panel.tsx
│   │   ├── features-view.tsx
│   │   ├── system-view.tsx
│   │   └── ui/                        # shadcn-style primitives (button, etc.)
│   ├── lib/
│   │   ├── api.ts                     # apiFetch, tenants, gate verify, ApiError
│   │   ├── platform-api.ts            # settings, markets, health
│   │   ├── platform-actions.ts        # destructive / write helpers
│   │   ├── auth.ts                    # tokens, gate, clinic login redirect
│   │   ├── gate-errors.ts             # challenge error i18n keys
│   │   └── utils.ts                   # cn()
│   ├── i18n/
│   │   ├── routing.ts                 # locales: en, de
│   │   └── request.ts
│   └── middleware.ts                  # next-intl locale matcher
├── messages/
│   ├── en.json
│   └── de.json
├── docs/
│   ├── ADMIN.md                       # Routes, env, cross-app login
│   └── INDEX.md
├── .env.example
├── AGENTS.md                          # AI agent rules for this repo
├── CLAUDE.md                          # Session start protocol
├── next.config.ts
├── tailwind.config.ts
└── Dockerfile
```

---

## Key file locations

| Concern | File(s) |
|---------|---------|
| **API client** | `src/lib/api.ts`, `src/lib/platform-api.ts` |
| **Auth + gate** | `src/lib/auth.ts`, `src/app/[locale]/challenge/page.tsx` |
| **Login callback** | `src/app/[locale]/auth/callback/page.tsx` |
| **Main UI shell** | `src/components/admin-shell.tsx` |
| **Route → view map** | `src/app/[locale]/[section]/page.tsx` (`SECTIONS` array) |
| **i18n strings** | `messages/en.json`, `messages/de.json` |
| **Env vars** | `.env.example` → `.env.local` |
| **Locale routing** | `src/i18n/routing.ts`, `src/middleware.ts` |

---

## Routes (`/[locale]/…`)

| Path | View | Purpose |
|------|------|---------|
| `/` | dashboard | Platform health summary |
| `/tenants` | tenants | Tenant list + detail |
| `/markets` | markets | Market rollout wizard |
| `/features` | features | Feature catalog / flags |
| `/settings` | settings | Runtime platform settings |
| `/audit` | audit | Platform audit log |
| `/system` | system | System info |
| `/challenge` | — | Gate secret (required after login) |
| `/auth/callback` | — | OAuth-style token handoff from dental-web |

---

## Auth storage (browser)

| Key | Storage | Purpose |
|-----|---------|---------|
| `dental_access` | sessionStorage | JWT access token |
| `dental_refresh` | cookie | Refresh token |
| `platform.gate_token` | sessionStorage | `X-Platform-Gate` header |

---

## Multi-repo context

| Repo | Use |
|------|-----|
| `dental-admin` (here) | Platform admin UI |
| `dental-api` | `/api/v1/platform/*` backend |
| `dental-web` | Clinic app + login redirect source |
| `dental-patient` | Patient web portal *(planned)* |
| `dental-mobile` | Flutter app |
| `dental-website` | Marketing site |

Full map: `../dental/CLAUDE.md`

---

**Last Updated**: 2026-06-29
