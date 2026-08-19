import { apiFetch } from "./api";

export type InsurerAdmin = {
  id: string;
  code: string;
  name: string;
  country: string;
  is_active: boolean;
  traeger_vstrl: string | null;
  traeger_bundesland: string | null;
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
  },
): Promise<InsurerAdmin> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
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
export type SeedReferenceResult = { editions: number; positions: number; insurers: number; rules: number };
export function seedReference(): Promise<SeedReferenceResult> {
  return apiFetch("/api/v1/platform/insurance/seed-reference", { method: "POST" });
}
