"use client";

import { AdminShell, type AdminView } from "@/components/admin-shell";
import { hasGateAccess, hasPlatformSession, redirectToClinicLogin } from "@/lib/auth";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SECTIONS: AdminView[] = ["tenants", "markets", "features", "settings", "audit", "system"];

export default function SectionPage() {
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const section = String(params.section ?? "tenants");
  const view = SECTIONS.includes(section as AdminView) ? (section as AdminView) : "tenants";
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

  return <AdminShell initialView={view} />;
}
