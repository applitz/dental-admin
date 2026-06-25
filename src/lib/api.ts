import { getAccessToken, getGateToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: { message_key?: string; detail?: string },
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipGate?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  if (!init.skipGate) {
    const gate = getGateToken();
    if (gate) headers.set("X-Platform-Gate", gate);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { detail: text };
  }

  if (!res.ok) {
    throw new ApiError(
      (body.detail as string) ?? res.statusText,
      res.status,
      body as { message_key?: string; detail?: string },
    );
  }

  return body as T;
}

export async function verifyPlatformGate(secret: string): Promise<{ gate_token: string; expires_in: number }> {
  return apiFetch("/api/v1/platform/auth/verify-gate", {
    method: "POST",
    body: JSON.stringify({ secret }),
    skipGate: true,
  });
}

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  plan_slug: string | null;
  practice_count: number;
  created_at: string;
};

export async function listTenants(): Promise<{ items: TenantSummary[]; total: number }> {
  return apiFetch("/api/v1/platform/tenants");
}
