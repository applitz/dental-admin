"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatAustrianDate, maskAustrianDate, parseAustrianDate } from "@/lib/date-input";

/**
 * Austrian-format (DD.MM.YYYY) date field that can be TYPED or PICKED.
 * `value` / `onChange` use ISO "YYYY-MM-DD" ("" = empty). The calendar button
 * opens the browser's native picker through a hidden date input.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}) {
  const toText = (iso: string) => (iso ? formatAustrianDate(new Date(`${iso}T12:00:00`)) : "");
  const [text, setText] = useState(() => toText(value));
  const [invalid, setInvalid] = useState(false);
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(toText(value));
    setInvalid(false);
  }, [value]);

  function inRange(iso: string) {
    return (!min || iso >= min) && (!max || iso <= max);
  }

  function commit(raw: string, final: boolean) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setInvalid(false);
      if (final && value) onChange("");
      return;
    }
    const iso = parseAustrianDate(trimmed);
    if (iso && inRange(iso)) {
      setInvalid(false);
      if (iso !== value) onChange(iso);
      return;
    }
    if (final) {
      setText(toText(value));
      setInvalid(false);
    } else {
      setInvalid(trimmed.length >= 10);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        disabled={disabled}
        value={text}
        placeholder="DD.MM.YYYY"
        aria-invalid={invalid || undefined}
        className={cn("pr-10", invalid && "border-red-400")}
        onChange={(e) => {
          const next = maskAustrianDate(e.target.value, text);
          setText(next);
          commit(next, false);
        }}
        onBlur={() => commit(text, true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text, true);
          }
        }}
      />
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        aria-label="Open calendar"
        onClick={() => {
          const el = nativeRef.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed"
      >
        <CalendarIcon className="h-4 w-4" aria-hidden />
      </button>
      {/* Hidden native input: only used to render the calendar popup. */}
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
