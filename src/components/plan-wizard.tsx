"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createPlan, updatePlan, getModuleCatalog,
  type Plan, type PlanPrice, type ModuleCatalogItem,
} from "@/lib/platform-api";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const INTERVALS: PlanPrice["interval"][] = ["month", "year"];

const MODULE_KEYS_FALLBACK = [
  "calendar", "patients", "clinical", "prescriptions", "documents",
  "billing", "payments", "insurance", "comms", "analytics",
];

// Kept for parseFeatures, which runs synchronously before the catalog fetch resolves.
const MODULES = MODULE_KEYS_FALLBACK;

const MANAGED_KEYS = new Set(["max_practices", "max_users", "modules", "rbac", "priority_support"]);

function parseFeatures(featuresJson: Record<string, unknown> | undefined) {
  const obj = featuresJson ?? {};

  let unlimitedPractices = false;
  let maxPractices = 1;
  if ("max_practices" in obj) {
    if (obj.max_practices === null) unlimitedPractices = true;
    else if (typeof obj.max_practices === "number") maxPractices = obj.max_practices;
  }

  let unlimitedUsers = false;
  let maxUsers = 5;
  if ("max_users" in obj) {
    if (obj.max_users === null) unlimitedUsers = true;
    else if (typeof obj.max_users === "number") maxUsers = obj.max_users;
  }

  const selectedModules = new Set<string>();
  const unknownModules: string[] = [];
  const modulesVal = obj.modules;
  if (Array.isArray(modulesVal)) {
    if (modulesVal.includes("all")) {
      MODULES.forEach((m) => selectedModules.add(m));
    } else {
      for (const m of modulesVal) {
        if (typeof m !== "string") continue;
        if (MODULES.includes(m)) selectedModules.add(m);
        else unknownModules.push(m);
      }
    }
  }

  const rbac = obj.rbac === true;
  const prioritySupport = obj.priority_support === true;

  const unknownKeys: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!MANAGED_KEYS.has(k)) unknownKeys[k] = v;
  }

  return {
    unlimitedPractices, maxPractices, unlimitedUsers, maxUsers,
    selectedModules, unknownModules, rbac, prioritySupport, unknownKeys,
  };
}

export function PlanWizard({
  initial, onDone, onCancel,
}: { initial?: Plan; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("plans");
  const isEdit = !!initial;

  const [moduleCatalog, setModuleCatalog] = useState<ModuleCatalogItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    getModuleCatalog()
      .then((items) => {
        if (!cancelled) setModuleCatalog(items);
      })
      .catch(() => {
        // Fall back to MODULE_KEYS_FALLBACK below if the catalog can't be fetched.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const moduleCatalogMap = new Map(moduleCatalog.map((m) => [m.key, m]));
  const moduleKeys = moduleCatalog.length > 0 ? moduleCatalog.map((m) => m.key) : MODULE_KEYS_FALLBACK;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tier, setTier] = useState(initial?.tier ?? 0);
  const [isFree, setIsFree] = useState(initial?.is_free ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const initialFeatures = parseFeatures(initial?.features_json);
  const [unlimitedPractices, setUnlimitedPractices] = useState(initialFeatures.unlimitedPractices);
  const [maxPractices, setMaxPractices] = useState(initialFeatures.maxPractices);
  const [unlimitedUsers, setUnlimitedUsers] = useState(initialFeatures.unlimitedUsers);
  const [maxUsers, setMaxUsers] = useState(initialFeatures.maxUsers);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(initialFeatures.selectedModules);
  const [unknownModules] = useState<string[]>(initialFeatures.unknownModules);
  const [unknownKeys] = useState<Record<string, unknown>>(initialFeatures.unknownKeys);
  const [rbac, setRbac] = useState(initialFeatures.rbac);
  const [prioritySupport, setPrioritySupport] = useState(initialFeatures.prioritySupport);

  const [prices, setPrices] = useState<PlanPrice[]>(
    initial?.prices ?? [{ currency: "EUR", interval: "month", amount: "", is_active: true }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPrice = () =>
    setPrices((p) => [...p, { currency: "EUR", interval: "month", amount: "", is_active: true }]);
  const removePrice = (i: number) => setPrices((p) => p.filter((_, idx) => idx !== i));
  const setPrice = (i: number, patch: Partial<PlanPrice>) =>
    setPrices((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const allModulesSelected = unknownModules.length === 0 && selectedModules.size === moduleKeys.length;

  const toggleModule = (m: string) =>
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  const toggleSelectAll = (checked: boolean) =>
    setSelectedModules(checked ? new Set(moduleKeys) : new Set());

  const submit = async () => {
    setBusy(true); setError(null);
    const filteredPrices = prices
      .filter((p) => p.amount !== "")
      .map((p) => ({
        currency: p.currency, interval: p.interval,
        amount: Number(p.amount), is_active: p.is_active,
      }));
    if (!isFree && filteredPrices.length === 0) {
      setBusy(false); setError(t("wizard.needPrice")); return;
    }
    const managedModules = allModulesSelected ? ["all"] : [...selectedModules, ...unknownModules];
    const featuresJson: Record<string, unknown> = {
      ...unknownKeys,
      max_practices: unlimitedPractices ? null : Math.max(1, Math.floor(Number(maxPractices) || 1)),
      max_users: unlimitedUsers ? null : Math.max(1, Math.floor(Number(maxUsers) || 1)),
      modules: managedModules,
      ...(rbac ? { rbac: true } : {}),
      ...(prioritySupport ? { priority_support: true } : {}),
    };
    const body = {
      name, description, tier, is_free: isFree, is_active: isActive,
      features_json: featuresJson,
      prices: isFree ? [] : filteredPrices,
    };
    try {
      if (isEdit) await updatePlan(initial!.slug, body);
      else await createPlan({ slug, ...body });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wizard.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">{t(isEdit ? "wizard.editTitle" : "wizard.newTitle")}</h2>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">{t("wizard.slug")}</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            value={slug} disabled={isEdit}
            onChange={(e) => setSlug(e.target.value.toLowerCase())} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">{t("wizard.name")}</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-500">{t("wizard.description")}</span>
        <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="flex items-center gap-4 text-sm">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">{t("wizard.tier")}</span>
          <input type="number" className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={tier} onChange={(e) => setTier(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          {t("wizard.freePlan")}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t("wizard.active")}
        </label>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <span className="block text-sm font-medium">{t("limits")}</span>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">{t("maxPractices")}</span>
            <input type="number" min="1" disabled={unlimitedPractices}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              value={maxPractices} onChange={(e) => setMaxPractices(Number(e.target.value))} />
            <label className="mt-1 flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={unlimitedPractices}
                onChange={(e) => setUnlimitedPractices(e.target.checked)} />
              {t("unlimited")}
            </label>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">{t("maxUsers")}</span>
            <input type="number" min="1" disabled={unlimitedUsers}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
            <label className="mt-1 flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={unlimitedUsers}
                onChange={(e) => setUnlimitedUsers(e.target.checked)} />
              {t("unlimited")}
            </label>
          </label>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("modulesTitle")}</span>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input type="checkbox" checked={allModulesSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)} />
            {t("selectAll")}
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {moduleKeys.map((m) => {
            const catalogEntry = moduleCatalogMap.get(m);
            return (
              <label key={m} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={selectedModules.has(m)}
                  onChange={() => toggleModule(m)} />
                <span>
                  <span className="block">{catalogEntry?.name ?? t(`modules.${m}`)}</span>
                  {catalogEntry?.description && (
                    <span className="block text-xs text-slate-500">{catalogEntry.description}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <span className="block text-sm font-medium">{t("addons")}</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rbac} onChange={(e) => setRbac(e.target.checked)} />
          {t("rbac")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prioritySupport}
            onChange={(e) => setPrioritySupport(e.target.checked)} />
          {t("prioritySupport")}
        </label>
      </div>

      {!isFree && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("wizard.prices")}</span>
            <button className="text-sm text-admin-600" onClick={addPrice}>{t("wizard.addPrice")}</button>
          </div>
          {prices.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={p.currency} onChange={(e) => setPrice(i, { currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={p.interval}
                onChange={(e) => setPrice(i, { interval: e.target.value as PlanPrice["interval"] })}>
                {INTERVALS.map((iv) => <option key={iv} value={iv}>{iv}</option>)}
              </select>
              <input type="number" min="0" placeholder="0.00"
                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={p.amount}
                onChange={(e) => setPrice(i, { amount: e.target.value })} />
              <button className="text-rose-600" onClick={() => removePrice(i)}>{t("wizard.remove")}</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={busy}
          className="rounded-lg bg-admin-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={submit}>{t(isEdit ? "wizard.save" : "wizard.create")}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
          {t("wizard.cancel")}
        </button>
      </div>
    </div>
  );
}
