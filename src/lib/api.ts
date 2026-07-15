import {
  getAccessToken,
  getGateToken,
  localeFromPath,
  redirectToChallenge,
  redirectToClinicLogin,
} from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ApiErrorBody = {
  code?: string;
  message_key?: string;
  params?: Record<string, string>;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message_key ?? "errors.generic");
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  const data = await res.json().catch(() => ({}));
  const detail = data.detail ?? data;
  if (typeof detail === "string") {
    return new ApiError(res.status, {
      code: res.status === 404 ? "NOT_FOUND" : "API_ERROR",
      message_key: detail,
    });
  }
  if (Array.isArray(detail)) {
    return new ApiError(res.status, {
      code: "VALIDATION_ERROR",
      message_key: "errors.validation",
    });
  }
  return new ApiError(res.status, {
    code: detail.code,
    message_key: detail.message_key,
    params: detail.params,
  });
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipGate?: boolean; skipAuthRedirect?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  if (!init.skipGate) {
    const gate = getGateToken();
    if (gate) headers.set("X-Platform-Gate", gate);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await parseError(res);
    // Session/gate expired mid-session: don't leave the panel blank — re-auth.
    // `skipAuthRedirect` lets the challenge flow surface a wrong-secret 401 itself.
    if (!init.skipAuthRedirect && typeof window !== "undefined") {
      if (res.status === 401) {
        // Access token expired/invalid → log out to the clinic login.
        redirectToClinicLogin(localeFromPath(), { reauth: true });
      } else if (res.status === 403 && err.body.code === "PLATFORM_GATE_REQUIRED") {
        // Platform gate token expired → re-enter the gate secret.
        redirectToChallenge(localeFromPath());
      }
    }
    throw err;
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchGateStatus(): Promise<{ gate_configured: boolean }> {
  return apiFetch("/api/v1/platform/auth/gate-status", { skipGate: true, skipAuthRedirect: true });
}

export async function verifyPlatformGate(secret: string): Promise<{ gate_token: string; expires_in: number }> {
  return apiFetch("/api/v1/platform/auth/verify-gate", {
    method: "POST",
    body: JSON.stringify({ secret }),
    skipGate: true,
    skipAuthRedirect: true,
  });
}

export async function patchTenant(id: string, body: { is_active: boolean }): Promise<TenantDetail> {
  return apiFetch(`/api/v1/platform/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  plan_slug: string | null;
  practice_count: number;
  market_iso2: string | null;
  created_at: string;
};

export type TenantSubscription = {
  plan_slug: string | null;
  status: string;
  interval: string | null;
  currency: string | null;
  amount: number | null;
  current_period_end: string | null;
};

export type TenantDetail = TenantSummary & {
  onboarding_step: number | null;
  user_count: number;
  practices: {
    id: string;
    name: string;
    country_code: string | null;
    locale_default: string;
    timezone: string;
    is_active: boolean;
    phone: string | null;
    comms_email: string | null;
  }[];
  features: { feature_key: string; enabled: boolean; rollout_percent: number }[];
  subscription?: TenantSubscription | null;
};

export type AuditLogItem = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  actor_user_id: string | null;
  metadata_json: string | null;
  ip_address: string | null;
  created_at: string;
};

export async function listTenants(): Promise<{ items: TenantSummary[]; total: number }> {
  return apiFetch("/api/v1/platform/tenants");
}

export async function getTenant(id: string): Promise<TenantDetail> {
  return apiFetch(`/api/v1/platform/tenants/${id}`);
}

export async function listAuditLogs(limit = 50, offset = 0): Promise<{ items: AuditLogItem[]; total: number }> {
  return apiFetch(`/api/v1/platform/audit?limit=${limit}&offset=${offset}`);
}

export type PlatformSettingItem = {
  key: string;
  group_key: string;
  label: string;
  description: string | null;
  value_type: string;
  value: unknown;
  updated_at: string | null;
};

export type PlatformMarketLocale = {
  locale: string;
  is_default: boolean;
  enabled: boolean;
};

export type PlatformMarketSms = {
  purpose: string;
  sender_type: string;
  sender_id: string;
  twilio_messaging_service_sid: string | null;
  is_default: boolean;
};

export type PlatformMarketFeature = {
  feature_key: string;
  enabled: boolean;
  rollout_percent: number;
};

export type PlatformMarketSummary = {
  id: string;
  iso2: string;
  name: string;
  default_timezone: string;
  default_currency: string;
  default_dial_code: string | null;
  is_active: boolean;
  launched_at: string | null;
  locale_count: number;
  feature_count: number;
  sms_count?: number;
};

export type PlatformMarketDetail = PlatformMarketSummary & {
  compliance_notes: string | null;
  locales: PlatformMarketLocale[];
  sms_senders: PlatformMarketSms[];
  features: PlatformMarketFeature[];
  created_at: string;
  updated_at: string;
};
