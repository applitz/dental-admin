"use client";

import { redirectToClinicLogin, setTokens } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function CallbackContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale ?? "en");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const urlParams = new URLSearchParams(hash);
    const access = urlParams.get("access_token");
    const refresh = urlParams.get("refresh_token");
    const localeFromHash = urlParams.get("locale") ?? locale;

    if (access && refresh) {
      setTokens(access, refresh);
      router.replace(`/${localeFromHash}/challenge`);
      return;
    }

    redirectToClinicLogin(localeFromHash, { reauth: true });
  }, [router, locale]);

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
