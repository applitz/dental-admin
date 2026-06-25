"use client";

import { createMarket, updateMarket, type PlatformMarketDetail } from "@/lib/platform-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

const STEPS = ["identity", "locales", "sms", "features", "golive"] as const;
type Step = (typeof STEPS)[number];

const COMMON_LOCALES = ["en", "de", "fr", "it", "es", "nl", "pl", "tr"];

type WizardProps = {
  featureCatalog: string[];
  initial?: PlatformMarketDetail;
  onDone: () => void;
  onCancel: () => void;
};

export function MarketWizard({ featureCatalog, initial, onDone, onCancel }: WizardProps) {
  const t = useTranslations("markets");
  const isEdit = Boolean(initial);
  const [step, setStep] = useState<Step>("identity");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [iso2, setIso2] = useState(initial?.iso2 ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [timezone, setTimezone] = useState(initial?.default_timezone ?? "Europe/Berlin");
  const [currency, setCurrency] = useState(initial?.default_currency ?? "EUR");
  const [dialCode, setDialCode] = useState(initial?.default_dial_code ?? "");
  const [compliance, setCompliance] = useState(initial?.compliance_notes ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? false);

  const [locales, setLocales] = useState(
    initial?.locales ?? [
      { locale: "en", is_default: true, enabled: true },
      { locale: "de", is_default: false, enabled: true },
    ],
  );

  const [smsSenders, setSmsSenders] = useState(
    initial?.sms_senders ?? [
      { purpose: "patient", sender_type: "alphanumeric", sender_id: "Vodett", twilio_messaging_service_sid: null, is_default: true },
      { purpose: "otp", sender_type: "alphanumeric", sender_id: "Vodett", twilio_messaging_service_sid: null, is_default: true },
    ],
  );

  const [features, setFeatures] = useState(
    initial?.features ??
      featureCatalog.map((key) => ({ feature_key: key, enabled: true, rollout_percent: 100 })),
  );

  const stepIndex = STEPS.indexOf(step);

  const toggleLocale = (locale: string) => {
    const exists = locales.find((l) => l.locale === locale);
    if (exists) {
      setLocales(locales.filter((l) => l.locale !== locale));
    } else {
      setLocales([...locales, { locale, is_default: locales.length === 0, enabled: true }]);
    }
  };

  const setDefaultLocale = (locale: string) => {
    setLocales(locales.map((l) => ({ ...l, is_default: l.locale === locale })));
  };

  const toggleFeature = (key: string) => {
    setFeatures(features.map((f) => (f.feature_key === key ? { ...f, enabled: !f.enabled } : f)));
  };

  const payload = () => ({
    iso2: iso2.toUpperCase(),
    name,
    default_timezone: timezone,
    default_currency: currency,
    default_dial_code: dialCode || null,
    compliance_notes: compliance || null,
    is_active: isActive,
    locales,
    sms_senders: smsSenders,
    features,
  });

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial) {
        await updateMarket(initial.iso2, payload());
      } else {
        await createMarket(payload());
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100 px-6 py-4">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={cn(
              "mr-4 text-sm font-medium",
              step === s ? "text-admin-700" : "text-slate-400 hover:text-slate-600",
            )}
          >
            {i + 1}. {t(`wizard.${s}`)}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-6">
        {step === "identity" && (
          <>
            <Field label={t("fields.iso2")}>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                maxLength={2}
                disabled={isEdit}
                value={iso2}
                onChange={(e) => setIso2(e.target.value.toUpperCase())}
              />
            </Field>
            <Field label={t("fields.name")}>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("fields.timezone")}>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </Field>
              <Field label={t("fields.currency")}>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
              </Field>
              <Field label={t("fields.dialCode")}>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={dialCode} onChange={(e) => setDialCode(e.target.value)} placeholder="+49" />
              </Field>
            </div>
            <Field label={t("fields.compliance")}>
              <textarea className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm" value={compliance} onChange={(e) => setCompliance(e.target.value)} />
            </Field>
          </>
        )}

        {step === "locales" && (
          <div>
            <p className="mb-3 text-sm text-slate-500">{t("wizard.localesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_LOCALES.map((loc) => {
                const active = locales.some((l) => l.locale === loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocale(loc)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm",
                      active ? "bg-admin-600 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
            {locales.length > 0 && (
              <ul className="mt-4 space-y-2">
                {locales.map((l) => (
                  <li key={l.locale} className="flex items-center gap-3 text-sm">
                    <span className="font-medium uppercase">{l.locale}</span>
                    <label className="flex items-center gap-1">
                      <input type="radio" name="defaultLocale" checked={l.is_default} onChange={() => setDefaultLocale(l.locale)} />
                      {t("fields.defaultLocale")}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === "sms" && (
          <div className="space-y-4">
            {smsSenders.map((sms, idx) => (
              <div key={idx} className="rounded-lg border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">{sms.purpose}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label={t("fields.senderType")}>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={sms.sender_type}
                      onChange={(e) => {
                        const next = [...smsSenders];
                        next[idx] = { ...sms, sender_type: e.target.value };
                        setSmsSenders(next);
                      }}
                    >
                      <option value="alphanumeric">Alphanumeric</option>
                      <option value="long_code">Long code</option>
                      <option value="short_code">Short code</option>
                    </select>
                  </Field>
                  <Field label={t("fields.senderId")}>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={sms.sender_id}
                      onChange={(e) => {
                        const next = [...smsSenders];
                        next[idx] = { ...sms, sender_id: e.target.value };
                        setSmsSenders(next);
                      }}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "features" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <label key={f.feature_key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <input type="checkbox" checked={f.enabled} onChange={() => toggleFeature(f.feature_key)} />
                <span>{f.feature_key}</span>
              </label>
            ))}
          </div>
        )}

        {step === "golive" && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              {t("fields.isActive")}
            </label>
            <p className="text-sm text-slate-500">{t("wizard.goLiveHint")}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-between border-t border-slate-100 px-6 py-4">
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button variant="ghost" onClick={() => setStep(STEPS[stepIndex - 1])}>
              {t("back")}
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={() => setStep(STEPS[stepIndex + 1])}>{t("next")}</Button>
          ) : (
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? t("saving") : isEdit ? t("save") : t("launch")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
