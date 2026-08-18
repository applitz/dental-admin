"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createMailbox } from "@/lib/api/platform-mail";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type Props = { onClose: () => void; onCreated: () => void };

export function AddAddressModal({ onClose, onCreated }: Props) {
  const t = useTranslations("mail");
  const tc = useTranslations("common");
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
      setError(t("createFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("addAddressTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !localPart}>
            {t("create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("addAddressTitle")} error={error ?? undefined}>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("localPartPlaceholder")}
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
            />
            <span className="shrink-0 text-sm text-slate-500">@vodett.ai</span>
          </div>
        </Field>
        <Input
          placeholder={t("displayNamePlaceholder")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
    </Modal>
  );
}
