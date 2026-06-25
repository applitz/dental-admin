"use client";

import { fetchGateConfig, fetchSystemHealth, type GateConfig, type SystemHealth } from "@/lib/platform-actions";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        ok ? "bg-emerald-500" : "bg-rose-500",
      )}
    />
  );
}

export function SystemView() {
  const t = useTranslations("system");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [gate, setGate] = useState<GateConfig | null>(null);

  const reload = useCallback(() => {
    void fetchSystemHealth().then(setHealth).catch(() => setHealth(null));
    void fetchGateConfig().then(setGate).catch(() => setGate(null));
  }, []);

  useEffect(() => reload(), [reload]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>

      {!health ? (
        <p className="mt-8 text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t("status")} value={health.status} />
          <StatCard label={t("environment")} value={health.env} />
          <StatCard label={t("tenants")} value={String(health.tenant_count)} />
          <StatCard label={t("countryOverrides")} value={String(health.country_overrides)} />
          <StatCard label={t("settings")} value={String(health.settings_count)} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">{t("database")}</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <StatusDot ok={health.database_ok} />
              {health.database_ok ? t("ok") : t("down")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">{t("redis")}</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <StatusDot ok={health.redis_ok} />
              {health.redis_ok ? t("ok") : t("down")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">{t("gate")}</p>
            <p className="mt-2 text-lg font-semibold">
              {health.gate_configured ? t("configured") : t("missing")}
            </p>
            <p className="text-xs text-slate-400">{t("gateSource", { source: health.gate_source })}</p>
          </div>
        </div>
      )}

      <div className="mt-8 max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t("gateEnvTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("gateEnvHint")}</p>
        {gate && (
          <p className="mt-3 text-xs text-slate-400">
            {t("currentSource", { source: gate.source })}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
