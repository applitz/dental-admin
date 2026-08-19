"use client";

import {
  createInsurer,
  getDvpSettings,
  getShareRules,
  listEditions,
  listInsurers,
  listPositions,
  setShareRules,
  updateDvpSettings,
  updateInsurer,
  type DvpSettings,
  type InsurerAdmin,
  type ShareRule,
  type TariffEdition,
  type TariffPositionAdmin,
} from "@/lib/platform-insurance";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { TableCard, Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const SHARE_CATEGORIES: ShareRule["share_category"][] = ["prosthetics", "ortho"];

type ShareRowState = { kind: ShareRule["kind"]; value: string };

const EMPTY_RATE_ROWS: Record<ShareRule["share_category"], ShareRowState> = {
  prosthetics: { kind: "percent", value: "" },
  ortho: { kind: "percent", value: "" },
};

type DvpFormState = { repro: string; versi: string; versd: string; test_mode: boolean };

const EMPTY_DVP_FORM: DvpFormState = { repro: "", versi: "", versd: "", test_mode: false };

export function InsuranceView() {
  const t = useTranslations("insurance");
  const tc = useTranslations("common");
  const toast = useToast();

  // --- DVP settings ---
  const [dvpForm, setDvpForm] = useState<DvpFormState>(EMPTY_DVP_FORM);
  const [loadingDvp, setLoadingDvp] = useState(true);
  const [dvpError, setDvpError] = useState(false);
  const [savingDvp, setSavingDvp] = useState(false);
  const [dvpSaved, setDvpSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingDvp(true);
    setDvpError(false);
    void getDvpSettings()
      .then((settings) => {
        if (cancelled) return;
        setDvpForm({
          repro: settings.repro ?? "",
          versi: settings.versi ?? "",
          versd: settings.versd,
          test_mode: settings.test_mode,
        });
      })
      .catch(() => {
        if (!cancelled) setDvpError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDvp(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDvpSettings = async () => {
    setSavingDvp(true);
    setDvpSaved(false);
    try {
      const updated = await updateDvpSettings({
        repro: dvpForm.repro.trim() || null,
        versi: dvpForm.versi.trim() || null,
        versd: dvpForm.versd.trim(),
        test_mode: dvpForm.test_mode,
      });
      setDvpForm({
        repro: updated.repro ?? "",
        versi: updated.versi ?? "",
        versd: updated.versd,
        test_mode: updated.test_mode,
      });
      setDvpSaved(true);
      setTimeout(() => setDvpSaved(false), 2000);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setSavingDvp(false);
    }
  };

  // --- Insurers ---
  const [insurers, setInsurers] = useState<InsurerAdmin[]>([]);
  const [loadingInsurers, setLoadingInsurers] = useState(true);
  const [insurersError, setInsurersError] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newTraegerVstrl, setNewTraegerVstrl] = useState("");
  const [newTraegerBundesland, setNewTraegerBundesland] = useState("");
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
      await createInsurer({
        code,
        name,
        is_active: true,
        traeger_vstrl: newTraegerVstrl.trim() || null,
        traeger_bundesland: newTraegerBundesland.trim() || null,
      });
      setNewCode("");
      setNewName("");
      setNewTraegerVstrl("");
      setNewTraegerBundesland("");
      reloadInsurers();
    } catch {
      toast.error(t("loadError"));
    } finally {
      setCreating(false);
    }
  };

  const saveInsurerName = async (id: string, name: string) => {
    try {
      const updated = await updateInsurer(id, { name });
      setInsurers((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      toast.error(t("loadError"));
      reloadInsurers();
    }
  };

  const saveInsurerTraeger = async (
    id: string,
    field: "traeger_vstrl" | "traeger_bundesland",
    value: string,
  ) => {
    try {
      const updated = await updateInsurer(id, { [field]: value || null });
      setInsurers((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      toast.error(t("loadError"));
      reloadInsurers();
    }
  };

  const toggleInsurerActive = async (id: string, is_active: boolean) => {
    try {
      const updated = await updateInsurer(id, { is_active });
      setInsurers((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      toast.error(t("loadError"));
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
      toast.error(t("loadError"));
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
      <PageHeader title={t("title")} />

      {/* 0. DVP settings */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("dvpSettings")}</h2>
        {loadingDvp ? (
          <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
        ) : dvpError ? (
          <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>
        ) : (
          <Card className="mt-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("repro")}>
                <Input
                  value={dvpForm.repro}
                  onChange={(e) => setDvpForm((prev) => ({ ...prev, repro: e.target.value }))}
                />
              </Field>
              <Field label={t("versi")}>
                <Input
                  value={dvpForm.versi}
                  onChange={(e) => setDvpForm((prev) => ({ ...prev, versi: e.target.value }))}
                />
              </Field>
              <Field label={t("versd")}>
                <Input
                  value={dvpForm.versd}
                  onChange={(e) => setDvpForm((prev) => ({ ...prev, versd: e.target.value }))}
                />
              </Field>
              <Field label={t("testMode")}>
                <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={dvpForm.test_mode}
                    onChange={(e) => setDvpForm((prev) => ({ ...prev, test_mode: e.target.checked }))}
                  />
                  {t("testMode")}
                </label>
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button disabled={savingDvp} onClick={() => void saveDvpSettings()}>
                {t("save")}
              </Button>
              {dvpSaved && <span className="text-sm text-emerald-600">{t("saved")}</span>}
            </div>
          </Card>
        )}
      </section>

      {/* 1. Insurers */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("insurers")}</h2>
        {loadingInsurers ? (
          <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
        ) : insurersError ? (
          <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>
        ) : (
          <TableCard className="mt-4">
            <Table>
              <THead>
                <Tr>
                  <Th>{t("code")}</Th>
                  <Th>{t("name")}</Th>
                  <Th>{t("traegerVstrl")}</Th>
                  <Th>{t("traegerBundesland")}</Th>
                  <Th>{t("active")}</Th>
                </Tr>
              </THead>
              <TBody>
                {insurers.map((row) => (
                  <Tr
                    key={row.id}
                    onClick={() => setSelectedInsurerId(row.id)}
                    className={cn(
                      "cursor-pointer",
                      selectedInsurerId === row.id ? "bg-dental-50" : "hover:bg-slate-50",
                    )}
                  >
                    <Td className="font-medium text-slate-900">{row.code}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Input
                        key={`${row.id}-${row.name}`}
                        defaultValue={row.name}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value && value !== row.name) void saveInsurerName(row.id, value);
                        }}
                      />
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Input
                        key={`${row.id}-vstrl-${row.traeger_vstrl ?? ""}`}
                        defaultValue={row.traeger_vstrl ?? ""}
                        maxLength={2}
                        className="w-20"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value !== (row.traeger_vstrl ?? ""))
                            void saveInsurerTraeger(row.id, "traeger_vstrl", value);
                        }}
                      />
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Input
                        key={`${row.id}-blnd-${row.traeger_bundesland ?? ""}`}
                        defaultValue={row.traeger_bundesland ?? ""}
                        maxLength={1}
                        className="w-16"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value !== (row.traeger_bundesland ?? ""))
                            void saveInsurerTraeger(row.id, "traeger_bundesland", value);
                        }}
                      />
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) => void toggleInsurerActive(row.id, e.target.checked)}
                      />
                    </Td>
                  </Tr>
                ))}
                <Tr>
                  <Td>
                    <Input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder={t("code")}
                    />
                  </Td>
                  <Td>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t("name")}
                    />
                  </Td>
                  <Td>
                    <Input
                      value={newTraegerVstrl}
                      onChange={(e) => setNewTraegerVstrl(e.target.value)}
                      placeholder={t("traegerVstrl")}
                      maxLength={2}
                      className="w-20"
                    />
                  </Td>
                  <Td>
                    <Input
                      value={newTraegerBundesland}
                      onChange={(e) => setNewTraegerBundesland(e.target.value)}
                      placeholder={t("traegerBundesland")}
                      maxLength={1}
                      className="w-16"
                    />
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      disabled={creating || !newCode.trim() || !newName.trim()}
                      onClick={() => void addInsurer()}
                    >
                      {t("addInsurer")}
                    </Button>
                  </Td>
                </Tr>
              </TBody>
            </Table>
          </TableCard>
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
          <Card className="mt-4 p-5">
            <p className="text-sm font-medium text-slate-700">
              {selectedInsurer.name} <span className="text-xs text-slate-400">{selectedInsurer.code}</span>
            </p>
            {loadingRates ? (
              <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
            ) : ratesError ? (
              <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {!hasAnyRate && <p className="text-sm text-amber-600">{t("noRates")}</p>}
                {SHARE_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm text-slate-600">
                      {cat === "prosthetics" ? t("catProsthetics") : t("catOrtho")}
                    </span>
                    <Select
                      size="sm"
                      wrapperClassName="w-32"
                      value={rateRows[cat].kind}
                      onChange={(e) =>
                        setRateRows((prev) => ({
                          ...prev,
                          [cat]: { ...prev[cat], kind: e.target.value as ShareRule["kind"] },
                        }))
                      }
                    >
                      <option value="percent">{t("percent")}</option>
                      <option value="fixed">{t("fixed")}</option>
                    </Select>
                    <Input
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
                      className="w-32"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <Button disabled={saving} onClick={() => void saveRates()}>
                    {t("save")}
                  </Button>
                  {saved && <span className="text-sm text-emerald-600">{t("saved")}</span>}
                </div>
              </div>
            )}
          </Card>
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
            <Select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              wrapperClassName="max-w-md"
            >
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.label} — {ed.contract} ({ed.country})
                </option>
              ))}
            </Select>
            {loadingPositions ? (
              <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
            ) : (
              <TableCard className="mt-4">
                <Table>
                  <THead>
                    <Tr>
                      <Th>{t("code")}</Th>
                      <Th>Block</Th>
                      <Th>{t("name")}</Th>
                      <Th>{t("amount")}</Th>
                      <Th>{t("shareCategory")}</Th>
                      <Th>Age</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {positions.map((p) => (
                      <Tr key={p.id}>
                        <Td className="font-medium text-slate-900">{p.code}</Td>
                        <Td>{p.block}</Td>
                        <Td>{p.title_de}</Td>
                        <Td>€{p.amount}</Td>
                        <Td>{p.share_category}</Td>
                        <Td>
                          {p.age_min ?? "—"}–{p.age_max ?? "—"}
                        </Td>
                      </Tr>
                    ))}
                    {positions.length === 0 && (
                      <Tr>
                        <Td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                          —
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
