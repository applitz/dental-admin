"use client";

import { FeaturesView } from "@/components/features-view";
import { MailboxInbox } from "@/components/mail/mailbox-inbox";
import { SystemView } from "@/components/system-view";
import { TenantDetailPanel } from "@/components/tenant-detail-panel";
import { MarketWizard } from "@/components/market-wizard";
import { PlanWizard } from "@/components/plan-wizard";
import { SettingsPanel } from "@/components/settings-panel";
import { Button } from "@/components/ui/button";
import { listTenants, getTenant, type TenantSummary, type TenantDetail } from "@/lib/api";
import { deleteMarket, deletePlan } from "@/lib/platform-actions";
import {
  fetchPlatformHealth,
  getMarket,
  getPlan,
  listMarkets,
  listPlans,
  listSettings,
  type Plan,
  type PlatformMarketDetail,
  type PlatformMarketSummary,
  type PlatformSettingItem,
} from "@/lib/platform-api";
import { hasGateAccess, redirectToClinicLogin } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Activity, Globe, LayoutDashboard, Shield, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type AdminView =
  | "dashboard"
  | "tenants"
  | "markets"
  | "plans"
  | "mail"
  | "features"
  | "settings"
  | "audit"
  | "system";

const NAV: { id: AdminView; href: string }[] = [
  { id: "dashboard", href: "" },
  { id: "tenants", href: "/tenants" },
  { id: "markets", href: "/markets" },
  { id: "plans", href: "/plans" },
  { id: "mail", href: "/mail" },
  { id: "features", href: "/features" },
  { id: "settings", href: "/settings" },
  { id: "audit", href: "/audit" },
  { id: "system", href: "/system" },
];

export function AdminShell({ initialView }: { initialView: AdminView }) {
  const t = useTranslations();
  const locale = useLocale();
  const [view, setView] = useState(initialView);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [health, setHealth] = useState({ settings_count: 0, markets_count: 0, active_markets: 0 });

  useEffect(() => setView(initialView), [initialView]);

  useEffect(() => {
    void fetchPlatformHealth()
      .then(setHealth)
      .catch(() => setHealth({ settings_count: 0, markets_count: 0, active_markets: 0 }));
  }, [view]);

  useEffect(() => {
    if (view === "dashboard" || view === "tenants") {
      void listTenants()
        .then((r) => setTenants(r.items))
        .catch(() => setTenants([]));
    }
  }, [view]);

  const base = `/${locale}`;

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto bg-admin-900 text-white">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-admin-100">Vodett</p>
          <p className="text-sm font-medium">{t("common.appName")}</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ id, href }) => (
            <Link
              key={id}
              href={`${base}${href}`}
              onClick={() => setView(id)}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                view === id ? "bg-white/15 text-white" : "text-admin-100 hover:bg-white/10",
              )}
            >
              {t(`nav.${id}`)}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs text-admin-100">
            <Shield className="h-3.5 w-3.5" />
            {hasGateAccess() ? t("dashboard.gateActive") : t("dashboard.gateRequired")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-admin-100 hover:bg-white/10 hover:text-white"
            onClick={() => redirectToClinicLogin(locale, { reauth: true })}
          >
            {t("common.signOut")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {view === "dashboard" && (
          <DashboardView count={tenants.length} activeMarkets={health.active_markets} settingsCount={health.settings_count} />
        )}
        {view === "tenants" && (
          <TenantsView
            tenants={tenants}
            onRefresh={() => {
              void listTenants()
                .then((r) => setTenants(r.items))
                .catch(() => setTenants([]));
            }}
          />
        )}
        {view === "markets" && <MarketsView />}
        {view === "plans" && <PlansView />}
        {view === "mail" && <MailboxInbox />}
        {view === "settings" && <SettingsView />}
        {view === "audit" && <AuditView />}
        {view === "features" && <FeaturesView />}
        {view === "system" && <SystemView />}
      </main>
    </div>
  );
}

function DashboardView({
  count,
  activeMarkets,
  settingsCount,
}: {
  count: number;
  activeMarkets: number;
  settingsCount: number;
}) {
  const t = useTranslations("dashboard");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label={t("tenants")} value={String(count)} />
        <Stat icon={Globe} label={t("markets")} value={String(activeMarkets)} />
        <Stat icon={Activity} label={t("settings")} value={String(settingsCount)} />
        <Stat icon={Shield} label={hasGateAccess() ? t("gateActive") : t("gateRequired")} value="✓" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-admin-600" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TenantsView({ tenants, onRefresh }: { tenants: TenantSummary[]; onRefresh: () => void }) {
  const t = useTranslations("tenants");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    void getTenant(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  if (selectedId) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedId(null)}>
          ← {t("backToList")}
        </Button>
        {loadingDetail || !detail ? (
          <p className="text-sm text-slate-500">{t("loadingDetail")}</p>
        ) : (
          <TenantDetailPanel
            detail={detail}
            onUpdated={(updated) => {
              setDetail(updated);
              onRefresh();
            }}
            onDeleted={() => {
              setSelectedId(null);
              onRefresh();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      {tenants.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          {t("empty")}
        </p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">{t("colName")}</th>
              <th className="px-4 py-3 text-left">{t("colMarket")}</th>
              <th className="px-4 py-3 text-left">{t("colPlan")}</th>
              <th className="px-4 py-3 text-left">{t("colPractices")}</th>
              <th className="px-4 py-3 text-left">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setSelectedId(row.id)}
              >
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.market_iso2 ?? "—"}</td>
                <td className="px-4 py-3">{row.plan_slug ?? "—"}</td>
                <td className="px-4 py-3">{row.practice_count}</td>
                <td className="px-4 py-3">{row.is_active ? t("active") : t("suspended")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AuditView() {
  const t = useTranslations("audit");

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      <p className="mt-8 max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        {t("logOnly")}
      </p>
    </div>
  );
}

function SettingsView() {
  const t = useTranslations("settings");
  const [items, setItems] = useState<PlatformSettingItem[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    void listSettings()
      .then((r) => {
        setItems(r.items);
        setGroups(r.groups);
      })
      .catch(() => {
        setItems([]);
        setGroups([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(), [reload]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      {loading ? (
        <p className="mt-8 text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="mt-6">
          <SettingsPanel items={items} groups={groups} onSaved={reload} />
        </div>
      )}
    </div>
  );
}

function channelSummary(m: PlatformMarketSummary, t: ReturnType<typeof useTranslations>): string {
  return [
    t(`channelSummary.numberStrategy.${m.number_strategy}`),
    t(`channelSummary.smsDirection.${m.sms_direction}`),
    t(`channelSummary.emailDirection.${m.email_direction}`),
    m.voice_agent_enabled ? t("channelSummary.voiceOn") : t("channelSummary.voiceOff"),
  ].join(" · ");
}

function MarketsView() {
  const t = useTranslations("markets");
  const [markets, setMarkets] = useState<PlatformMarketSummary[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<string[]>([]);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<PlatformMarketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    void listMarkets()
      .then((r) => {
        setMarkets(r.items);
        setFeatureCatalog(r.feature_catalog);
      })
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(), [reload]);

  const openEdit = async (iso2: string) => {
    try {
      const detail = await getMarket(iso2);
      setEditing(detail);
      setMode("edit");
    } catch {
      /* ignore */
    }
  };

  const removeMarket = async (iso2: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await deleteMarket(iso2);
      reload();
    } catch {
      window.alert(t("deleteError"));
    }
  };

  if (mode === "create") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{t("newTitle")}</h1>
        <div className="mt-6">
          <MarketWizard
            featureCatalog={featureCatalog}
            onCancel={() => setMode("list")}
            onDone={() => {
              setMode("list");
              reload();
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === "edit" && editing) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{t("editTitle", { name: editing.name })}</h1>
        <div className="mt-6">
          <MarketWizard
            featureCatalog={featureCatalog}
            initial={editing}
            onCancel={() => {
              setMode("list");
              setEditing(null);
            }}
            onDone={() => {
              setMode("list");
              setEditing(null);
              reload();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setMode("create")}>{t("addCountry")}</Button>
      </div>
      {loading ? (
        <p className="mt-8 text-sm text-slate-500">{t("loading")}</p>
      ) : markets.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          {t("empty")}
        </p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">{t("colCountry")}</th>
              <th className="px-4 py-3 text-left">{t("colLocales")}</th>
              <th className="px-4 py-3 text-left">{t("colSms")}</th>
              <th className="px-4 py-3 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {markets.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{m.iso2}</span>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={m.is_active ? "font-medium text-emerald-600" : "text-slate-400"}>
                      {m.is_active ? t("active") : t("inactive")}
                    </span>
                    <span className="text-slate-400">{channelSummary(m, t)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{m.locale_count}</td>
                <td className="px-4 py-3">{m.sms_count ? t("smsConfigured", { count: m.sms_count }) : t("smsDefault")}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => void openEdit(m.iso2)}>
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => void removeMarket(m.iso2)}>
                    {t("delete")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PlansView() {
  const t = useTranslations("plans");
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | undefined>(undefined);

  const reload = useCallback(() => {
    listPlans().then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const onEdit = (slug: string) => {
    getPlan(slug).then((p) => { setEditing(p); setMode("edit"); }).catch(() => {});
  };
  const onDelete = async (slug: string) => {
    if (!window.confirm(t("confirmDelete", { slug }))) return;
    try {
      await deletePlan(slug);
      reload();
    } catch {
      window.alert(t("deleteError"));
    }
  };

  if (mode === "create" || mode === "edit") {
    return (
      <PlanWizard
        initial={mode === "edit" ? editing : undefined}
        onCancel={() => setMode("list")}
        onDone={() => { setMode("list"); reload(); }}
      />
    );
  }

  const priceSummary = (p: Plan) => {
    if (p.is_free) return t("free");
    const m = p.prices.find((x) => x.interval === "month" && x.currency === "EUR");
    return m ? t("perMonth", { amount: String(m.amount) }) : (p.prices[0] ? `${p.prices[0].amount} ${p.prices[0].currency}` : "—");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <button className="rounded-lg bg-admin-600 px-4 py-2 text-sm text-white"
          onClick={() => { setEditing(undefined); setMode("create"); }}>{t("newPlan")}</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">{t("colName")}</th>
              <th className="px-4 py-2 text-left">{t("colSlug")}</th>
              <th className="px-4 py-2 text-left">{t("colPrice")}</th>
              <th className="px-4 py-2 text-left">{t("colStatus")}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-slate-500">{p.slug}</td>
                <td className="px-4 py-2">{priceSummary(p)}</td>
                <td className="px-4 py-2">
                  {p.is_active ? <span className="text-emerald-600">{t("active")}</span>
                               : <span className="text-slate-400">{t("inactive")}</span>}
                  {p.is_free && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{t("free")}</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  <button className="text-admin-600" onClick={() => onEdit(p.slug)}>{t("edit")}</button>
                  <button className="ml-3 text-rose-600" onClick={() => onDelete(p.slug)}>{t("delete")}</button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">{t("empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
