"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  deleteThread,
  getThread,
  listMailboxes,
  listThreads,
  type Mailbox,
  type MailThread,
  type MailThreadDetail,
} from "@/lib/api/platform-mail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm-provider";
import { cn } from "@/lib/utils";
import { AddAddressModal } from "./add-address-modal";
import { ComposeMailModal } from "./compose-mail-modal";
import { MailboxSwitcher } from "./mailbox-switcher";

type ReplyState = { toAddress: string; subject: string | null; inReplyToMessageId: string };

export function MailboxInbox() {
  const t = useTranslations("mail");
  const confirm = useConfirm();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailThreadDetail | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyState, setReplyState] = useState<ReplyState | undefined>(undefined);

  const loadMailboxes = useCallback(() => {
    listMailboxes().then(setMailboxes).catch(() => setMailboxes([]));
  }, []);

  const loadThreads = useCallback(() => {
    listThreads({ mailbox_id: selectedMailbox ?? undefined })
      .then(setThreads)
      .catch(() => setThreads([]));
  }, [selectedMailbox]);

  useEffect(() => {
    loadMailboxes();
  }, [loadMailboxes]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Event-driven refresh (no polling): refetch when the tab regains focus/visibility.
  useEffect(() => {
    const refetch = () => {
      loadMailboxes();
      loadThreads();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadMailboxes, loadThreads]);

  const openThread = useCallback(
    (id: string) => {
      setSelectedThread(id);
      getThread(id)
        .then((d) => {
          setDetail(d);
          loadMailboxes();
          loadThreads();
        })
        .catch(() => setDetail(null));
    },
    [loadMailboxes, loadThreads],
  );

  const removeThread = useCallback(
    async (id: string) => {
      if (
        !(await confirm({
          title: t("deleteConfirmTitle"),
          message: t("deleteConfirm"),
          tone: "destructive",
        }))
      )
        return;
      deleteThread(id)
        .then(() => {
          setThreads((prev) => prev.filter((t) => t.id !== id));
          if (selectedThread === id) {
            setSelectedThread(null);
            setDetail(null);
          }
          loadMailboxes();
        })
        .catch(() => {
          // Reload to resync if the delete failed (e.g. already gone).
          loadThreads();
        });
    },
    [selectedThread, loadMailboxes, loadThreads, confirm, t],
  );

  const currentMailboxId =
    selectedMailbox ?? (detail ? detail.mailbox_id : mailboxes[0]?.id ?? null);

  const startReply = () => {
    if (!detail) return;
    const lastInbound = [...detail.messages].reverse().find((m) => m.direction === "inbound");
    const target = lastInbound ?? detail.messages[detail.messages.length - 1];
    setReplyState({
      toAddress: target ? (target.direction === "inbound" ? target.from_address : target.to_address) : detail.counterparty_address,
      subject: detail.subject,
      inReplyToMessageId: target ? target.id : "",
    });
    setShowCompose(true);
  };

  const startCompose = () => {
    setReplyState(undefined);
    setShowCompose(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <MailboxSwitcher
        mailboxes={mailboxes}
        selectedId={selectedMailbox}
        onSelect={(id) => {
          setSelectedMailbox(id);
          setSelectedThread(null);
          setDetail(null);
        }}
        onAddAddress={() => setShowAdd(true)}
      />

      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-800">{t("inbox")}</span>
          <Button size="sm" onClick={startCompose} disabled={!currentMailboxId}>
            {t("compose")}
          </Button>
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {threads.map((th) => (
            <li key={th.id} className="group relative">
              <button
                className={cn(
                  "block w-full p-3 pr-9 text-left transition-colors hover:bg-slate-50",
                  selectedThread === th.id && "bg-dental-50",
                )}
                onClick={() => openThread(th.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {th.counterparty_address}
                  </span>
                  {th.unread_count > 0 && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-dental-600" />
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {th.subject || t("noSubject")}
                </div>
                <div className="truncate text-xs text-slate-400">{th.last_preview}</div>
              </button>
              <button
                type="button"
                aria-label={t("deleteConversation")}
                title={t("deleteConversation")}
                className="absolute right-2 top-2 hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:block group-hover:block"
                onClick={() => removeThread(th.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">{t("noMessages")}</li>
          )}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">
                {detail.subject || t("noSubject")}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={startReply}>
                  {t("reply")}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => removeThread(detail.id)}>
                  {t("delete")}
                </Button>
              </div>
            </div>
            {detail.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-xl border border-slate-200 p-4",
                  m.direction === "outbound" && "bg-slate-50",
                )}
              >
                <div className="mb-1.5 text-xs text-slate-500">
                  {m.direction === "outbound" ? `${t("to")} ${m.to_address}` : `${t("from")} ${m.from_address}`} ·{" "}
                  {new Date(m.occurred_at).toLocaleString()}
                  {m.status === "failed" && (
                    <span className="ml-2 font-medium text-red-600">{t("failed")}</span>
                  )}
                </div>
                {m.body_html ? (
                  // NOTE: renders remote HTML email. Single-user admin only; sanitize (DOMPurify) before any wider exposure.
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: m.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-slate-700">{m.body_text}</pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Mail} title={t("selectMessage")} className="h-full border-0 shadow-none" />
        )}
      </div>

      {showAdd && (
        <AddAddressModal onClose={() => setShowAdd(false)} onCreated={loadMailboxes} />
      )}
      {showCompose && currentMailboxId && (
        <ComposeMailModal
          mailboxId={currentMailboxId}
          reply={replyState}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            loadThreads();
            if (selectedThread) openThread(selectedThread);
          }}
        />
      )}
    </div>
  );
}
