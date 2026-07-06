# Common Mistakes

**⚠️ CRITICAL - Read at session start**

---

## Top 5 Critical Mistakes

### 1. Using clinic API routes instead of platform routes

**Symptom:** 403/404 on tenant or settings calls; data from wrong scope.  
**Check:** Paths must be `/api/v1/platform/*` — never `/api/v1/patients`, `/api/v1/comms`, practice RBAC routes.  
**Fix:** Add or extend functions in `src/lib/api.ts` / `src/lib/platform-api.ts`; read `dental-api/docs/modules/M-platform-admin.md`.

### 2. Missing platform gate token on API calls

**Symptom:** `platform.forbidden` or 401 on otherwise valid session.  
**Check:** `apiFetch` must send `X-Platform-Gate` from `sessionStorage` key `platform.gate_token` (set on `/challenge`).  
**Fix:** Use `apiFetch` from `src/lib/api.ts`; only use `skipGate: true` for `verify-gate` and `gate-status`.

### 3. Building clinic/staff features in dental-admin

**Symptom:** Patients, calendar, billing, or practice RBAC UI added here.  
**Check:** This repo is **Vodett platform ops** — tenants, markets, feature flags, runtime settings, audit.  
**Fix:** Staff clinic UI → `../dental-web`. Business logic → `../dental-api`.

### 4. Broken local login / callback loop

**Symptom:** Redirect to login forever; callback has no tokens.  
**Check:** `dental-web` has `NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3002`; admin has `NEXT_PUBLIC_CLINIC_APP_URL=http://localhost:3000`.  
**Fix:** Login via web app; callback reads hash `#access_token` at `/[locale]/auth/callback`.

### 5. User-facing strings without i18n (en + de)

**Symptom:** Hardcoded English in components; missing keys in `messages/de.json`.  
**Check:** Use `useTranslations()`; keys in `messages/en.json` and `messages/de.json`.  
**Fix:** Add both locales for every new label, error, and button.

---

## Other pitfalls

| Mistake | Fix |
|---------|-----|
| Business rules in React components | API is source of truth; admin only displays and submits |
| Logging tokens, gate secret, or tenant PHI | Never log secrets or patient data |
| `basePath` on Next.js config | App is served at subdomain root (`admin.vodett.ai`) |
| New nav section without route guard | Copy pattern in `src/app/[locale]/[section]/page.tsx` — session + gate checks |
| Destructive action without confirm | Use confirm UI; audit reason when API supports it |

---

**Last Updated**: 2026-06-29
