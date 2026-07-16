"use client";

import {
  createMarket,
  getMarketPack,
  updateMarket,
  type MarketPack,
  type PlatformMarketDetail,
} from "@/lib/platform-api";
import type { PlatformMarketLocale } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const STEPS = ["country", "channels", "holidays", "sms"] as const;
type Step = (typeof STEPS)[number];

type NumberStrategy = PlatformMarketDetail["number_strategy"];
type SmsDirection = PlatformMarketDetail["sms_direction"];
type EmailDirection = PlatformMarketDetail["email_direction"];

const NUMBER_STRATEGY_VALUES: NumberStrategy[] = ["local", "international", "none"];

const SMS_VALUES: { value: SmsDirection; needsLocal: boolean }[] = [
  { value: "outbound", needsLocal: false },
  { value: "both", needsLocal: true },
  { value: "inbound", needsLocal: true },
  { value: "none", needsLocal: false },
];

const EMAIL_VALUES: EmailDirection[] = ["both", "outbound", "inbound", "none"];

type WizardProps = {
  featureCatalog: string[];
  initial?: PlatformMarketDetail;
  onDone: () => void;
  onCancel: () => void;
};

export function MarketWizard({ initial, onDone, onCancel }: WizardProps) {
  const t = useTranslations("markets");
  const localeNames = t.raw("wizard.localeNames") as Record<string, string>;
  const localeLabel = (loc: string) => localeNames[loc] ?? loc.toUpperCase();
  const isEdit = Boolean(initial);
  const [step, setStep] = useState<Step>("country");
  const [visited, setVisited] = useState<Set<Step>>(() => new Set<Step>(["country"]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (s: Step) => {
    setStep(s);
    setVisited((prev) => (prev.has(s) ? prev : new Set(prev).add(s)));
  };

  const [iso2, setIso2] = useState(initial?.iso2 ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [timezone, setTimezone] = useState(initial?.default_timezone ?? "UTC");
  const [currency, setCurrency] = useState(initial?.default_currency ?? "USD");
  const [currencySymbol, setCurrencySymbol] = useState(initial?.currency_symbol ?? "");
  const [dialCode, setDialCode] = useState(initial?.default_dial_code ?? "");
  const [compliance, setCompliance] = useState(initial?.compliance_notes ?? "");

  const [pack, setPack] = useState<MarketPack | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const [locales, setLocales] = useState<PlatformMarketLocale[]>(initial?.locales ?? []);

  const [numberStrategy, setNumberStrategy] = useState<NumberStrategy>(initial?.number_strategy ?? "local");
  const [smsDirection, setSmsDirection] = useState<SmsDirection>(initial?.sms_direction ?? "outbound");
  const [smsAutoReset, setSmsAutoReset] = useState(false);
  const [emailDirection, setEmailDirection] = useState<EmailDirection>(initial?.email_direction ?? "both");
  const [voiceEnabled, setVoiceEnabled] = useState(initial?.voice_agent_enabled ?? false);
  const [taxRate, setTaxRate] = useState(initial?.default_tax_rate ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [excludedHolidays, setExcludedHolidays] = useState<Set<string>>(
    () => new Set(initial?.holidays_excluded ?? []),
  );

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

  // Fetch the country pack whenever a full 2-letter ISO code is present (both
  // create and edit — edit needs it for the holidays/timezone/language option
  // lists even though the code itself is locked).
  useEffect(() => {
    if (iso2.length !== 2) {
      setPack(null);
      return;
    }
    let cancelled = false;
    setPackLoading(true);
    setPackError(null);
    getMarketPack(iso2)
      .then((p) => {
        if (cancelled) return;
        setPack(p);
        if (!isEdit) {
          setCurrencySymbol(p.currency_symbol || "");
          if (p.name) setName(p.name);
          if (p.dial_code) setDialCode(p.dial_code);
          if (p.currency) setCurrency(p.currency.toUpperCase());
          // Only auto-select the timezone when the country pack has exactly
          // one option — for multi-zone countries, silently picking
          // timezones[0] can land on the wrong zone, so leave it unset and
          // force an explicit choice (see tzOptions select + Next-button gate).
          if (p.timezones.length === 1) {
            setTimezone(p.timezones[0]);
          } else {
            setTimezone("");
          }
          setLocales(
            p.supported_locales.map((loc) => ({
              locale: loc,
              enabled: loc === "en",
              is_default: loc === "en",
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPackError(t("wizard.packError"));
      })
      .finally(() => {
        if (!cancelled) setPackLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso2, isEdit]);

  const countryName = name.trim() || iso2;

  const toggleLocale = (locale: string, nextEnabled: boolean) => {
    const msg = t(nextEnabled ? "wizard.localeAddConfirm" : "wizard.localeRemoveConfirm", {
      locale: localeLabel(locale),
      country: countryName,
    });
    if (!window.confirm(msg)) return;
    setLocales((prev) => {
      const exists = prev.some((l) => l.locale === locale);
      if (!exists) {
        return [...prev, { locale, enabled: nextEnabled, is_default: false }];
      }
      return prev.map((l) =>
        l.locale === locale ? { ...l, enabled: nextEnabled, is_default: nextEnabled ? l.is_default : false } : l,
      );
    });
  };

  const changeDefaultLocale = (locale: string) => {
    const msg = t("wizard.localeAddConfirm", { locale: localeLabel(locale), country: countryName });
    if (!window.confirm(msg)) return;
    setLocales((prev) => {
      const exists = prev.some((l) => l.locale === locale);
      const base = exists ? prev : [...prev, { locale, enabled: true, is_default: false }];
      return base.map((l) => ({
        ...l,
        enabled: l.locale === locale ? true : l.enabled,
        is_default: l.locale === locale,
      }));
    });
  };

  const hasValidLocales = locales.some((l) => l.enabled) && locales.some((l) => l.enabled && l.is_default);
  const localeOptions = pack?.supported_locales ?? locales.map((l) => l.locale);

  const handleNumberStrategyChange = (next: NumberStrategy) => {
    setNumberStrategy(next);
    if (next !== "local" && (smsDirection === "both" || smsDirection === "inbound")) {
      setSmsDirection("outbound");
      setSmsAutoReset(true);
    } else {
      setSmsAutoReset(false);
    }
    if (next === "none" && voiceEnabled) {
      setVoiceEnabled(false);
    }
  };

  const handleSmsDirectionChange = (next: SmsDirection) => {
    setSmsDirection(next);
    setSmsAutoReset(false);
  };

  const toggleHoliday = (key: string, checked: boolean) => {
    setExcludedHolidays((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildPayload = (): Record<string, unknown> => {
    if (!isEdit || !initial) {
      const body: Record<string, unknown> = {
        iso2: iso2.toUpperCase(),
        name: name.trim(),
        default_timezone: timezone,
        default_currency: currency.toUpperCase(),
        locales,
        number_strategy: numberStrategy,
        sms_direction: smsDirection,
        email_direction: emailDirection,
        voice_agent_enabled: voiceEnabled,
        holidays_excluded: Array.from(excludedHolidays),
        is_active: isActive,
        sms_senders: smsSenders.filter((s) => s.sender_id.trim().length > 0),
      };
      if (dialCode.trim()) body.default_dial_code = dialCode.trim();
      if (compliance.trim()) body.compliance_notes = compliance.trim();
      if (taxRate.trim()) body.default_tax_rate = taxRate.trim();
      return body;
    }

    // Edit: only send scalar fields that actually changed vs `initial`, and
    // never send an explicit null (omit untouched fields entirely instead).
    // `locales` / `holidays_excluded` are the exception — those are sent in
    // full whenever their step was shown, since they're whole-collection
    // replacements server-side, not per-field patches.
    const body: Record<string, unknown> = {};
    if (name.trim() !== initial.name) body.name = name.trim();
    if (timezone !== initial.default_timezone) body.default_timezone = timezone;
    if (currency.toUpperCase() !== initial.default_currency) body.default_currency = currency.toUpperCase();

    // default_dial_code / compliance_notes / default_tax_rate are the three
    // nullable optional fields the API actually clears on an explicit
    // `field: null` in the PATCH payload. When one of these had an initial
    // value and the admin empties the input, send null so the backend clears
    // it — every other field keeps the omit-if-unchanged, never-null rule.
    const trimmedDial = dialCode.trim();
    const initialDial = initial.default_dial_code ?? "";
    if (trimmedDial && trimmedDial !== initialDial) {
      body.default_dial_code = trimmedDial;
    } else if (!trimmedDial && initialDial) {
      body.default_dial_code = null;
    }

    const trimmedCompliance = compliance.trim();
    const initialCompliance = initial.compliance_notes ?? "";
    if (trimmedCompliance && trimmedCompliance !== initialCompliance) {
      body.compliance_notes = trimmedCompliance;
    } else if (!trimmedCompliance && initialCompliance) {
      body.compliance_notes = null;
    }

    const trimmedTax = taxRate.trim();
    const initialTax = initial.default_tax_rate ?? "";
    if (trimmedTax) {
      // Compare numerically so "19.5" vs "19.50" isn't treated as a change.
      if (initialTax === "" || parseFloat(trimmedTax) !== parseFloat(initialTax)) {
        body.default_tax_rate = trimmedTax;
      }
    } else if (initialTax) {
      body.default_tax_rate = null;
    }

    if (numberStrategy !== initial.number_strategy) body.number_strategy = numberStrategy;
    if (smsDirection !== initial.sms_direction) body.sms_direction = smsDirection;
    if (emailDirection !== initial.email_direction) body.email_direction = emailDirection;
    if (voiceEnabled !== initial.voice_agent_enabled) body.voice_agent_enabled = voiceEnabled;
    if (isActive !== initial.is_active) body.is_active = isActive;

    if (visited.has("country")) body.locales = locales;
    if (visited.has("holidays")) body.holidays_excluded = Array.from(excludedHolidays);

    // sms step UI is unchanged from before this task — keep its always-send behaviour.
    body.sms_senders = smsSenders.filter((s) => s.sender_id.trim().length > 0);

    return body;
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial) {
        await updateMarket(initial.iso2, buildPayload());
      } else {
        await createMarket(buildPayload());
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const tzOptions = pack?.timezones ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100 px-6 py-4">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => goTo(s)}
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
            {packLoading && <p className="text-xs text-slate-400">{t("wizard.packLoading")}</p>}
            {packError && <p className="text-xs text-amber-600">{packError}</p>}
            <Field label={t("fields.name")}>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("fields.timezone")}>
                {tzOptions.length > 0 ? (
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {timezone === "" && <option value="">{t("wizard.timezoneSelectPlaceholder")}</option>}
                    {timezone !== "" && !tzOptions.includes(timezone) && (
                      <option value={timezone}>{timezone}</option>
                    )}
                    {tzOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder={t("wizard.timezoneFreeformPlaceholder")}
                  />
                )}
              </Field>
              <Field label={t("fields.currency")}>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    maxLength={3}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  />
                  {currencySymbol && (
                    <span className="whitespace-nowrap text-xs text-slate-400">— {currencySymbol}</span>
                  )}
                </div>
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

            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <span className="block text-sm font-medium">{t("wizard.localesTitle")}</span>
              {localeOptions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {packLoading ? t("wizard.localesLoading") : t("wizard.localesEnterCode")}
                </p>
              ) : (
                <div className="space-y-1">
                  {localeOptions.map((loc) => {
                    const row = locales.find((l) => l.locale === loc);
                    const enabled = row?.enabled ?? false;
                    const isDefault = row?.is_default ?? false;
                    return (
                      <div key={loc} className="flex items-center justify-between gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleLocale(loc, e.target.checked)}
                          />
                          {localeLabel(loc)}
                        </label>
                        <label className="flex items-center gap-2 text-slate-500">
                          <input
                            type="radio"
                            name="default-locale"
                            disabled={!enabled}
                            checked={isDefault}
                            onChange={() => changeDefaultLocale(loc)}
                          />
                          {t("wizard.localeDefaultLabel")}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              {!hasValidLocales && (
                <p className="text-xs text-amber-600">{t("wizard.localesValidationHint")}</p>
              )}
            </div>
          </>
        )}

        {step === "channels" && (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-slate-700">{t("wizard.numberStrategyLegend")}</legend>
              {NUMBER_STRATEGY_VALUES.map((value) => (
                <label key={value} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="number-strategy"
                    className="mt-1"
                    checked={numberStrategy === value}
                    onChange={() => handleNumberStrategyChange(value)}
                  />
                  <span>
                    <span className="block font-medium">{t(`wizard.numberStrategy.${value}.label`)}</span>
                    <span className="block text-xs text-slate-400">{t(`wizard.numberStrategy.${value}.helper`)}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-slate-700">{t("wizard.smsLegend")}</legend>
              {SMS_VALUES.map((opt) => {
                const disabled = opt.needsLocal && numberStrategy !== "local";
                return (
                  <label key={opt.value} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="sms-direction"
                      className="mt-1"
                      disabled={disabled}
                      checked={smsDirection === opt.value}
                      onChange={() => handleSmsDirectionChange(opt.value)}
                    />
                    <span>
                      <span className={cn("block font-medium", disabled && "text-slate-400")}>
                        {t(`wizard.smsDirection.${opt.value}.label`)}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {disabled ? t("wizard.smsNeedsLocal") : t(`wizard.smsDirection.${opt.value}.helper`)}
                      </span>
                    </span>
                  </label>
                );
              })}
              {smsAutoReset && <p className="text-xs text-amber-600">{t("wizard.smsAutoReset")}</p>}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-slate-700">{t("wizard.emailLegend")}</legend>
              {EMAIL_VALUES.map((value) => (
                <label key={value} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="email-direction"
                    className="mt-1"
                    checked={emailDirection === value}
                    onChange={() => setEmailDirection(value)}
                  />
                  <span>
                    <span className="block font-medium">{t(`wizard.emailDirection.${value}.label`)}</span>
                    <span className="block text-xs text-slate-400">{t(`wizard.emailDirection.${value}.helper`)}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  disabled={numberStrategy === "none"}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                />
                <span className="font-medium">{t("wizard.voiceAgentLabel")}</span>
              </label>
              <p className="ml-6 text-xs text-slate-400">
                {numberStrategy === "none" ? t("wizard.voiceAgentNeedsNumber") : t("wizard.voiceAgentHelper")}
              </p>
            </div>

            <Field label={t("fields.taxRate")}>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </Field>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span className="font-medium">{t("wizard.launchActiveLabel")}</span>
              </label>
              <p className="ml-6 text-xs text-slate-400">{t("wizard.launchActiveHelper")}</p>
            </div>
          </div>
        )}

        {step === "holidays" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{t("wizard.holidaysNote")}</p>
            {pack === null || pack.holidays.length === 0 ? (
              <p className="text-sm text-slate-400">
                {packLoading ? t("wizard.holidaysLoading") : t("wizard.holidaysEmpty")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {pack.holidays.map((h) => {
                  const checked = !excludedHolidays.has(h.key);
                  return (
                    <label key={h.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleHoliday(h.key, e.target.checked)}
                        />
                        {h.name}
                      </span>
                      <span className="text-xs text-slate-400">{h.date}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
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
            <Button type="button" variant="secondary" onClick={() => goTo(STEPS[stepIndex - 1])}>
              {t("back")}
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => goTo(STEPS[stepIndex + 1])}
              disabled={
                step === "country" &&
                (iso2.length !== 2 || name.trim().length < 2 || !hasValidLocales || !timezone.trim())
              }
            >
              {t("next")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={saving || iso2.length !== 2 || !hasValidLocales || !timezone.trim()}
            >
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
