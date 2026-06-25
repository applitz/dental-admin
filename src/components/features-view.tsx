"use client";

import {
  fetchFeatureCatalog,
  type FeatureCatalogItem,
} from "@/lib/platform-actions";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function FeaturesView() {
  const t = useTranslations("features");
  const [items, setItems] = useState<FeatureCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchFeatureCatalog()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      {loading ? (
        <p className="mt-8 text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div
              key={f.feature_key}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-slate-900">{f.label}</p>
              <p className="mt-1 font-mono text-xs text-slate-400">{f.feature_key}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-slate-500">{t("tenantHint")}</p>
    </div>
  );
}
