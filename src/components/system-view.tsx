"use client";

import { createVoiceAgentTemplate, recreateAllVoiceAgents, fetchGateConfig, fetchSystemHealth, type GateConfig, type SystemHealth } from "@/lib/platform-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusDot } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function SystemView() {
  const t = useTranslations("system");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [gate, setGate] = useState<GateConfig | null>(null);
  const [tmplBusy, setTmplBusy] = useState(false);
  const [tmplId, setTmplId] = useState<string | null>(null);
  const [tmplAction, setTmplAction] = useState<"created" | "updated" | null>(null);
  const [tmplErr, setTmplErr] = useState<string | null>(null);
  const [allBusy, setAllBusy] = useState(false);
  const [allResult, setAllResult] = useState<{ total: number; recreated: number; failed: number } | null>(null);
  const [allErr, setAllErr] = useState<string | null>(null);

  async function createTemplate() {
    setTmplBusy(true);
    setTmplErr(null);
    try {
      const res = await createVoiceAgentTemplate();
      setTmplId(res.assistant_id);
      setTmplAction(res.action ?? "updated");
    } catch {
      setTmplErr(t("voiceTemplateError"));
    } finally {
      setTmplBusy(false);
    }
  }

  async function recreateAll() {
    setAllBusy(true);
    setAllErr(null);
    setAllResult(null);
    try {
      const res = await recreateAllVoiceAgents();
      setAllResult(res.result);
    } catch {
      setAllErr(t("voiceRecreateAllError"));
    } finally {
      setAllBusy(false);
    }
  }

  const reload = useCallback(() => {
    void fetchSystemHealth().then(setHealth).catch(() => setHealth(null));
    void fetchGateConfig().then(setGate).catch(() => setGate(null));
  }, []);

  useEffect(() => reload(), [reload]);

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {!health ? (
        <p className="mt-8 text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t("status")} value={health.status} />
          <StatCard label={t("environment")} value={health.env} />
          <StatCard label={t("tenants")} value={String(health.tenant_count)} />
          <StatCard label={t("countryOverrides")} value={String(health.country_overrides)} />
          <StatCard label={t("settings")} value={String(health.settings_count)} />
          <Card className="p-5">
            <p className="text-xs font-medium uppercase text-slate-500">{t("database")}</p>
            <div className="mt-2">
              <StatusDot tone={health.database_ok ? "success" : "danger"}>
                {health.database_ok ? t("ok") : t("down")}
              </StatusDot>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase text-slate-500">{t("redis")}</p>
            <div className="mt-2">
              <StatusDot tone={health.redis_ok ? "success" : "danger"}>
                {health.redis_ok ? t("ok") : t("down")}
              </StatusDot>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase text-slate-500">{t("gate")}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {health.gate_configured ? t("configured") : t("missing")}
            </p>
            <p className="text-xs text-slate-400">{t("gateSource", { source: health.gate_source })}</p>
          </Card>
        </div>
      )}

      <Card className="mt-8 max-w-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("voiceTemplateTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("voiceTemplateHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" disabled={tmplBusy} onClick={() => void createTemplate()}>
            {tmplBusy ? t("voiceTemplateBusy") : t("voiceTemplateCreate")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={allBusy}
            onClick={() => void recreateAll()}
          >
            {allBusy ? t("voiceRecreateAllBusy") : t("voiceRecreateAll")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("voiceRecreateAllHint")}</p>
        {allResult && (
          <p className="mt-2 text-xs text-emerald-700">
            {t("voiceRecreateAllDone", {
              recreated: allResult.recreated,
              total: allResult.total,
              failed: allResult.failed,
            })}
          </p>
        )}
        {allErr && <p className="mt-1 text-xs text-red-600">{allErr}</p>}
        {tmplId && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800">{t("voiceTemplateDone")}</p>
            <p className="mt-1 text-xs text-emerald-700">
              {tmplAction === "created"
                ? t("voiceTemplateCreated")
                : t("voiceTemplateUpdated")}
            </p>
            <code className="mt-1 block break-all font-mono text-sm text-slate-900">{tmplId}</code>
            <p className="mt-2 text-xs text-slate-500">{t("voiceTemplateSetEnv")}</p>
          </div>
        )}
        {tmplErr && <p className="mt-3 text-sm text-red-600">{tmplErr}</p>}
      </Card>

      <Card className="mt-8 max-w-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("gateEnvTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("gateEnvHint")}</p>
        {gate && (
          <p className="mt-3 text-xs text-slate-400">
            {t("currentSource", { source: gate.source })}
          </p>
        )}
      </Card>
    </div>
  );
}
