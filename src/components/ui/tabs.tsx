"use client";

import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string };

/** Underline tab bar — the standard section switcher (settings, tenant detail). */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-1 border-b border-slate-200", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none",
              isActive
                ? "border-dental-600 text-dental-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pill/segmented tabs — for compact inline filters. */
export function ChipTabs({
  tabs,
  active,
  onChange,
  className,
  size = "md",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full flex-wrap gap-2", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-600/35 focus-visible:ring-offset-1",
              size === "sm" ? "px-4 py-1.5 text-xs" : "px-5 py-2 text-sm",
              isActive
                ? "bg-dental-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
