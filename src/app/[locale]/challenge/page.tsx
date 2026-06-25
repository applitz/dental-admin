"use client";

import { Button } from "@/components/ui/button";
import { clinicLoginUrl, hasPlatformSession, setGateToken } from "@/lib/auth";
import { verifyPlatformGate } from "@/lib/api";
import { Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChallengePage() {
  const t = useTranslations("challenge");
  const locale = useLocale();
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!hasPlatformSession()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">{t("noSession")}</p>
          <Button className="mt-4 w-full" onClick={() => { window.location.href = clinicLoginUrl(locale); }}>
            {t("goToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyPlatformGate(secret.trim());
      setGateToken(result.gate_token);
      router.replace(`/${locale}`);
    } catch {
      setError(t("invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-admin-900 via-admin-700 to-slate-900 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-admin-100 text-admin-700">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("subtitle")}</p>
        <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="gate-secret">
          {t("label")}
        </label>
        <input
          id="gate-secret"
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-admin-500 focus:outline-none focus:ring-2 focus:ring-admin-500/20"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" className="mt-6 w-full" size="lg" disabled={loading || secret.length < 4}>
          {loading ? "…" : t("submit")}
        </Button>
      </form>
    </div>
  );
}
