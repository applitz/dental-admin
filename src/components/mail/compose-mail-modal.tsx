"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendMail, uploadAttachment } from "@/lib/api/platform-mail";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  mailboxId: string;
  reply?: { toAddress: string; subject: string | null; inReplyToMessageId: string };
  onClose: () => void;
  onSent: () => void;
};

export function ComposeMailModal({ mailboxId, reply, onClose, onSent }: Props) {
  const t = useTranslations("mail");
  const tc = useTranslations("common");
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
      setError(t("sendFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={reply ? t("reply") : t("compose")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !to || !body}>
            {t("send")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("to")}>
          <Input
            placeholder={t("toPlaceholder")}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={!!reply}
          />
        </Field>
        <Field label={t("subjectPlaceholder")}>
          <Input
            placeholder={t("subjectPlaceholder")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label={t("messagePlaceholder")} error={error ?? undefined}>
          <Textarea
            className="min-h-[10rem]"
            placeholder={t("messagePlaceholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <input
          type="file"
          multiple
          className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </div>
    </Modal>
  );
}
