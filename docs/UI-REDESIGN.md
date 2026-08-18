# Admin panel UI redesign — migration contract

We are restyling the Vodett admin panel to a clean, consistent, modern-SaaS look
using the shared Vodett blue. **Presentation only — do NOT change any logic.**

## The golden rule: no logic changes

Do **NOT** touch, reorder, or rewrite:
- any import from `@/lib/**` or any call to those functions (API/data/actions),
- `useState` / `useEffect` / `useMemo` / `useCallback` declarations and their deps,
- event-handler bodies and control flow (except the two explicit swaps below),
- component names, props, exported signatures, or the `"use client"` directive,
- `useTranslations(...)` namespaces and the `t("…")` keys already used.

You are only swapping inline markup/classNames for the shared kit and fixing
colors/spacing. If a change would alter behavior, don't make it.

## Design tokens

- Brand/primary = **`dental-*`** (blue). Replace any `admin-*` and any `indigo-*`
  with `dental-*` (e.g. `bg-admin-600` → `bg-dental-600`).
- Danger/destructive/error = **`red-*`**. Replace all `rose-*` with `red-*`.
- Neutrals = `slate-*`. Surfaces are white cards on a `slate-100` page.

## Use the kit (`@/components/ui/*`) — stop hand-rolling these

| Need | Import | Notes |
|------|--------|-------|
| Button | `Button` from `ui/button` | `variant`: `default`(blue) \| `outline` \| `ghost` \| `subtle` \| `destructive`; `size`: `sm\|md\|lg\|icon`. Legacy `primary`/`secondary` still work. Replace every raw `<button>` that styles an action. |
| Text/number input | `Input` from `ui/input` | |
| Multiline | `Textarea` from `ui/textarea` | |
| Dropdown | `Select` from `ui/select` (`size sm\|md\|lg`) | put `<option>`s as children |
| Labeled field | `Field` from `ui/field` (`label`, `hint`, `error`) | wrap inputs to get consistent label + error |
| Card | `Card, CardHeader, CardTitle, CardContent` from `ui/card` | replaces inline `rounded-xl border border-slate-200 bg-white shadow-sm` |
| Table | `TableCard, Table, THead, TBody, Tr, Th, Td` from `ui/table` | wrap `<Table>` in `<TableCard>` for the bordered scroll shell |
| Modal | `Modal` from `ui/modal` (`open,onClose,title,description?,footer?`) | replaces bespoke `createPortal` dialogs |
| Badge/pill | `Badge` from `ui/badge` (`tone: info\|success\|warn\|danger\|muted`) | |
| Status dot | `StatusDot` from `ui/badge` (`tone: success\|warn\|danger\|muted`) | |
| Tabs | `Tabs` (underline) or `ChipTabs` (pills) from `ui/tabs` (`tabs,active,onChange`) | |
| Page title | `PageHeader` from `ui/page-header` (`title, description?, action?, onBack?, backLabel?`) | replaces every hand-written `<h1 class="text-2xl…">` + subtitle |
| Stat tile | `StatCard` from `ui/stat-card` (`label, value, icon?, hint?`) | |
| Empty state | `EmptyState` from `ui/empty-state` (`icon?, title, description?, action?`) | |
| Loading | `Skeleton` from `ui/skeleton` | |

## The only two behavior-adjacent swaps (approved)

1. **`window.confirm(msg)` → styled confirm.** Add `const confirm = useConfirm();`
   (`import { useConfirm } from "@/components/ui/confirm-provider"`). Make the handler
   `async` if needed, then:
   ```ts
   if (!(await confirm({ title: <short title>, message: <the message>, tone: "destructive" }))) return;
   ```
   Keep the exact same guarded action after it. Use `tone: "destructive"` for
   delete/cancel/suspend; omit for neutral confirmations. Prefer an existing `t()`
   key for the message; a short title can reuse the action label.

2. **`window.alert(msg)` → toast.** Add `const toast = useToast();`
   (`import { useToast } from "@/components/ui/toast"`) and call `toast.error(msg)`
   (same message/`t()` key as before).

## Style conventions
- Rounded: cards/tables `rounded-xl`, controls/buttons `rounded-lg`, pills `rounded-full`.
- Card padding `p-5`; section gaps `space-y-6`; form field gaps `space-y-4`/`gap-4`.
- Muted text `text-slate-500`; body `text-slate-700`; headings `text-slate-900`.
- Focus rings come from the kit — don't add your own.

After editing, the file must still compile and behave identically. When unsure whether
something is "logic", leave it exactly as-is and only restyle around it.
