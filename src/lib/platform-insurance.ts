import { API_URL, apiFetch } from "./api";
import { getAccessToken, getGateToken } from "./auth";

export type InsurerAdmin = {
  id: string;
  code: string;
  name: string;
  country: string;
  is_active: boolean;
  traeger_vstrl: string | null;
  traeger_bundesland: string | null;
  /** No single national carrier code — VSTRL is a regional office resolved per
   *  patient from their province (e.g. Austria's ÖGK Landesstellen 11–19). */
  vstrl_per_province: boolean;
};
export type DvpSettings = { repro: string | null; versi: string | null; versd: string; test_mode: boolean };
export type ShareRule = { share_category: "prosthetics" | "ortho"; kind: "percent" | "fixed"; value: string };
export type TariffEdition = { id: string; country: string; contract: "ZAE" | "KFO"; valid_from: string; label: string; is_active: boolean };
export type TariffPositionAdmin = {
  id: string; code: string; block: "KR" | "ZE" | "RG"; title_de: string; amount: string;
  unit_type: string; share_category: "none" | "prosthetics" | "ortho";
  age_min: number | null; age_max: number | null; requires_tooth: boolean; requires_surface: boolean; is_active: boolean;
};

export function listInsurers(country?: string): Promise<InsurerAdmin[]> {
  const q = country ? `?country=${encodeURIComponent(country)}` : "";
  return apiFetch(`/api/v1/platform/insurance/insurers${q}`);
}
export function createInsurer(body: {
  code: string;
  name: string;
  country?: string;
  is_active?: boolean;
  traeger_vstrl?: string | null;
  traeger_bundesland?: string | null;
  vstrl_per_province?: boolean;
}): Promise<InsurerAdmin> {
  return apiFetch("/api/v1/platform/insurance/insurers", { method: "POST", body: JSON.stringify(body) });
}
export function updateInsurer(
  id: string,
  body: {
    name?: string;
    is_active?: boolean;
    traeger_vstrl?: string | null;
    traeger_bundesland?: string | null;
    vstrl_per_province?: boolean;
  },
): Promise<InsurerAdmin> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function deleteInsurer(id: string): Promise<void> {
  // 204 No Content — apiFetch returns {} for an empty body, which resolves the void promise fine.
  return apiFetch(`/api/v1/platform/insurance/insurers/${id}`, { method: "DELETE" });
}
export function getDvpSettings(): Promise<DvpSettings> {
  return apiFetch("/api/v1/platform/insurance/dvp-settings");
}
export function updateDvpSettings(body: Partial<DvpSettings>): Promise<DvpSettings> {
  return apiFetch("/api/v1/platform/insurance/dvp-settings", { method: "PUT", body: JSON.stringify(body) });
}
export function getShareRules(insurerId: string): Promise<ShareRule[]> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/share-rules`);
}
export function setShareRules(insurerId: string, rows: ShareRule[]): Promise<ShareRule[]> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/share-rules`, {
    method: "PUT", body: JSON.stringify({ rows }),
  });
}
export function listEditions(country?: string): Promise<TariffEdition[]> {
  const q = country ? `?country=${encodeURIComponent(country)}` : "";
  return apiFetch(`/api/v1/platform/insurance/editions${q}`);
}
export function listPositions(editionId: string): Promise<TariffPositionAdmin[]> {
  return apiFetch(`/api/v1/platform/insurance/editions/${editionId}/positions`);
}
export type InsurerServiceAdmin = {
  id: string;
  insurer_id: string;
  name: string;
  shortcut: string;
  dvp_code: string;
  contract: string;
  block: string;
  category: string;
  price: string;
  patient_share_kind: string;
  patient_share_value: string;
  unit_type: string;
  requires_tooth: boolean;
  requires_surface: boolean;
  age_min: number | null;
  age_max: number | null;
  frequency: string | null;
  gender: string | null;
  prior_approval: boolean;
  notes: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

export function listInsurerServices(insurerId: string): Promise<InsurerServiceAdmin[]> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/services`);
}

// Bulk CSV import. apiFetch skips the JSON Content-Type when the body is a
// FormData, so the browser sets the correct multipart boundary itself. A 422
// surfaces as an ApiError whose body.params.errors holds the row messages.
export function importInsurerServices(insurerId: string, file: File): Promise<{ imported: number }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/services/import`, {
    method: "POST",
    body: fd,
  });
}

// The template is text/csv, so apiFetch (which JSON-parses) can't be used.
// Raw authenticated fetch mirroring apiFetch's auth headers, then trigger a
// browser download. Country-level (not per-insurer): the same sheet is used to
// upload any company's services.
export async function downloadCountryTemplate(country: string): Promise<void> {
  const headers = new Headers();
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const gate = getGateToken();
  if (gate) headers.set("X-Platform-Gate", gate);

  const res = await fetch(
    `${API_URL}/api/v1/platform/insurance/services/template?country=${encodeURIComponent(country)}`,
    { headers },
  );
  if (!res.ok) throw new Error("template_download_failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "insurer-services-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SeedReferenceResult = { editions: number; positions: number; insurers: number; rules: number };
export function seedReference(): Promise<SeedReferenceResult> {
  return apiFetch("/api/v1/platform/insurance/seed-reference", { method: "POST" });
}
