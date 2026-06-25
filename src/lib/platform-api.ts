import {
  apiFetch,
  type PlatformMarketDetail,
  type PlatformMarketSummary,
  type PlatformSettingItem,
} from "./api";

export type { PlatformMarketDetail, PlatformMarketSummary, PlatformSettingItem };

export async function listSettings(): Promise<{ items: PlatformSettingItem[]; groups: string[] }> {
  return apiFetch("/api/v1/platform/settings");
}

export async function patchSettings(values: Record<string, unknown>): Promise<{ items: PlatformSettingItem[]; groups: string[] }> {
  return apiFetch("/api/v1/platform/settings", {
    method: "PATCH",
    body: JSON.stringify({ values }),
  });
}

export async function listMarkets(): Promise<{
  items: PlatformMarketSummary[];
  total: number;
  feature_catalog: string[];
}> {
  return apiFetch("/api/v1/platform/markets");
}

export async function getMarket(iso2: string): Promise<PlatformMarketDetail> {
  return apiFetch(`/api/v1/platform/markets/${iso2}`);
}

export async function createMarket(body: Record<string, unknown>): Promise<PlatformMarketDetail> {
  return apiFetch("/api/v1/platform/markets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMarket(iso2: string, body: Record<string, unknown>): Promise<PlatformMarketDetail> {
  return apiFetch(`/api/v1/platform/markets/${iso2}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchPlatformHealth(): Promise<{
  settings_count: number;
  markets_count: number;
  active_markets: number;
}> {
  return apiFetch("/api/v1/platform/health");
}
