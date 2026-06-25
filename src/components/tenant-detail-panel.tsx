"use client";

import { patchTenant, type TenantDetail } from "@/lib/api";
import {
  fetchFeatureCatalog,
  impersonateTenant,
  listTenantUsers,
  patchTenantFeatures,
  runTenantAction,
  searchTenantPatients,
  type FeatureCatalogItem,
  type TenantPatient,
  type TenantUser,
} from "@/lib/platform-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Tab = "overview" | "users" | "patients" | "features" | "actions";

type Props = {
  detail: TenantDetail;
  onUpdated: (detail: TenantDetail) => void;
};

export function TenantDetailPanel({ detail, onUpdated }: Props) {
  const t = useTranslations("tenants");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [patients, setPatients] = useState<TenantPatient[]>([]);
  const [patientTotal, setPatientTotal] = useState(0);
  const [patientQ, setPatientQ] = useState("");
  const [catalog, setCatalog] = useState<FeatureCatalogItem[]>([]);
  const [featureDraft, setFeatureDraft] = useState(detail.features);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setFeatureDraft(detail.features);
  }, [detail]);

  useEffect(() => {
    if (tab === "users") {
      void listTenantUsers(detail.id).then((r) => setUsers(r.items)).catch(() => setUsers([]));
    }
    if (tab === "patients") {
      void searchTenantPatients(detail.id, patientQ)
        .then((r) => {
          setPatients(r.items);
          setPatientTotal(r.total);
        })
        .catch(() => {
          setPatients([]);
          setPatientTotal(0);
        });
    }
    if (tab === "features" && catalog.length === 0) {
      void fetchFeatureCatalog().then((r) => setCatalog(r.items)).catch(() => setCatalog([]));
    }
  }, [tab, detail.id, patientQ, catalog.length]);

  async function setActive(is_active: boolean) {
    if (!window.confirm(is_active ? t("confirmReactivate") : t("confirmSuspend"))) return;
    setBusy(true);
    try {
      onUpdated(await patchTenant(detail.id, { is_active }));
    } catch {
      window.alert(t("statusError"));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "reseed" | "reprovision_comms") {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await runTenantAction(detail.id, action);
      setActionMsg(t(action === "reseed" ? "actionReseedDone" : "actionCommsDone"));
      void res;
    } catch {
      setActionMsg(t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  async function openAsTenant() {
    if (!window.confirm(t("confirmImpersonate"))) return;
    setBusy(true);
    try {
      const res = await impersonateTenant(detail.id);
      const base = process.env.NEXT_PUBLIC_CLINIC_APP_URL ?? "http://localhost:3000";
      const hash = new URLSearchParams({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        locale,
        redirect: `/${locale}/app`,
      }).toString();
      window.open(`${base.replace(/\/$/, "")}/auth/callback#${hash}`, "_blank", "noopener");
    } catch {
      window.alert(t("impersonateError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveFeatures() {
    setBusy(true);
    try {
      onUpdated(await patchTenantFeatures(detail.id, featureDraft));
      setActionMsg(t("featuresSaved"));
    } catch {
      setActionMsg(t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  const tabs: Tab[] = ["overview", "users", "patients", "features", "actions"];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{detail.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              detail.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
            )}
          >
            {detail.is_active ? t("active") : t("suspended")}
          </span>
          {detail.is_active ? (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void setActive(false)}>
              {t("suspend")}
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => void setActive(true)}>
              {t("reactivate")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === id ? "bg-admin-100 text-admin-800" : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {t(`tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label={t("detailMarket")} value={detail.market_iso2 ?? "—"} />
          <InfoCard label={t("detailUsers")} value={String(detail.user_count)} />
          <InfoCard label={t("detailPlan")} value={detail.plan_slug ?? "—"} />
          <InfoCard
            label={t("detailOnboarding")}
            value={detail.onboarding_step == null ? t("onboardingComplete") : `Step ${detail.onboarding_step}`}
          />
        </div>
      )}

      {tab === "users" && (
        <table className="mt-6 w-full rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">{t("colName")}</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  {u.first_name} {u.last_name}
                  {u.is_clinic_owner && (
                    <span className="ml-2 text-xs text-admin-600">{t("owner")}</span>
                  )}
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.user_type}</td>
                <td className="px-4 py-2">{u.is_active ? t("active") : t("suspended")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "patients" && (
        <div className="mt-6">
          <input
            value={patientQ}
            onChange={(e) => setPatientQ(e.target.value)}
            placeholder={t("patientSearch")}
            className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mb-2 text-xs text-slate-400">{t("patientLimit", { total: patientTotal })}</p>
          <table className="w-full rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">{t("colName")}</th>
                <th className="px-4 py-2 text-left">DOB</th>
                <th className="px-4 py-2 text-left">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.patient_number}</td>
                  <td className="px-4 py-2">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-2">{p.date_of_birth ?? "—"}</td>
                  <td className="px-4 py-2">{p.email ?? p.mobile ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "features" && (
        <div className="mt-6 space-y-3">
          {(catalog.length ? catalog : featureDraft.map((f) => ({ feature_key: f.feature_key, label: f.feature_key }))).map(
            (item) => {
              const feat = featureDraft.find((f) => f.feature_key === item.feature_key) ?? {
                feature_key: item.feature_key,
                enabled: false,
                rollout_percent: 100,
              };
              return (
                <label
                  key={item.feature_key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{item.feature_key}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={feat.enabled}
                    onChange={() => {
                      const next = featureDraft.filter((f) => f.feature_key !== item.feature_key);
                      next.push({ ...feat, enabled: !feat.enabled });
                      setFeatureDraft(next);
                    }}
                  />
                </label>
              );
            },
          )}
          <Button onClick={() => void saveFeatures()} disabled={busy}>
            {t("saveFeatures")}
          </Button>
        </div>
      )}

      {tab === "actions" && (
        <div className="mt-6 flex flex-col gap-3 max-w-md">
          <Button variant="secondary" disabled={busy} onClick={() => void runAction("reseed")}>
            {t("actionReseed")}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void runAction("reprovision_comms")}>
            {t("actionComms")}
          </Button>
          <Button disabled={busy || !detail.is_active} onClick={() => void openAsTenant()}>
            {t("actionImpersonate")}
          </Button>
          {actionMsg && <p className="text-sm text-slate-600">{actionMsg}</p>}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
