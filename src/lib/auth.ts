const ACCESS = "dental_access";
const REFRESH = "dental_refresh";
const GATE = "platform.gate_token";

/** Match dental-web auth storage (same origin at app.vodett.ai). */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/dental_refresh=([^;]+)/);
  return match?.[1] ?? null;
}

export function getGateToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(GATE);
}

export function setTokens(access: string, refresh: string) {
  sessionStorage.setItem(ACCESS, access);
  document.cookie = `dental_refresh=${refresh}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`;
}

export function setGateToken(token: string) {
  sessionStorage.setItem(GATE, token);
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(GATE);
  document.cookie = "dental_refresh=; path=/; max-age=0";
}

export function hasPlatformSession(): boolean {
  return Boolean(getAccessToken());
}

export function hasGateAccess(): boolean {
  return Boolean(getGateToken());
}

export function clinicLoginUrl(locale = "en"): string {
  const base = process.env.NEXT_PUBLIC_CLINIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${locale}/login`;
}
