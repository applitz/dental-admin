import { apiFetch } from "./api";

export type InsurerAdmin = { id: string; code: string; name: string; is_active: boolean };
export type ShareRule = { share_category: "prosthetics" | "ortho"; kind: "percent" | "fixed"; value: string };
export type TariffEdition = { id: string; country: string; contract: "ZAE" | "KFO"; valid_from: string; label: string; is_active: boolean };
export type TariffPositionAdmin = {
  id: string; code: string; block: "KR" | "ZE" | "RG"; title_de: string; amount: string;
  unit_type: string; share_category: "none" | "prosthetics" | "ortho";
  age_min: number | null; age_max: number | null; requires_tooth: boolean; requires_surface: boolean; is_active: boolean;
};

export function listInsurers(): Promise<InsurerAdmin[]> {
  return apiFetch("/api/v1/platform/insurance/insurers");
}
export function createInsurer(body: { code: string; name: string; is_active?: boolean }): Promise<InsurerAdmin> {
  return apiFetch("/api/v1/platform/insurance/insurers", { method: "POST", body: JSON.stringify(body) });
}
export function updateInsurer(id: string, body: { name?: string; is_active?: boolean }): Promise<InsurerAdmin> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function getShareRules(insurerId: string): Promise<ShareRule[]> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/share-rules`);
}
export function setShareRules(insurerId: string, rows: ShareRule[]): Promise<ShareRule[]> {
  return apiFetch(`/api/v1/platform/insurance/insurers/${insurerId}/share-rules`, {
    method: "PUT", body: JSON.stringify({ rows }),
  });
}
export function listEditions(): Promise<TariffEdition[]> {
  return apiFetch("/api/v1/platform/insurance/editions");
}
export function listPositions(editionId: string): Promise<TariffPositionAdmin[]> {
  return apiFetch(`/api/v1/platform/insurance/editions/${editionId}/positions`);
}
