"use client";

import { ApiError, getTenant, patchTenant, type TenantDetail } from "@/lib/api";
import { TenantMobileNumber } from "@/components/tenant-mobile-number";
import { listPlans, type Plan } from "@/lib/platform-api";
import {
  assignTenantNumber,
  assignTenantSubscription,
  recreateVoiceAgent,
  cancelTenantSubscription,
  clearTenantNumber,
  deleteTenant,
  fetchFeatureCatalog,
  impersonateTenant,
  listTenantUsers,
  listUnassignedNumbers,
  patchTenantFeatures,
  runTenantAction,
  searchTenantPatients,
  type FeatureCatalogItem,
  type TenantPatient,
  type TenantUser,
  type UnassignedNumber,
} from "@/lib/platform-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { TableCard, Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Tab = "overview" | "users" | "patients" | "features" | "actions";

type Props = {
  detail: TenantDetail;
  onUpdated: (detail: TenantDetail) => void;
  onDeleted?: () => void;
};

export function TenantDetailPanel({ detail, onUpdated, onDeleted }: Props) {
  const t = useTranslations("tenants");
  const locale = useLocale();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [patients, setPatients] = useState<TenantPatient[]>([]);
  const [patientTotal, setPatientTotal] = useState(0);
  const [patientQ, setPatientQ] = useState("");
  const [catalog, setCatalog] = useState<FeatureCatalogItem[]>([]);
  const [featureDraft, setFeatureDraft] = useState(detail.features);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState("");
  const [numberProvider, setNumberProvider] = useState<"external" | "telnyx">("external");
  const [unassigned, setUnassigned] = useState<UnassignedNumber[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [assignSlug, setAssignSlug] = useState(detail.subscription?.plan_slug ?? "");
  const [assignUntil, setAssignUntil] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    void listPlans()
      .then((r) => setPlans(r.plans.filter((p) => !p.is_free)))
      .catch(() => setPlans([]));
  }, []);

  async function assignPlan() {
    if (!assignSlug) return;
    setAssigning(true);
    try {
      const updated = await assignTenantSubscription(detail.id, {
        plan_slug: assignSlug,
        valid_until: assignUntil || null,
      });
      onUpdated(updated);
      setActionMsg(t("subscription.assignDone"));
    } catch {
      toast.error(t("subscription.assignError"));
    } finally {
      setAssigning(false);
    }
  }

  async function loadUnassigned() {
    setUnassignedLoading(true);
    try {
      setUnassigned(await listUnassignedNumbers());
    } catch {
      setUnassigned([]);
    } finally {
      setUnassignedLoading(false);
    }
  }

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
    if (
      !(await confirm({
        title: is_active ? t("reactivate") : t("suspend"),
        message: is_active ? t("confirmReactivate") : t("confirmSuspend"),
        tone: is_active ? "default" : "destructive",
      }))
    )
      return;
    setBusy(true);
    try {
      onUpdated(await patchTenant(detail.id, { is_active }));
    } catch {
      toast.error(t("statusError"));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "reseed" | "reprovision_comms") {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await runTenantAction(detail.id, action);
      if (action === "reprovision_comms") {
        // Surface a per-practice provisioning error (e.g. a regulated market
        // that needs documents before a number can be issued) instead of a
        // false "done", and refresh so the panel shows the persisted reason.
        const practices =
          (res.result?.practices as Array<{ error?: string | null }> | undefined) ?? [];
        const firstErr = practices.find((p) => p.error)?.error;
        onUpdated(await getTenant(detail.id));
        setActionMsg(firstErr ?? t("actionCommsDone"));
      } else {
        setActionMsg(t("actionReseedDone"));
      }
    } catch {
      setActionMsg(t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  async function assignNumber(practiceId: string) {
    // Telnyx: pick from the unassigned pool (dropdown). External: type the number.
    let phone: string;
    let telephonyNumberId: string | undefined;
    if (numberProvider === "telnyx") {
      const picked = unassigned.find((n) => n.number_id === selectedNumberId);
      if (!picked) return;
      phone = picked.phone_e164;
      telephonyNumberId = picked.number_id;
    } else {
      phone = numberInput.trim();
      if (!phone) return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      await assignTenantNumber(detail.id, {
        practice_id: practiceId,
        phone_e164: phone,
        provider: numberProvider,
        telephony_number_id: telephonyNumberId,
      });
      onUpdated(await getTenant(detail.id));
      setNumberInput("");
      setSelectedNumberId("");
      void loadUnassigned();
      setActionMsg(t("comms.assignDone"));
    } catch {
      setActionMsg(t("comms.assignError"));
    } finally {
      setBusy(false);
    }
  }

  async function clearNumber(practiceId: string) {
    if (!(await confirm({ title: t("comms.unassign"), message: t("comms.clearConfirm"), tone: "destructive" }))) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await clearTenantNumber(detail.id, practiceId);
      onUpdated(await getTenant(detail.id));
      if (numberProvider === "telnyx") void loadUnassigned();
      setActionMsg(t("comms.clearDone"));
    } catch {
      setActionMsg(t("comms.assignError"));
    } finally {
      setBusy(false);
    }
  }

  async function recreateAgent() {
    if (!(await confirm({ title: t("comms.recreate"), message: t("comms.recreateConfirm"), tone: "destructive" }))) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await recreateVoiceAgent(detail.id);
      setActionMsg(t("comms.recreateDone", { status: res.result?.status ?? "off" }));
    } catch {
      setActionMsg(t("comms.recreateError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTenantAction() {
    if (deleteConfirm.trim() !== detail.name) return;
    if (!(await confirm({ title: t("delete.button"), message: t("delete.finalConfirm", { name: detail.name }), tone: "destructive" }))) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await deleteTenant(detail.id, deleteConfirm.trim());
      onDeleted?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.code === "PLATFORM_CANNOT_DELETE_PLATFORM_TENANT") {
          setActionMsg(t("delete.errorPlatform"));
        } else if (err.body.code === "PLATFORM_DELETE_CONFIRM_MISMATCH") {
          setActionMsg(t("delete.errorMismatch"));
        } else {
          const detail = err.body.params?.detail;
          setActionMsg(
            `${t("delete.error")} (${err.body.code ?? err.body.message_key ?? "error"}${detail ? ": " + detail : ""})`,
          );
        }
      } else {
        setActionMsg(t("delete.error"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function openAsTenant() {
    if (!(await confirm({ title: t("actionImpersonate"), message: t("confirmImpersonate") }))) return;
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
      toast.error(t("impersonateError"));
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

  async function cancelSubscription() {
    if (!(await confirm({ title: t("subscription.cancel"), message: t("subscription.confirmCancel"), tone: "destructive" }))) return;
    setBusy(true);
    try {
      await cancelTenantSubscription(detail.id);
      onUpdated(await getTenant(detail.id));
    } catch {
      toast.error(t("subscription.cancelError"));
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={detail.is_active ? "success" : "danger"}>
            {detail.is_active ? t("active") : t("suspended")}
          </Badge>
          {detail.is_active ? (
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void setActive(false)}>
              {t("suspend")}
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => void setActive(true)}>
              {t("reactivate")}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        className="mt-6"
        tabs={tabs.map((id) => ({ id, label: t(`tab.${id}`) }))}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "overview" && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label={t("detailMarket")} value={detail.market_iso2 ?? "—"} />
            <InfoCard label={t("detailUsers")} value={String(detail.user_count)} />
            <InfoCard label={t("detailPlan")} value={detail.plan_slug ?? "—"} />
            <InfoCard
              label={t("detailOnboarding")}
              value={detail.onboarding_step == null ? t("onboardingComplete") : `Step ${detail.onboarding_step}`}
            />
          </div>

          <Card className="mt-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">{t("subscription.title")}</h2>
              {detail.subscription && (detail.subscription.status === "active" || detail.subscription.status === "pending") && (
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => void cancelSubscription()}>
                  {t("subscription.cancel")}
                </Button>
              )}
            </div>
            {detail.subscription ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard label={t("subscription.plan")} value={detail.subscription.plan_slug ?? "—"} />
                <InfoCard
                  label={t("subscription.status")}
                  valueNode={
                    <Badge tone={subscriptionStatusTone(detail.subscription.status)}>
                      {subscriptionStatusLabel(t, detail.subscription.status)}
                    </Badge>
                  }
                />
                <InfoCard
                  label={t("subscription.interval")}
                  value={
                    detail.subscription.interval === "month"
                      ? t("subscription.intervalLabel.month")
                      : detail.subscription.interval === "year"
                        ? t("subscription.intervalLabel.year")
                        : (detail.subscription.interval ?? "—")
                  }
                />
                <InfoCard label={t("subscription.amount")} value={formatAmount(detail.subscription.amount, detail.subscription.currency, locale)} />
                <InfoCard label={t("subscription.currentPeriodEnd")} value={formatDate(detail.subscription.current_period_end, locale)} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("subscription.none")}</p>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {t("subscription.assignTitle")}
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <Field label={t("subscription.assignPlan")} className="w-56">
                  <Select value={assignSlug} onChange={(e) => setAssignSlug(e.target.value)}>
                    <option value="">{t("subscription.assignSelect")}</option>
                    {plans.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("subscription.assignUntil")} className="w-44">
                  <Input
                    type="date"
                    value={assignUntil}
                    onChange={(e) => setAssignUntil(e.target.value)}
                  />
                </Field>
                <Button
                  size="sm"
                  disabled={!assignSlug || assigning}
                  onClick={() => void assignPlan()}
                >
                  {assigning ? t("subscription.assigning") : t("subscription.assignCta")}
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t("subscription.assignHint")}</p>
            </div>
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold text-slate-700">{t("comms.title")}</h2>
            <div className="mt-4 space-y-4">
              {detail.practices.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-sm font-medium text-slate-800">{p.name}</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <InfoCard
                      label={t("comms.number")}
                      valueNode={
                        p.comms_phone ? (
                          <span className="flex items-center gap-2">
                            <span>{p.comms_phone}</span>
                            {p.comms_number_status === "pending_review" && (
                              <Badge tone="warn">{t("comms.inReview")}</Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">{t("comms.noNumber")}</span>
                        )
                      }
                    />
                    <InfoCard label={t("comms.email")} value={p.comms_email ?? "—"} />
                  </div>
                  {!p.comms_phone && p.comms_provision_error && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <span className="font-semibold">{t("comms.provisionError")}:</span>{" "}
                      {p.comms_provision_error}
                    </div>
                  )}

                  {/* Regulated-market (Austria) number setup: status, docs, resubmit. */}
                  <TenantMobileNumber tenantId={detail.id} />

                  {/* Manually assign a number (Telnyx-portal or another provider). */}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">{t("comms.assignTitle")}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {numberProvider === "telnyx" ? (
                        <Select
                          value={selectedNumberId}
                          onChange={(e) => setSelectedNumberId(e.target.value)}
                          disabled={unassignedLoading}
                          size="sm"
                          wrapperClassName="flex-1"
                        >
                          <option value="">
                            {unassignedLoading
                              ? t("comms.loadingNumbers")
                              : unassigned.length === 0
                                ? t("comms.noUnassigned")
                                : t("comms.pickNumber")}
                          </option>
                          {unassigned.map((n) => (
                            <option key={n.number_id} value={n.number_id}>
                              {n.phone_e164}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={numberInput}
                          onChange={(e) => setNumberInput(e.target.value)}
                          placeholder="+49 30 1234567"
                          className="h-9 flex-1"
                        />
                      )}
                      <Select
                        value={numberProvider}
                        onChange={(e) => {
                          const next = e.target.value as "external" | "telnyx";
                          setNumberProvider(next);
                          if (next === "telnyx") void loadUnassigned();
                        }}
                        size="sm"
                        wrapperClassName="w-36"
                      >
                        <option value="external">{t("comms.providerExternal")}</option>
                        <option value="telnyx">Telnyx</option>
                      </Select>
                      <Button
                        size="sm"
                        disabled={
                          busy ||
                          (numberProvider === "telnyx" ? !selectedNumberId : !numberInput.trim())
                        }
                        onClick={() => void assignNumber(p.id)}
                      >
                        {t("comms.assign")}
                      </Button>
                      {p.comms_phone && (
                        <Button variant="destructive" size="sm" disabled={busy} onClick={() => void clearNumber(p.id)}>
                          {t("comms.unassign")}
                        </Button>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{t("comms.assignHint")}</p>

                    {/* Recreate the AI voice agent: delete the old assistant + clone
                        a fresh one from vodett-original, re-linked to the number. */}
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500">{t("comms.recreateTitle")}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{t("comms.recreateHint")}</p>
                        </div>
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void recreateAgent()}>
                          {t("comms.recreate")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {actionMsg && <p className="text-xs text-slate-500">{actionMsg}</p>}
            </div>
          </Card>
        </>
      )}

      {tab === "users" && (
        <TableCard className="mt-6">
          <Table>
            <THead>
              <Tr>
                <Th>{t("colName")}</Th>
                <Th>Email</Th>
                <Th>Type</Th>
                <Th>{t("colStatus")}</Th>
              </Tr>
            </THead>
            <TBody>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    {u.first_name} {u.last_name}
                    {u.is_clinic_owner && (
                      <span className="ml-2 text-xs text-dental-600">{t("owner")}</span>
                    )}
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{u.user_type}</Td>
                  <Td>{u.is_active ? t("active") : t("suspended")}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableCard>
      )}

      {tab === "patients" && (
        <div className="mt-6">
          <Input
            value={patientQ}
            onChange={(e) => setPatientQ(e.target.value)}
            placeholder={t("patientSearch")}
            className="mb-4 w-full max-w-md"
          />
          <p className="mb-2 text-xs text-slate-400">{t("patientLimit", { total: patientTotal })}</p>
          <TableCard>
            <Table>
              <THead>
                <Tr>
                  <Th>#</Th>
                  <Th>{t("colName")}</Th>
                  <Th>DOB</Th>
                  <Th>Contact</Th>
                </Tr>
              </THead>
              <TBody>
                {patients.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.patient_number}</Td>
                    <Td>
                      {p.first_name} {p.last_name}
                    </Td>
                    <Td>{p.date_of_birth ?? "—"}</Td>
                    <Td>{p.email ?? p.mobile ?? "—"}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableCard>
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

          {/* Danger zone: permanent, irreversible deletion. */}
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-800">{t("delete.title")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-red-700">{t("delete.warning")}</p>
            <p className="mt-3 text-xs text-red-700">
              {t("delete.typeName")}{" "}
              <span className="font-mono font-semibold">{detail.name}</span>
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={detail.name}
              className="mt-1.5 border-red-300 focus-visible:ring-red-600"
            />
            <Button
              variant="destructive"
              disabled={busy || deleteConfirm.trim() !== detail.name}
              onClick={() => void deleteTenantAction()}
              className="mt-3 w-full"
            >
              {t("delete.button")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{valueNode ?? value}</p>
    </div>
  );
}

const SUBSCRIPTION_STATUSES = ["pending", "active", "past_due", "canceled", "expired"] as const;

function subscriptionStatusLabel(t: (key: string) => string, status: string): string {
  const known = SUBSCRIPTION_STATUSES.find((s) => s === status);
  return known ? t(`subscription.statusLabel.${known}`) : status;
}

function subscriptionStatusTone(status: string): "success" | "warn" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "pending":
    case "past_due":
      return "warn";
    case "canceled":
    case "expired":
      return "muted";
    default:
      return "muted";
  }
}

function formatAmount(amount: number | null, currency: string | null, locale: string): string {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}
