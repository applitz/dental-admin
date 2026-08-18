"use client";

import { FeaturesView } from "@/components/features-view";
import { InsuranceView } from "@/components/insurance-view";
import { MailboxInbox } from "@/components/mail/mailbox-inbox";
import { SystemView } from "@/components/system-view";
import { TenantDetailPanel } from "@/components/tenant-detail-panel";
import { MarketWizard } from "@/components/market-wizard";
import { PlanWizard } from "@/components/plan-wizard";
import { SettingsPanel } from "@/components/settings-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { TableCard, Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast";
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
import {
  Activity,
  ArrowLeft,
  Building2,
  CreditCard,
  Globe,
  Layers,
  LayoutDashboard,
  Mail,
  ScrollText,
  ServerCog,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
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
  | "system"
  | "insurance";

const NAV: { id: AdminView; href: string; icon: LucideIcon }[] = [
  { id: "dashboard", href: "", icon: LayoutDashboard },
  { id: "tenants", href: "/tenants", icon: Building2 },
  { id: "markets", href: "/markets", icon: Globe },
  { id: "plans", href: "/plans", icon: CreditCard },
  { id: "mail", href: "/mail", icon: Mail },
  { id: "features", href: "/features", icon: Layers },
  { id: "insurance", href: "/insurance", icon: ShieldCheck },
  { id: "settings", href: "/settings", icon: Settings },
  { id: "audit", href: "/audit", icon: ScrollText },
  { id: "system", href: "/system", icon: ServerCog },
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
    <div className="flex h-screen bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-dental-700 to-dental-900 text-white">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Vodett
            </p>
            <p className="text-sm font-semibold">{t("common.appName")}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ id, href, icon: Icon }) => {
            const active = view === id;
            return (
              <Link
                key={id}
                href={`${base}${href}`}
                onClick={() => setView(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/15 text-white shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
                {t(`nav.${id}`)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="mb-2 flex items-center gap-2 px-1 text-xs text-white/70">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            {hasGateAccess() ? t("dashboard.gateActive") : t("dashboard.gateRequired")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/85 hover:bg-white/10 hover:text-white"
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
        {view === "insurance" && <InsuranceView />}
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
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t("tenants")} value={String(count)} />
        <StatCard icon={Globe} label={t("markets")} value={String(activeMarkets)} />
        <StatCard icon={Activity} label={t("settings")} value={String(settingsCount)} />
        <StatCard icon={Shield} label={hasGateAccess() ? t("gateActive") : t("gateRequired")} value="✓" />
      </div>
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
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setSelectedId(null)}>
          <ArrowLeft className="h-4 w-4" /> {t("backToList")}
        </Button>
        {loadingDetail || !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
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
      <PageHeader title={t("title")} description={t("subtitle")} />
      {tenants.length === 0 ? (
        <EmptyState icon={Building2} title={t("empty")} />
      ) : (
        <TableCard>
          <Table>
            <THead>
              <Tr>
                <Th>{t("colName")}</Th>
                <Th>{t("colMarket")}</Th>
                <Th>{t("colPlan")}</Th>
                <Th>{t("colPractices")}</Th>
                <Th>{t("colStatus")}</Th>
              </Tr>
            </THead>
            <TBody>
              {tenants.map((row) => (
                <Tr
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelectedId(row.id)}
                >
                  <Td className="font-medium text-slate-900">{row.name}</Td>
                  <Td>{row.market_iso2 ?? "—"}</Td>
                  <Td>{row.plan_slug ?? "—"}</Td>
                  <Td>{row.practice_count}</Td>
                  <Td>
                    <Badge tone={row.is_active ? "success" : "muted"}>
                      {row.is_active ? t("active") : t("suspended")}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}

function AuditView() {
  const t = useTranslations("audit");

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <p className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
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
      <PageHeader title={t("title")} description={t("subtitle")} />
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <SettingsPanel items={items} groups={groups} onSaved={reload} />
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
  const confirm = useConfirm();
  const toast = useToast();
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
    if (!(await confirm({ title: t("delete"), message: t("confirmDelete"), tone: "destructive" }))) return;
    try {
      await deleteMarket(iso2);
      reload();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  if (mode === "create") {
    return (
      <div>
        <PageHeader title={t("newTitle")} onBack={() => setMode("list")} backLabel={t("title")} />
        <MarketWizard
          featureCatalog={featureCatalog}
          onCancel={() => setMode("list")}
          onDone={() => {
            setMode("list");
            reload();
          }}
        />
      </div>
    );
  }

  if (mode === "edit" && editing) {
    return (
      <div>
        <PageHeader
          title={t("editTitle", { name: editing.name })}
          onBack={() => {
            setMode("list");
            setEditing(null);
          }}
          backLabel={t("title")}
        />
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
    );
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={<Button onClick={() => setMode("create")}>{t("addCountry")}</Button>}
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : markets.length === 0 ? (
        <EmptyState icon={Globe} title={t("empty")} />
      ) : (
        <TableCard>
          <Table>
            <THead>
              <Tr>
                <Th>{t("colCountry")}</Th>
                <Th>{t("colLocales")}</Th>
                <Th>{t("colSms")}</Th>
                <Th className="text-right">{t("colActions")}</Th>
              </Tr>
            </THead>
            <TBody>
              {markets.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <span className="font-medium text-slate-900">{m.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{m.iso2}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={m.is_active ? "success" : "muted"}>
                        {m.is_active ? t("active") : t("inactive")}
                      </Badge>
                      <span className="text-slate-400">{channelSummary(m, t)}</span>
                    </div>
                  </Td>
                  <Td>{m.locale_count}</Td>
                  <Td>{m.sms_count ? t("smsConfigured", { count: m.sms_count }) : t("smsDefault")}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void openEdit(m.iso2)}>
                        {t("edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => void removeMarket(m.iso2)}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}

function PlansView() {
  const t = useTranslations("plans");
  const confirm = useConfirm();
  const toast = useToast();
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
    if (!(await confirm({ title: t("delete"), message: t("confirmDelete", { slug }), tone: "destructive" }))) return;
    try {
      await deletePlan(slug);
      reload();
    } catch {
      toast.error(t("deleteError"));
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
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Button onClick={() => { setEditing(undefined); setMode("create"); }}>
            {t("newPlan")}
          </Button>
        }
      />
      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title={t("empty")} />
      ) : (
        <TableCard>
          <Table>
            <THead>
              <Tr>
                <Th>{t("colName")}</Th>
                <Th>{t("colSlug")}</Th>
                <Th>{t("colPrice")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th className="text-right" />
              </Tr>
            </THead>
            <TBody>
              {plans.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-slate-900">{p.name}</Td>
                  <Td className="text-slate-500">{p.slug}</Td>
                  <Td>{priceSummary(p)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.is_active ? "success" : "muted"}>
                        {p.is_active ? t("active") : t("inactive")}
                      </Badge>
                      {p.is_free && <Badge tone="info">{t("free")}</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(p.slug)}>
                        {t("edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete(p.slug)}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}
