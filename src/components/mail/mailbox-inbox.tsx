"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteThread,
  getThread,
  listMailboxes,
  listThreads,
  type Mailbox,
  type MailThread,
  type MailThreadDetail,
} from "@/lib/api/platform-mail";
import { AddAddressModal } from "./add-address-modal";
import { ComposeMailModal } from "./compose-mail-modal";
import { MailboxSwitcher } from "./mailbox-switcher";

type ReplyState = { toAddress: string; subject: string | null; inReplyToMessageId: string };

export function MailboxInbox() {
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
    (id: string) => {
      if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
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
    [selectedThread, loadMailboxes, loadThreads],
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-200 bg-white">
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
        <div className="flex items-center justify-between border-b border-slate-200 p-2">
          <span className="text-sm font-medium">Inbox</span>
          <button
            className="rounded bg-admin-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            onClick={startCompose}
            disabled={!currentMailboxId}
          >
            Compose
          </button>
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id} className="group relative">
              <button
                className={`block w-full p-3 pr-9 text-left hover:bg-slate-50 ${
                  selectedThread === t.id ? "bg-slate-100" : ""
                }`}
                onClick={() => openThread(t.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">{t.counterparty_address}</span>
                  {t.unread_count > 0 && <span className="h-2 w-2 rounded-full bg-admin-600" />}
                </div>
                <div className="truncate text-xs text-slate-500">{t.subject || "(no subject)"}</div>
                <div className="truncate text-xs text-slate-400">{t.last_preview}</div>
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                title="Delete conversation"
                className="absolute right-2 top-2 hidden rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:block group-hover:block"
                onClick={() => removeThread(t.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="p-4 text-sm text-slate-500">No messages</li>
          )}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{detail.subject || "(no subject)"}</h2>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                  onClick={startReply}
                >
                  Reply
                </button>
                <button
                  className="rounded border border-rose-200 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => removeThread(detail.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {detail.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded border border-slate-200 p-3 ${m.direction === "outbound" ? "bg-slate-50" : ""}`}
              >
                <div className="mb-1 text-xs text-slate-500">
                  {m.direction === "outbound" ? `To ${m.to_address}` : `From ${m.from_address}`} ·{" "}
                  {new Date(m.occurred_at).toLocaleString()}
                  {m.status === "failed" && <span className="ml-2 text-rose-600">failed</span>}
                </div>
                {m.body_html ? (
                  // NOTE: renders remote HTML email. Single-user admin only; sanitize (DOMPurify) before any wider exposure.
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: m.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm">{m.body_text}</pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">Select a message</div>
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
