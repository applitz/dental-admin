"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  downloadTenantRegulatoryDoc,
  getTenantRegulatory,
  resubmitTenantRegulatory,
  type TenantRegulatory,
} from "@/lib/platform-actions";

const STATUS_LABEL: Record<TenantRegulatory["status"], string> = {
  not_required: "Not required",
  not_started: "Documents pending",
  under_review: "Under review",
  active: "Active",
  declined: "Declined",
};

const STATUS_STYLE: Record<TenantRegulatory["status"], string> = {
  not_required: "bg-slate-100 text-slate-700",
  not_started: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  active: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

/** Platform-ops view of a tenant's regulatory number setup: status + Telnyx
 *  error, copy details for manual submission, download the owner's documents,
 *  and resubmit the requirement bundle. Only shown for regulated markets. */
export function TenantMobileNumber({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<TenantRegulatory | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTenantRegulatory(tenantId));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`Copied ${label}`);
    } catch {
      setMsg("Copy failed");
    }
  }

  async function resubmit() {
    setBusy(true);
    setMsg(null);
    try {
      setData(await resubmitTenantRegulatory(tenantId));
      setMsg("Resubmitted to Telnyx");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Resubmit failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (!data || !data.required) return null; // regulated markets only

  const addressStr = data.address
    ? Object.values(data.address).filter(Boolean).join(", ")
    : null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-2 text-xs font-medium text-slate-500">Mobile number — regulatory</p>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[data.status]}`}
        >
          {STATUS_LABEL[data.status]}
        </span>
        {data.number ? <span className="font-mono text-xs text-slate-700">{data.number}</span> : null}
      </div>

      {data.status === "declined" && data.decline_reason ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="font-semibold">Telnyx error:</span> {data.decline_reason}
        </div>
      ) : null}

      <dl className="mt-3 space-y-1 text-xs text-slate-700">
        <DetailRow label="Contact" value={data.contact_name} onCopy={copy} />
        <DetailRow label="Business" value={data.contact_business} onCopy={copy} />
        <DetailRow label="Phone" value={data.contact_phone} onCopy={copy} />
        <DetailRow label="Area code" value={data.area_code} onCopy={copy} />
        <DetailRow label="Address" value={addressStr} onCopy={copy} />
      </dl>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void copy(data.copy_text, "all details")}
        >
          Copy all
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => void resubmit()} disabled={busy}>
          {busy ? "Resubmitting…" : "Resubmit to Telnyx"}
        </Button>
      </div>

      {data.documents.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Documents</p>
          <ul className="space-y-1">
            {data.documents.map((d) => (
              <li
                key={d.requirement_id}
                className="flex items-center justify-between gap-2 text-xs text-slate-700"
              >
                <span className="truncate">{d.filename}</span>
                <button
                  type="button"
                  className="shrink-0 text-slate-600 underline hover:text-slate-900"
                  onClick={() =>
                    void downloadTenantRegulatoryDoc(tenantId, d.requirement_id, d.filename)
                  }
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-xs text-slate-500">{msg}</p> : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span>
        <span className="text-slate-400">{label}:</span> {value}
      </span>
      <button
        type="button"
        className="shrink-0 text-slate-500 hover:text-slate-800"
        onClick={() => onCopy(value, label)}
        title={`Copy ${label}`}
      >
        Copy
      </button>
    </div>
  );
}
