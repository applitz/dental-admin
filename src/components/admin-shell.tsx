"use client";

import { Button } from "@/components/ui/button";
import { listTenants, type TenantSummary } from "@/lib/api";
import { clearSession, hasGateAccess } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Activity, Flag, Globe, LayoutDashboard, Shield, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type AdminView = "dashboard" | "tenants" | "countries" | "features" | "settings" | "audit" | "system";

const NAV: { id: AdminView; href: string }[] = [
  { id: "dashboard", href: "" },
  { id: "tenants", href: "/tenants" },
  { id: "countries", href: "/countries" },
  { id: "features", href: "/features" },
  { id: "settings", href: "/settings" },
  { id: "audit", href: "/audit" },
  { id: "system", href: "/system" },
];

export function AdminShell({ initialView }: { initialView: AdminView }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  useEffect(() => setView(initialView), [initialView]);

  useEffect(() => {
    if (view === "dashboard" || view === "tenants") {
      void listTenants()
        .then((r) => setTenants(r.items))
        .catch(() => setTenants([]));
    }
  }, [view]);

  const base = `/${locale}`;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-admin-900 text-white">
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
            onClick={() => {
              clearSession();
              router.replace(`${base}/challenge`);
            }}
          >
            {t("common.signOut")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {view === "dashboard" && <DashboardView count={tenants.length} />}
        {view === "tenants" && <TenantsView tenants={tenants} />}
        {view === "countries" && <CountriesView />}
        {!["dashboard", "tenants", "countries"].includes(view) && (
          <Placeholder title={t(`nav.${view}`)} phase="2–4" />
        )}
      </main>
    </div>
  );
}

function DashboardView({ count }: { count: number }) {
  const t = useTranslations("dashboard");
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label={t("tenants")} value={String(count)} />
        <Stat icon={Flag} label={t("countries")} value="—" />
        <Stat icon={Activity} label={t("apiStatus")} value="OK" />
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

function TenantsView({ tenants }: { tenants: TenantSummary[] }) {
  const t = useTranslations("tenants");
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
              <th className="px-4 py-3 text-left">{t("colPlan")}</th>
              <th className="px-4 py-3 text-left">{t("colPractices")}</th>
              <th className="px-4 py-3 text-left">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
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

function CountriesView() {
  const t = useTranslations("countries");
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-8 text-sm text-slate-500">{t("wizardHint")}</p>
    </div>
  );
}

function Placeholder({ title, phase }: { title: string; phase: string }) {
  const t = useTranslations("common");
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-8 text-sm text-slate-500">{t("comingSoon", { phase })}</p>
    </div>
  );
}
