"use client";

import { patchSettings, type PlatformSettingItem } from "@/lib/platform-api";
import {
  getDvpSettings,
  updateDvpSettings,
} from "@/lib/platform-insurance";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  items: PlatformSettingItem[];
  groups: string[];
  onSaved: () => void;
};

export function SettingsPanel({ items, groups, onSaved }: Props) {
  const t = useTranslations("settings");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, unknown> = {};
    for (const item of items) initial[item.key] = item.value;
    setDraft(initial);
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformSettingItem[]>();
    for (const g of groups) map.set(g, []);
    for (const item of items) {
      const list = map.get(item.group_key) ?? [];
      list.push(item);
      map.set(item.group_key, list);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [items, groups]);

  // Keep the active tab valid as data loads / changes; default to the first group.
  useEffect(() => {
    if (grouped.length === 0) {
      setActiveGroup(null);
      return;
    }
    setActiveGroup((cur) =>
      cur && grouped.some(([g]) => g === cur) ? cur : grouped[0][0],
    );
  }, [grouped]);

  const activeItems =
    grouped.find(([g]) => g === activeGroup)?.[1] ?? [];

  const setValue = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const changed: Record<string, unknown> = {};
      for (const item of items) {
        if (JSON.stringify(draft[item.key]) !== JSON.stringify(item.value)) {
          changed[item.key] = draft[item.key];
        }
      }
      if (Object.keys(changed).length === 0) {
        setSaved(true);
        return;
      }
      await patchSettings(changed);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        tabs={grouped.map(([group]) => ({
          id: group,
          label: t(`groups.${group}` as "groups.auth"),
        }))}
        active={activeGroup ?? ""}
        onChange={setActiveGroup}
      />

      <Card className="p-5">
        <div className="space-y-5">
          {activeItems.map((item) => (
            <SettingField key={item.key} item={item} value={draft[item.key]} onChange={setValue} />
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => void onSubmit()} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
        {saved && <span className="text-sm text-emerald-600">{t("saved")}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <DvpSettingsSection />
    </div>
  );
}

type DvpFormState = { repro: string; versi: string; versd: string; test_mode: boolean };

const EMPTY_DVP_FORM: DvpFormState = { repro: "", versi: "", versd: "", test_mode: false };

// Global DVP / software-registration settings (repro/versi/versd/test_mode).
// Not per-country, so it lives here in platform Settings rather than the
// per-country insurance panel.
function DvpSettingsSection() {
  const ti = useTranslations("insurance");
  const tc = useTranslations("common");
  const toast = useToast();

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
      toast.error(ti("loadError"));
    } finally {
      setSavingDvp(false);
    }
  };

  return (
    <section className="pt-2">
      <h2 className="text-lg font-semibold text-slate-900">{ti("dvpSettings")}</h2>
      {loadingDvp ? (
        <p className="mt-4 text-sm text-slate-500">{tc("loading")}</p>
      ) : dvpError ? (
        <p className="mt-4 text-sm text-red-600">{ti("loadError")}</p>
      ) : (
        <Card className="mt-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={ti("repro")}>
              <Input
                value={dvpForm.repro}
                onChange={(e) => setDvpForm((prev) => ({ ...prev, repro: e.target.value }))}
              />
            </Field>
            <Field label={ti("versi")}>
              <Input
                value={dvpForm.versi}
                onChange={(e) => setDvpForm((prev) => ({ ...prev, versi: e.target.value }))}
              />
            </Field>
            <Field label={ti("versd")}>
              <Input
                value={dvpForm.versd}
                onChange={(e) => setDvpForm((prev) => ({ ...prev, versd: e.target.value }))}
              />
            </Field>
            <Field label={ti("testMode")}>
              <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={dvpForm.test_mode}
                  onChange={(e) => setDvpForm((prev) => ({ ...prev, test_mode: e.target.checked }))}
                />
                {ti("testMode")}
              </label>
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={savingDvp} onClick={() => void saveDvpSettings()}>
              {ti("save")}
            </Button>
            {dvpSaved && <span className="text-sm text-emerald-600">{ti("saved")}</span>}
          </div>
        </Card>
      )}
    </section>
  );
}

function SettingField({
  item,
  value,
  onChange,
}: {
  item: PlatformSettingItem;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const id = `setting-${item.key}`;

  return (
    <Field label={item.label} hint={item.description ?? undefined}>
      {item.value_type === "bool" ? (
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 accent-dental-600"
          checked={Boolean(value)}
          onChange={(e) => onChange(item.key, e.target.checked)}
        />
      ) : item.value_type === "string_list" ? (
        <Input
          id={id}
          type="text"
          className="max-w-xl"
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(e) =>
            onChange(
              item.key,
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      ) : item.value_type === "int" || item.value_type === "float" ? (
        <Input
          id={id}
          type="number"
          step={item.value_type === "float" ? "0.1" : "1"}
          className="max-w-xs"
          value={String(value ?? "")}
          onChange={(e) =>
            onChange(item.key, item.value_type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
          }
        />
      ) : (
        <Input
          id={id}
          type="text"
          className="max-w-xl"
          value={String(value ?? "")}
          onChange={(e) => onChange(item.key, e.target.value)}
        />
      )}
    </Field>
  );
}
