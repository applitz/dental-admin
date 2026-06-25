"use client";

import { patchSettings, type PlatformSettingItem } from "@/lib/platform-api";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-8">
      {grouped.map(([group, groupItems]) => (
        <section key={group} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t(`groups.${group}` as "groups.auth")}
          </h2>
          <div className="mt-4 space-y-5">
            {groupItems.map((item) => (
              <SettingField key={item.key} item={item} value={draft[item.key]} onChange={setValue} />
            ))}
          </div>
        </section>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={() => void onSubmit()} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
        {saved && <span className="text-sm text-emerald-600">{t("saved")}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
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
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {item.label}
      </label>
      {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}
      <div className="mt-2">
        {item.value_type === "bool" ? (
          <input
            id={id}
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={Boolean(value)}
            onChange={(e) => onChange(item.key, e.target.checked)}
          />
        ) : item.value_type === "string_list" ? (
          <input
            id={id}
            type="text"
            className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
            onChange={(e) =>
              onChange(
                item.key,
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
          />
        ) : item.value_type === "int" || item.value_type === "float" ? (
          <input
            id={id}
            type="number"
            step={item.value_type === "float" ? "0.1" : "1"}
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={String(value ?? "")}
            onChange={(e) =>
              onChange(item.key, item.value_type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
            }
          />
        ) : (
          <input
            id={id}
            type="text"
            className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={String(value ?? "")}
            onChange={(e) => onChange(item.key, e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
