"use client";

import { useState } from "react";
import { sendMail, uploadAttachment } from "@/lib/api/platform-mail";

type Props = {
  mailboxId: string;
  reply?: { toAddress: string; subject: string | null; inReplyToMessageId: string };
  onClose: () => void;
  onSent: () => void;
};

export function ComposeMailModal({ mailboxId, reply, onClose, onSent }: Props) {
  const [to, setTo] = useState(reply?.toAddress ?? "");
  const [subject, setSubject] = useState(reply?.subject ? `Re: ${reply.subject}` : "");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const attachmentIds: string[] = [];
      for (const f of files) {
        const up = await uploadAttachment(mailboxId, f);
        attachmentIds.push(up.id);
      }
      await sendMail({
        mailbox_id: mailboxId,
        to_address: to,
        subject: subject || undefined,
        body_text: body,
        in_reply_to_message_id: reply?.inReplyToMessageId,
        attachment_ids: attachmentIds,
      });
      onSent();
      onClose();
    } catch {
      setError("Send failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[calc(100dvh-2rem)] w-[32rem] overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold">{reply ? "Reply" : "Compose"}</h3>
        <input
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={!!reply}
        />
        <input
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="mb-2 h-40 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <input
          type="file"
          multiple
          className="mb-2 text-xs"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded px-3 py-1 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-admin-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            onClick={submit}
            disabled={busy || !to || !body}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
