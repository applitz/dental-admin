import {
  apiFetch,
  type MarketPack,
  type PlatformMarketDetail,
  type PlatformMarketSummary,
  type PlatformSettingItem,
} from "./api";

export type { MarketPack, PlatformMarketDetail, PlatformMarketSummary, PlatformSettingItem };

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

export async function getMarketPack(iso2: string, subdivision?: string): Promise<MarketPack> {
  const qs = subdivision ? `?subdivision=${encodeURIComponent(subdivision)}` : "";
  return apiFetch(`/api/v1/platform/market-pack/${encodeURIComponent(iso2)}${qs}`);
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

export type PlanPrice = {
  id?: string;
  currency: string;
  interval: "month" | "year";
  amount: string | number;
  is_active: boolean;
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: number;
  is_free: boolean;
  is_active: boolean;
  features_json: Record<string, unknown>;
  sort_order: number;
  prices: PlanPrice[];
};

const PLANS = "/api/v1/platform/plans";

export function listPlans(): Promise<{ plans: Plan[] }> {
  return apiFetch(PLANS);
}

export function getPlan(slug: string): Promise<Plan> {
  return apiFetch(`${PLANS}/${slug}`);
}

export function createPlan(body: {
  slug: string;
  name: string;
  description?: string;
  tier?: number;
  is_free?: boolean;
  is_active?: boolean;
  features_json?: Record<string, unknown>;
  sort_order?: number;
  prices?: Omit<PlanPrice, "id">[];
}): Promise<Plan> {
  return apiFetch(PLANS, { method: "POST", body: JSON.stringify(body) });
}

export function updatePlan(
  slug: string,
  body: Partial<{
    name: string;
    description: string;
    tier: number;
    is_free: boolean;
    is_active: boolean;
    features_json: Record<string, unknown>;
    sort_order: number;
    prices: Omit<PlanPrice, "id">[];
  }>,
): Promise<Plan> {
  return apiFetch(`${PLANS}/${slug}`, { method: "PATCH", body: JSON.stringify(body) });
}
