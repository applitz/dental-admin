"use client";

import { AdminShell } from "@/components/admin-shell";
import { hasGateAccess, hasPlatformSession, redirectToClinicLogin } from "@/lib/auth";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasPlatformSession()) {
      redirectToClinicLogin(locale, { reauth: true });
      return;
    }
    if (!hasGateAccess()) {
      router.replace(`/${locale}/challenge`);
      return;
    }
    setReady(true);
  }, [router, locale]);

  if (!ready) return null;

  return <AdminShell initialView="dashboard" />;
}
