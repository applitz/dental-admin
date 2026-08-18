"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createPlan, updatePlan, getModuleCatalog, getCapabilityCatalog,
  type Plan, type PlanPrice, type ModuleCatalogItem, type CapabilityCatalogItem,
} from "@/lib/platform-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const INTERVALS: PlanPrice["interval"][] = ["month", "year"];

// Mirror of the API module_catalog. parseFeatures runs synchronously before the
// live catalog fetch resolves, so it needs a local list to classify stored
// modules for the first render. Once the catalog loads, a reconcile effect
// re-classifies against the real keys — so a module missing here (drift) is
// self-healing and no longer silently unchecks itself in the editor.
const MODULE_KEYS_FALLBACK = [
  "calendar", "patients", "clinical", "prescriptions", "documents",
  "billing", "payments", "insurance", "comms", "analytics", "timeline",
];

// Kept for parseFeatures, which runs synchronously before the catalog fetch resolves.
const MODULES = MODULE_KEYS_FALLBACK;

const MANAGED_KEYS = new Set([
  "max_practices", "max_users", "max_patients", "modules", "capabilities", "rbac", "priority_support",
]);

function parseFeatures(featuresJson: Record<string, unknown> | undefined) {
  const obj = featuresJson ?? {};

  // max_practices removed from the editor: the product is single-practice per
  // tenant and the limit was never enforced. It stays in MANAGED_KEYS so any
  // legacy value is dropped (not preserved as an unknown key) on next save.
  let unlimitedUsers = false;
  let maxUsers = 5;
  if ("max_users" in obj) {
    if (obj.max_users === null) unlimitedUsers = true;
    else if (typeof obj.max_users === "number") maxUsers = obj.max_users;
  }

  let unlimitedPatients = false;
  let maxPatients = 100;
  if ("max_patients" in obj) {
    if (obj.max_patients === null) unlimitedPatients = true;
    else if (typeof obj.max_patients === "number") maxPatients = obj.max_patients;
  }

  const selectedCapabilities = new Set<string>();
  const capabilitiesVal = obj.capabilities;
  if (Array.isArray(capabilitiesVal)) {
    for (const c of capabilitiesVal) {
      if (typeof c === "string") selectedCapabilities.add(c);
    }
  }

  const selectedModules = new Set<string>();
  const unknownModules: string[] = [];
  const rawModules: string[] = [];
  let allModules = false;
  const modulesVal = obj.modules;
  if (Array.isArray(modulesVal)) {
    if (modulesVal.includes("all")) {
      allModules = true;
      MODULES.forEach((m) => selectedModules.add(m));
    } else {
      for (const m of modulesVal) {
        if (typeof m !== "string") continue;
        rawModules.push(m);
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
    unlimitedUsers, maxUsers, unlimitedPatients, maxPatients,
    selectedModules, unknownModules, rawModules, allModules,
    selectedCapabilities, rbac, prioritySupport, unknownKeys,
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

  const [capabilityCatalog, setCapabilityCatalog] = useState<CapabilityCatalogItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    getCapabilityCatalog()
      .then((items) => {
        if (!cancelled) setCapabilityCatalog(items);
      })
      .catch(() => {
        // No fallback list: the section simply renders empty if the catalog can't be fetched.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const portalCapabilities = capabilityCatalog.filter((c) => c.group === "portal");
  const commsCapabilities = capabilityCatalog.filter((c) => c.group === "comms");
  const aiCapabilities = capabilityCatalog.filter((c) => c.group === "ai");
  // Anything in a group we don't explicitly render below, so a new catalog
  // group can never silently disappear from the editor.
  const otherCapabilities = capabilityCatalog.filter(
    (c) => !["portal", "comms", "ai"].includes(c.group),
  );

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tier, setTier] = useState(initial?.tier ?? 0);
  const [isFree, setIsFree] = useState(initial?.is_free ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const initialFeatures = parseFeatures(initial?.features_json);
  const [unlimitedUsers, setUnlimitedUsers] = useState(initialFeatures.unlimitedUsers);
  const [maxUsers, setMaxUsers] = useState(initialFeatures.maxUsers);
  const [unlimitedPatients, setUnlimitedPatients] = useState(initialFeatures.unlimitedPatients);
  const [maxPatients, setMaxPatients] = useState(initialFeatures.maxPatients);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(initialFeatures.selectedModules);
  const [unknownModules, setUnknownModules] = useState<string[]>(initialFeatures.unknownModules);

  // Once the live module catalog loads, re-classify the plan's stored modules
  // against the real keys (not the local fallback). This self-heals fallback
  // drift: a module the fallback didn't know about (e.g. "timeline") would
  // otherwise be parked in unknownModules and render UNCHECKED even though it's
  // enabled. Runs once, before the user can interact.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (moduleCatalog.length === 0 || reconciledRef.current) return;
    reconciledRef.current = true;
    const realKeys = moduleCatalog.map((m) => m.key);
    if (initialFeatures.allModules) {
      setSelectedModules(new Set(realKeys));
      setUnknownModules([]);
      return;
    }
    const known = new Set(realKeys);
    setSelectedModules(new Set(initialFeatures.rawModules.filter((m) => known.has(m))));
    setUnknownModules(initialFeatures.rawModules.filter((m) => !known.has(m)));
    // initialFeatures is derived from the (immutable) initial prop; catalog load is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCatalog]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(
    initialFeatures.selectedCapabilities,
  );
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

  const toggleCapability = (key: string, available: boolean) => {
    if (!available) return;
    setSelectedCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderCapabilityRow = (c: CapabilityCatalogItem) => (
    <label key={c.key}
      className={`flex items-start gap-2 text-sm ${c.available ? "" : "opacity-50"}`}>
      <input type="checkbox" className="mt-0.5" disabled={!c.available}
        checked={selectedCapabilities.has(c.key)}
        onChange={() => toggleCapability(c.key, c.available)} />
      <span>
        <span className="block">
          {c.name} <span className="text-xs text-slate-500">({c.cost_label})</span>
          {!c.available && (
            <span className="ml-2 text-xs italic text-slate-400">{t("comingSoon")}</span>
          )}
        </span>
        <span className="block text-xs text-slate-500">{c.description}</span>
      </span>
    </label>
  );

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
    const availableCapabilityKeys = new Set(
      capabilityCatalog.filter((c) => c.available).map((c) => c.key),
    );
    // If the catalog hasn't loaded (or failed to load), don't filter — an empty
    // catalog would otherwise make this strip every capability from the plan.
    const managedCapabilities =
      capabilityCatalog.length > 0
        ? [...selectedCapabilities].filter((k) => availableCapabilityKeys.has(k))
        : [...selectedCapabilities];
    const featuresJson: Record<string, unknown> = {
      ...unknownKeys,
      max_users: unlimitedUsers ? null : Math.max(1, Math.floor(Number(maxUsers) || 1)),
      max_patients: unlimitedPatients ? null : Math.max(1, Math.floor(Number(maxPatients) || 1)),
      modules: managedModules,
      capabilities: managedCapabilities,
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
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wizard.slug")}>
          <Input value={slug} disabled={isEdit}
            onChange={(e) => setSlug(e.target.value.toLowerCase())} />
        </Field>
        <Field label={t("wizard.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>

      <Field label={t("wizard.description")}>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="flex items-center gap-4 text-sm">
        <Field label={t("wizard.tier")}>
          <Input type="number" className="w-24"
            value={tier} onChange={(e) => setTier(Number(e.target.value))} />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          {t("wizard.freePlan")}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t("wizard.active")}
        </label>
      </div>

      <Card className="space-y-2 p-3">
        <span className="block text-sm font-medium">{t("limits")}</span>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">{t("maxUsers")}</span>
            <Input type="number" min="1" disabled={unlimitedUsers}
              value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
            <label className="mt-1 flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={unlimitedUsers}
                onChange={(e) => setUnlimitedUsers(e.target.checked)} />
              {t("unlimited")}
            </label>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">{t("maxPatients")}</span>
            <Input type="number" min="1" disabled={unlimitedPatients}
              value={maxPatients} onChange={(e) => setMaxPatients(Number(e.target.value))} />
            <label className="mt-1 flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={unlimitedPatients}
                onChange={(e) => setUnlimitedPatients(e.target.checked)} />
              {t("unlimited")}
            </label>
          </label>
        </div>
      </Card>

      <Card className="space-y-2 p-3">
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
      </Card>

      <Card className="space-y-3 p-3">
        <div>
          <span className="block text-sm font-medium">{t("capabilitiesTitle")}</span>
          <span className="block text-xs text-slate-500">{t("capabilitiesHelper")}</span>
        </div>

        {portalCapabilities.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium uppercase text-slate-500">{t("capabilitiesPortal")}</span>
            <div className="space-y-1.5">
              {portalCapabilities.map(renderCapabilityRow)}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase text-slate-500">{t("capabilitiesComms")}</span>
          <div className="space-y-1.5">
            {commsCapabilities.map(renderCapabilityRow)}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase text-slate-500">{t("capabilitiesAi")}</span>
          <div className="space-y-1.5">
            {aiCapabilities.map(renderCapabilityRow)}
          </div>
        </div>

        {otherCapabilities.length > 0 && (
          <div className="space-y-2">
            <div className="space-y-1.5">{otherCapabilities.map(renderCapabilityRow)}</div>
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-3">
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
      </Card>

      {!isFree && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("wizard.prices")}</span>
            <Button variant="subtle" size="sm" onClick={addPrice}>{t("wizard.addPrice")}</Button>
          </div>
          {prices.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select size="sm" wrapperClassName="w-24"
                value={p.currency} onChange={(e) => setPrice(i, { currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select size="sm" wrapperClassName="w-28"
                value={p.interval}
                onChange={(e) => setPrice(i, { interval: e.target.value as PlanPrice["interval"] })}>
                {INTERVALS.map((iv) => <option key={iv} value={iv}>{iv}</option>)}
              </Select>
              <Input type="number" min="0" placeholder="0.00"
                className="w-28"
                value={p.amount}
                onChange={(e) => setPrice(i, { amount: e.target.value })} />
              <Button variant="destructive" size="sm" onClick={() => removePrice(i)}>{t("wizard.remove")}</Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button disabled={busy} onClick={submit}>{t(isEdit ? "wizard.save" : "wizard.create")}</Button>
        <Button variant="outline" onClick={onCancel}>
          {t("wizard.cancel")}
        </Button>
      </div>
    </div>
  );
}
