"use client";

import { useState } from "react";
import { createMailbox } from "@/lib/api/platform-mail";

type Props = { onClose: () => void; onCreated: () => void };

export function AddAddressModal({ onClose, onCreated }: Props) {
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createMailbox({ local_part: localPart, display_name: displayName || undefined });
      onCreated();
      onClose();
    } catch {
      setError("Could not create address (already taken or invalid).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold">Add mailbox address</h3>
        <div className="flex items-center gap-1">
          <input
            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="info"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
          />
          <span className="text-sm text-slate-500">@vodett.ai</span>
        </div>
        <input
          className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded px-3 py-1 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-admin-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            onClick={submit}
            disabled={busy || !localPart}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
