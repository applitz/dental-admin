"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Mailbox } from "@/lib/api/platform-mail";
import { cn } from "@/lib/utils";

type Props = {
  mailboxes: Mailbox[];
  selectedId: string | null; // null = unified (all)
  onSelect: (id: string | null) => void;
  onAddAddress: () => void;
};

export function MailboxSwitcher({ mailboxes, selectedId, onSelect, onAddAddress }: Props) {
  const t = useTranslations("mail");
  return (
    <div className="w-56 shrink-0 space-y-1 border-r border-slate-200 bg-slate-50/50 p-2">
      <button
        className={cn(
          "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
          selectedId === null
            ? "bg-dental-50 font-medium text-dental-700"
            : "text-slate-600 hover:bg-slate-100",
        )}
        onClick={() => onSelect(null)}
      >
        {t("allMailboxes")}
      </button>
      {mailboxes.map((mb) => (
        <button
          key={mb.id}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            selectedId === mb.id
              ? "bg-dental-50 font-medium text-dental-700"
              : "text-slate-600 hover:bg-slate-100",
            mb.is_active ? "" : "opacity-50",
          )}
          onClick={() => onSelect(mb.id)}
        >
          <span className="truncate">{mb.address}</span>
          {mb.unread_count > 0 && (
            <span className="ml-2 shrink-0 rounded-full bg-dental-600 px-2 py-0.5 text-xs font-medium text-white">
              {mb.unread_count}
            </span>
          )}
        </button>
      ))}
      <button
        className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={onAddAddress}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("addAddress")}
      </button>
    </div>
  );
}
