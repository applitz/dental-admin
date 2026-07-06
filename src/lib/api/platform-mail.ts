import { apiFetch } from "../api";

export type Mailbox = {
  id: string;
  address: string;
  display_name: string | null;
  is_active: boolean;
  unread_count: number;
};

export type MailThread = {
  id: string;
  mailbox_id: string;
  subject: string | null;
  counterparty_address: string;
  last_message_at: string;
  last_preview: string;
  unread_count: number;
};

export type MailMessage = {
  id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_address: string;
  subject: string | null;
  body_html: string | null;
  body_text: string;
  status: string;
  error_message: string | null;
  occurred_at: string;
  attachment_ids: string[];
};

export type MailThreadDetail = {
  id: string;
  mailbox_id: string;
  subject: string | null;
  counterparty_address: string;
  messages: MailMessage[];
};

const BASE = "/api/v1/platform/mail";

export function listMailboxes(): Promise<Mailbox[]> {
  return apiFetch(`${BASE}/mailboxes`);
}

export function createMailbox(body: { local_part: string; display_name?: string }): Promise<Mailbox> {
  return apiFetch(`${BASE}/mailboxes`, { method: "POST", body: JSON.stringify(body) });
}

export function updateMailbox(
  id: string,
  body: { display_name?: string; is_active?: boolean },
): Promise<Mailbox> {
  return apiFetch(`${BASE}/mailboxes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function listThreads(params?: { mailbox_id?: string; unread_only?: boolean }): Promise<MailThread[]> {
  const q = new URLSearchParams();
  if (params?.mailbox_id) q.set("mailbox_id", params.mailbox_id);
  if (params?.unread_only) q.set("unread_only", "true");
  const query = q.toString();
  return apiFetch(`${BASE}/threads${query ? `?${query}` : ""}`);
}

export function getThread(threadId: string): Promise<MailThreadDetail> {
  return apiFetch(`${BASE}/threads/${threadId}`);
}

export function markThreadRead(threadId: string): Promise<{ ok: boolean }> {
  return apiFetch(`${BASE}/threads/${threadId}/read`, { method: "POST" });
}

export function sendMail(body: {
  mailbox_id: string;
  to_address: string;
  subject?: string;
  body_html?: string;
  body_text: string;
  in_reply_to_message_id?: string;
  attachment_ids?: string[];
}): Promise<MailMessage> {
  return apiFetch(`${BASE}/send`, { method: "POST", body: JSON.stringify(body) });
}

export function uploadAttachment(mailboxId: string, file: File): Promise<{ id: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`${BASE}/attachments?mailbox_id=${mailboxId}`, { method: "POST", body: fd });
}

export function unreadCount(): Promise<{ unread_count: number }> {
  return apiFetch(`${BASE}/unread-count`);
}
