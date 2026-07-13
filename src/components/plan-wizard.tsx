"use client";

import { useState } from "react";
import { createPlan, updatePlan, type Plan, type PlanPrice } from "@/lib/platform-api";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const INTERVALS: PlanPrice["interval"][] = ["month", "year"];

export function PlanWizard({
  initial, onDone, onCancel,
}: { initial?: Plan; onDone: () => void; onCancel: () => void }) {
  const isEdit = !!initial;
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tier, setTier] = useState(initial?.tier ?? 0);
  const [isFree, setIsFree] = useState(initial?.is_free ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [features, setFeatures] = useState(
    JSON.stringify(initial?.features_json ?? {}, null, 2),
  );
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

  const submit = async () => {
    setBusy(true); setError(null);
    let featuresJson: Record<string, unknown>;
    try { featuresJson = JSON.parse(features || "{}"); }
    catch { setBusy(false); setError("Features must be valid JSON"); return; }
    const body = {
      name, description, tier, is_free: isFree, is_active: isActive,
      features_json: featuresJson,
      prices: isFree ? [] : prices
        .filter((p) => p.amount !== "")
        .map((p) => ({
          currency: p.currency, interval: p.interval,
          amount: Number(p.amount), is_active: p.is_active,
        })),
    };
    try {
      if (isEdit) await updatePlan(initial!.slug, body);
      else await createPlan({ slug, ...body });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">{isEdit ? "Edit plan" : "New plan"}</h2>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Slug</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            value={slug} disabled={isEdit}
            onChange={(e) => setSlug(e.target.value.toLowerCase())} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Name</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-500">Description</span>
        <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="flex items-center gap-4 text-sm">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Tier</span>
          <input type="number" className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={tier} onChange={(e) => setTier(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free plan
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-500">Features (JSON)</span>
        <textarea rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          value={features} onChange={(e) => setFeatures(e.target.value)} />
      </label>

      {!isFree && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Prices</span>
            <button className="text-sm text-admin-600" onClick={addPrice}>+ Add price</button>
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
              <input type="number" placeholder="0.00"
                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={p.amount}
                onChange={(e) => setPrice(i, { amount: e.target.value })} />
              <button className="text-rose-600" onClick={() => removePrice(i)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={busy}
          className="rounded-lg bg-admin-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={submit}>{isEdit ? "Save changes" : "Create plan"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
