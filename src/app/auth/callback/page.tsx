"use client";

import { setTokens } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CallbackContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    const locale = params.get("locale") ?? "en";

    if (access && refresh) {
      setTokens(access, refresh);
      router.replace(`/${locale}/challenge`);
      return;
    }

    setError(t("callbackError"));
  }, [router, t]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return <p className="text-sm text-slate-600">{t("redirecting")}</p>;
}

export default function AuthCallbackPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-lg font-medium text-slate-900">{t("callbackTitle")}</h1>
        <Suspense fallback={<p className="mt-2 text-sm text-slate-500">{t("redirecting")}</p>}>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
