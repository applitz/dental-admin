"use client";

import type { Mailbox } from "@/lib/api/platform-mail";

type Props = {
  mailboxes: Mailbox[];
  selectedId: string | null; // null = unified (all)
  onSelect: (id: string | null) => void;
  onAddAddress: () => void;
};

export function MailboxSwitcher({ mailboxes, selectedId, onSelect, onAddAddress }: Props) {
  return (
    <div className="w-56 shrink-0 space-y-1 border-r border-slate-200 p-2">
      <button
        className={`block w-full rounded px-3 py-2 text-left text-sm ${
          selectedId === null ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
        }`}
        onClick={() => onSelect(null)}
      >
        All mailboxes
      </button>
      {mailboxes.map((mb) => (
        <button
          key={mb.id}
          className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
            selectedId === mb.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
          } ${mb.is_active ? "" : "opacity-50"}`}
          onClick={() => onSelect(mb.id)}
        >
          <span className="truncate">{mb.address}</span>
          {mb.unread_count > 0 && (
            <span className="ml-2 rounded-full bg-admin-600 px-2 text-xs text-white">
              {mb.unread_count}
            </span>
          )}
        </button>
      ))}
      <button
        className="mt-2 block w-full rounded border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
        onClick={onAddAddress}
      >
        + Add address
      </button>
    </div>
  );
}
