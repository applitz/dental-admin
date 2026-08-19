"use client";

import {
  createInsurer,
  deleteInsurer,
  downloadCountryTemplate,
  getShareRules,
  importInsurerServices,
  listInsurers,
  listInsurerServices,
  setShareRules,
  updateInsurer,
  type InsurerAdmin,
  type InsurerServiceAdmin,
  type ShareRule,
} from "@/lib/platform-insurance";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { TableCard, Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-provider";

const SHARE_CATEGORIES: ShareRule["share_category"][] = ["prosthetics", "ortho"];

type ShareRowState = { kind: ShareRule["kind"]; value: string };

const EMPTY_RATE_ROWS: Record<ShareRule["share_category"], ShareRowState> = {
  prosthetics: { kind: "percent", value: "" },
  ortho: { kind: "percent", value: "" },
};

export function CountryInsurance({ country }: { country: string }) {
  const t = useTranslations("insurance");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirm = useConfirm();

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
    void listInsurers(country)
      .then(setInsurers)
      .catch(() => setInsurersError(true))
      .finally(() => setLoadingInsurers(false));
  }, [country]);

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
        country,
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

  const removeInsurer = async (id: string, name: string) => {
    if (
      !(await confirm({
        title: t("delete"),
        message: t("deleteInsurerConfirm", { name }),
        tone: "destructive",
      }))
    )
      return;
    try {
      await deleteInsurer(id);
      if (selectedInsurerId === id) setSelectedInsurerId(null);
      toast.success(t("insurerDeleted"));
      reloadInsurers();
    } catch {
      toast.error(t("deleteFailed"));
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

  // --- Uploaded services (per insurer) ---
  const [services, setServices] = useState<InsurerServiceAdmin[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadServices = useCallback((insurerId: string) => {
    setLoadingServices(true);
    setServicesError(false);
    return listInsurerServices(insurerId)
      .then(setServices)
      .catch(() => setServicesError(true))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!selectedInsurerId) {
      setServices([]);
      setImportErrors([]);
      return;
    }
    let cancelled = false;
    setLoadingServices(true);
    setServicesError(false);
    setImportErrors([]);
    void listInsurerServices(selectedInsurerId)
      .then((rows) => {
        if (!cancelled) setServices(rows);
      })
      .catch(() => {
        if (!cancelled) setServicesError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedInsurerId]);

  const handleServiceFile = async (file: File) => {
    const targetId = uploadTargetId;
    if (!targetId) return;
    setUploadBusy(true);
    setImportErrors([]);
    // Show the target company's services table after upload.
    setSelectedInsurerId(targetId);
    try {
      const res = await importInsurerServices(targetId, file);
      toast.success(t("servicesImported", { count: res.imported }));
      await reloadServices(targetId);
    } catch (err) {
      const rows =
        err instanceof ApiError
          ? ((err.body.params as { errors?: string[] } | undefined)?.errors ?? [])
          : [];
      setImportErrors(rows);
      toast.error(t("servicesImportFailed"));
    } finally {
      setUploadBusy(false);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startUpload = (insurerId: string) => {
    setUploadTargetId(insurerId);
    fileInputRef.current?.click();
  };

  const downloadTemplate = async () => {
    try {
      await downloadCountryTemplate(country);
    } catch {
      toast.error(t("loadError"));
    }
  };

  const selectedInsurer = insurers.find((i) => i.id === selectedInsurerId) ?? null;
  const hasAnyRate = rateRows.prosthetics.value.trim() !== "" || rateRows.ortho.value.trim() !== "";

  return (
    <div>
      {/* Shared hidden file input, driven by each row's Upload button. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleServiceFile(file);
        }}
      />

      {/* Panel header — always-visible, country-level template download */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t("title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{t("servicesHint")}</p>
        </div>
        <Button variant="secondary" onClick={() => void downloadTemplate()}>
          {t("downloadTemplate")}
        </Button>
      </div>

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
                  <Th className="text-right" />
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
                    <Td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={uploadBusy}
                          onClick={() => startUpload(row.id)}
                        >
                          {uploadBusy && uploadTargetId === row.id ? t("importing") : t("upload")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => void removeInsurer(row.id, row.name)}
                        >
                          {t("delete")}
                        </Button>
                      </div>
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
                  <Td />
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

      {/* 2b. Uploaded services (per insurer) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t("servicesTitle")}</h2>
        {!selectedInsurer ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            {t("selectInsurerForServices")}
          </p>
        ) : (
          <Card className="mt-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                {selectedInsurer.name} <span className="text-xs text-slate-400">{selectedInsurer.code}</span>
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={uploadBusy}
                onClick={() => startUpload(selectedInsurer.id)}
              >
                {uploadBusy && uploadTargetId === selectedInsurer.id ? t("importing") : t("upload")}
              </Button>
            </div>

            {importErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-medium">{t("servicesImportFailed")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {importErrors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {loadingServices ? (
              <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
            ) : servicesError ? (
              <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>
            ) : (
              <TableCard className="mt-4">
                <Table>
                  <THead>
                    <Tr>
                      <Th>{t("colShortcut")}</Th>
                      <Th>{t("name")}</Th>
                      <Th>{t("colDvpCode")}</Th>
                      <Th>{t("block")}</Th>
                      <Th>{t("price")}</Th>
                      <Th>{t("colPatientShare")}</Th>
                      <Th>{t("colAge")}</Th>
                      <Th>{t("active")}</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {services.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-medium text-slate-900">{s.shortcut}</Td>
                        <Td>{s.name}</Td>
                        <Td>{s.dvp_code}</Td>
                        <Td>{s.block}</Td>
                        <Td>€{s.price}</Td>
                        <Td>
                          {s.patient_share_kind === "percent"
                            ? `${s.patient_share_value}%`
                            : s.patient_share_kind === "fixed"
                              ? `€${s.patient_share_value}`
                              : "—"}
                        </Td>
                        <Td>
                          {s.age_min == null && s.age_max == null
                            ? "—"
                            : `${s.age_min ?? ""}–${s.age_max ?? ""}`}
                        </Td>
                        <Td>
                          <input type="checkbox" checked={s.is_active} readOnly />
                        </Td>
                      </Tr>
                    ))}
                    {services.length === 0 && (
                      <Tr>
                        <Td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                          {t("noServices")}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
