"use client";

import {
  createInsurer,
  getShareRules,
  listEditions,
  listInsurers,
  listPositions,
  setShareRules,
  updateInsurer,
  type InsurerAdmin,
  type ShareRule,
  type TariffEdition,
  type TariffPositionAdmin,
} from "@/lib/platform-insurance";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const SHARE_CATEGORIES: ShareRule["share_category"][] = ["prosthetics", "ortho"];

type ShareRowState = { kind: ShareRule["kind"]; value: string };

const EMPTY_RATE_ROWS: Record<ShareRule["share_category"], ShareRowState> = {
  prosthetics: { kind: "percent", value: "" },
  ortho: { kind: "percent", value: "" },
};

export function InsuranceView() {
  const t = useTranslations("insurance");
  const tc = useTranslations("common");

  // --- Insurers ---
  const [insurers, setInsurers] = useState<InsurerAdmin[]>([]);
  const [loadingInsurers, setLoadingInsurers] = useState(true);
  const [insurersError, setInsurersError] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const reloadInsurers = useCallback(() => {
    setLoadingInsurers(true);
    setInsurersError(false);
    void listInsurers()
      .then(setInsurers)
      .catch(() => setInsurersError(true))
      .finally(() => setLoadingInsurers(false));
  }, []);

  useEffect(() => reloadInsurers(), [reloadInsurers]);

  const addInsurer = async () => {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) return;
    setCreating(true);
    try {
      await createInsurer({ code, name, is_active: true });
      setNewCode("");
      setNewName("");
      reloadInsurers();
    } catch {
      window.alert(t("loadError"));
    } finally {
      setCreating(false);
    }
  };

  const saveInsurerName = async (id: string, name: string) => {
    try {
      const updated = await updateInsurer(id, { name });
      setInsurers((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      window.alert(t("loadError"));
      reloadInsurers();
    }
  };

  const toggleInsurerActive = async (id: string, is_active: boolean) => {
    try {
      const updated = await updateInsurer(id, { is_active });
      setInsurers((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      window.alert(t("loadError"));
      reloadInsurers();
    }
  };

  // --- Patient-share rates ---
  const [selectedInsurerId, setSelectedInsurerId] = useState<string | null>(null);
  const [rateRows, setRateRows] = useState(EMPTY_RATE_ROWS);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedInsurerId) {
      setRateRows(EMPTY_RATE_ROWS);
      return;
    }
    let cancelled = false;
    setLoadingRates(true);
    setRatesError(false);
    setSaved(false);
    void getShareRules(selectedInsurerId)
      .then((rules) => {
        if (cancelled) return;
        const next = { ...EMPTY_RATE_ROWS };
        for (const rule of rules) {
          next[rule.share_category] = { kind: rule.kind, value: rule.value };
        }
        setRateRows(next);
      })
      .catch(() => {
        if (!cancelled) setRatesError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedInsurerId]);

  const saveRates = async () => {
    if (!selectedInsurerId) return;
    setSaving(true);
    setSaved(false);
    try {
      const rows: ShareRule[] = SHARE_CATEGORIES.filter((cat) => rateRows[cat].value.trim() !== "").map((cat) => ({
        share_category: cat,
        kind: rateRows[cat].kind,
        value: rateRows[cat].value.trim(),
      }));
      await setShareRules(selectedInsurerId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      window.alert(t("loadError"));
    } finally {
      setSaving(false);
    }
  };

  // --- Tariff catalog (read-only) ---
  const [editions, setEditions] = useState<TariffEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(true);
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const [positions, setPositions] = useState<TariffPositionAdmin[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  useEffect(() => {
    void listEditions()
      .then((rows) => {
        setEditions(rows);
        if (rows.length > 0) setSelectedEditionId(rows[0].id);
      })
      .catch(() => setEditions([]))
      .finally(() => setLoadingEditions(false));
  }, []);

  useEffect(() => {
    if (!selectedEditionId) {
      setPositions([]);
      return;
    }
    let cancelled = false;
    setLoadingPositions(true);
    void listPositions(selectedEditionId)
      .then((rows) => {
        if (!cancelled) setPositions(rows);
      })
      .catch(() => {
        if (!cancelled) setPositions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPositions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEditionId]);

  const selectedInsurer = insurers.find((i) => i.id === selectedInsurerId) ?? null;
  const hasAnyRate = rateRows.prosthetics.value.trim() !== "" || rateRows.ortho.value.trim() !== "";

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {/* 1. Insurers */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("insurers")}</h2>
        {loadingInsurers ? (
          <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
        ) : insurersError ? (
          <p className="mt-4 text-sm text-rose-600">{t("loadError")}</p>
        ) : (
          <table className="mt-4 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">{t("code")}</th>
                <th className="px-4 py-3 text-left">{t("name")}</th>
                <th className="px-4 py-3 text-left">{t("active")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insurers.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedInsurerId(row.id)}
                  className={cn(
                    "cursor-pointer",
                    selectedInsurerId === row.id ? "bg-admin-50" : "hover:bg-slate-50",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{row.code}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      key={`${row.id}-${row.name}`}
                      defaultValue={row.name}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== row.name) void saveInsurerName(row.id, value);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 text-sm hover:border-slate-300 focus:border-admin-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => void toggleInsurerActive(row.id, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3">
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={t("code")}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("name")}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={creating || !newCode.trim() || !newName.trim()}
                    onClick={() => void addInsurer()}
                    className="rounded-lg bg-admin-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    {t("addInsurer")}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {/* 2. Patient-share rates */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("shareRates")}</h2>
        {!selectedInsurer ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            —
          </p>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              {selectedInsurer.name} <span className="text-xs text-slate-400">{selectedInsurer.code}</span>
            </p>
            {loadingRates ? (
              <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
            ) : ratesError ? (
              <p className="mt-4 text-sm text-rose-600">{t("loadError")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {!hasAnyRate && <p className="text-sm text-amber-600">{t("noRates")}</p>}
                {SHARE_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm text-slate-600">
                      {cat === "prosthetics" ? t("catProsthetics") : t("catOrtho")}
                    </span>
                    <select
                      value={rateRows[cat].kind}
                      onChange={(e) =>
                        setRateRows((prev) => ({
                          ...prev,
                          [cat]: { ...prev[cat], kind: e.target.value as ShareRule["kind"] },
                        }))
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="percent">{t("percent")}</option>
                      <option value="fixed">{t("fixed")}</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rateRows[cat].value}
                      onChange={(e) =>
                        setRateRows((prev) => ({
                          ...prev,
                          [cat]: { ...prev[cat], value: e.target.value },
                        }))
                      }
                      placeholder={t("value")}
                      className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    disabled={saving}
                    onClick={() => void saveRates()}
                    className="rounded-lg bg-admin-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {t("save")}
                  </button>
                  {saved && <span className="text-sm text-emerald-600">{t("saved")}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Tariff catalog (read-only) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("catalog")}</h2>
        {loadingEditions ? (
          <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
        ) : editions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            —
          </p>
        ) : (
          <div className="mt-4">
            <select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.label} — {ed.contract} ({ed.country})
                </option>
              ))}
            </select>
            {loadingPositions ? (
              <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
            ) : (
              <table className="mt-4 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("code")}</th>
                    <th className="px-4 py-3 text-left">Block</th>
                    <th className="px-4 py-3 text-left">{t("name")}</th>
                    <th className="px-4 py-3 text-left">{t("amount")}</th>
                    <th className="px-4 py-3 text-left">{t("shareCategory")}</th>
                    <th className="px-4 py-3 text-left">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {positions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.code}</td>
                      <td className="px-4 py-3">{p.block}</td>
                      <td className="px-4 py-3">{p.title_de}</td>
                      <td className="px-4 py-3">€{p.amount}</td>
                      <td className="px-4 py-3">{p.share_category}</td>
                      <td className="px-4 py-3">
                        {p.age_min ?? "—"}–{p.age_max ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
