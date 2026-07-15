"use client";

import { createMarket, updateMarket, type PlatformMarketDetail } from "@/lib/platform-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

const STEPS = ["country", "sms"] as const;
type Step = (typeof STEPS)[number];

type WizardProps = {
  featureCatalog: string[];
  initial?: PlatformMarketDetail;
  onDone: () => void;
  onCancel: () => void;
};

export function MarketWizard({ initial, onDone, onCancel }: WizardProps) {
  const t = useTranslations("markets");
  const isEdit = Boolean(initial);
  const [step, setStep] = useState<Step>("country");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [iso2, setIso2] = useState(initial?.iso2 ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [timezone, setTimezone] = useState(initial?.default_timezone ?? "UTC");
  const [currency, setCurrency] = useState(initial?.default_currency ?? "USD");
  const [dialCode, setDialCode] = useState(initial?.default_dial_code ?? "");
  const [compliance, setCompliance] = useState(initial?.compliance_notes ?? "");

  const [smsSenders, setSmsSenders] = useState(
    initial?.sms_senders ?? [
      {
        purpose: "patient",
        sender_type: "alphanumeric",
        sender_id: "",
        messaging_profile_id: null,
        is_default: true,
      },
      {
        purpose: "otp",
        sender_type: "alphanumeric",
        sender_id: "",
        messaging_profile_id: null,
        is_default: true,
      },
    ],
  );

  const stepIndex = STEPS.indexOf(step);

  const payload = () => ({
    iso2: iso2.toUpperCase(),
    name,
    default_timezone: timezone,
    default_currency: currency,
    default_dial_code: dialCode || null,
    compliance_notes: compliance || null,
    locales: initial?.locales ?? [{ locale: "en", is_default: true, enabled: true }],
    sms_senders: smsSenders.filter((s) => s.sender_id.trim().length > 0),
    features: initial?.features ?? [],
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
        {step === "country" && (
          <>
            <p className="text-sm text-slate-500">{t("wizard.countryHint")}</p>
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
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("fields.timezone")}>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </Field>
              <Field label={t("fields.currency")}>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </Field>
              <Field label={t("fields.dialCode")}>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  placeholder="+49"
                />
              </Field>
            </div>
            <Field label={t("fields.compliance")}>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={compliance}
                onChange={(e) => setCompliance(e.target.value)}
              />
            </Field>
          </>
        )}

        {step === "sms" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{t("wizard.smsHint")}</p>
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
                      placeholder={t("fields.senderIdPlaceholder")}
                      value={sms.sender_id}
                      onChange={(e) => {
                        const next = [...smsSenders];
                        next[idx] = { ...sms, sender_id: e.target.value };
                        setSmsSenders(next);
                      }}
                    />
                  </Field>
                  <Field label={t("fields.messagingSid")}>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                      placeholder={t("fields.messagingSidPlaceholder")}
                      value={sms.messaging_profile_id ?? ""}
                      onChange={(e) => {
                        const next = [...smsSenders];
                        next[idx] = {
                          ...sms,
                          messaging_profile_id: e.target.value || null,
                        };
                        setSmsSenders(next);
                      }}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-between border-t border-slate-100 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep(STEPS[stepIndex - 1])}>
              {t("back")}
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep(STEPS[stepIndex + 1])}
              disabled={step === "country" && (iso2.length !== 2 || name.trim().length < 2)}
            >
              {t("next")}
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={saving || iso2.length !== 2}>
              {saving ? t("saving") : isEdit ? t("save") : t("save")}
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
