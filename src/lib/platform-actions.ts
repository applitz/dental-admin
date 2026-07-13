import { apiFetch, type TenantDetail } from "./api";

export type SystemHealth = {
  status: string;
  env: string;
  api_version: string;
  database_ok: boolean;
  redis_ok: boolean;
  gate_configured: boolean;
  gate_source: string;
  settings_count: number;
  country_overrides: number;
  tenant_count: number;
};

export type GateConfig = {
  configured: boolean;
  source: string;
};

export type FeatureCatalogItem = {
  feature_key: string;
  label: string;
};

export type TenantUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  is_active: boolean;
  is_clinic_owner: boolean;
  created_at: string;
};

export type TenantPatient = {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  mobile: string | null;
  practice_id: string;
};

export type ImpersonateResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_email: string;
  user_name: string;
  tenant_id: string;
};

export async function fetchSystemHealth(): Promise<SystemHealth> {
  return apiFetch("/api/v1/platform/system/health");
}

export async function fetchGateConfig(): Promise<GateConfig> {
  return apiFetch("/api/v1/platform/auth/gate-config");
}

export async function fetchFeatureCatalog(): Promise<{ items: FeatureCatalogItem[] }> {
  return apiFetch("/api/v1/platform/features");
}

export async function listTenantUsers(tenantId: string): Promise<{ items: TenantUser[] }> {
  return apiFetch(`/api/v1/platform/tenants/${tenantId}/users`);
}

export async function searchTenantPatients(
  tenantId: string,
  q?: string,
): Promise<{ items: TenantPatient[]; total: number }> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return apiFetch(`/api/v1/platform/tenants/${tenantId}/patients${qs ? `?${qs}` : ""}`);
}

export async function runTenantAction(
  tenantId: string,
  action: "reseed" | "reprovision_comms",
): Promise<{ ok: boolean; result: Record<string, unknown> }> {
  return apiFetch(`/api/v1/platform/tenants/${tenantId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function impersonateTenant(tenantId: string): Promise<ImpersonateResult> {
  return apiFetch(`/api/v1/platform/tenants/${tenantId}/impersonate`, { method: "POST" });
}

export async function patchTenantFeatures(
  tenantId: string,
  features: { feature_key: string; enabled: boolean; rollout_percent: number }[],
): Promise<TenantDetail> {
  return apiFetch(`/api/v1/platform/tenants/${tenantId}/features`, {
    method: "PATCH",
    body: JSON.stringify({ features }),
  });
}

export async function deleteMarket(iso2: string): Promise<void> {
  await apiFetch(`/api/v1/platform/markets/${iso2}`, { method: "DELETE" });
}

export async function deletePlan(slug: string): Promise<void> {
  await apiFetch(`/api/v1/platform/plans/${slug}`, { method: "DELETE" });
}
