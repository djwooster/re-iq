# Design system

A quiet, dense, data-first UI for operational dashboards. Neutral surfaces, one ink color
at stepped opacity, color reserved for state and data. Built on Next.js App Router,
React 19, Tailwind CSS v4, Motion (`motion/react`), Recharts, and `lucide-react` icons.

This document describes what is implemented in code. Where a value appears here, it is
copied from source; if they ever disagree, the code wins and this file should be updated.

---

## 1. Principles

- **Neutral by default.** Backgrounds, borders, and text are grayscale. Hierarchy comes from
  opacity and size, not hue.
- **Color means something.** Green / red / amber only for state (good / bad / needs attention).
  Cyan only for data visualization and data highlights. Nothing is colored for decoration.
- **Color is never the only cue.** Signed numbers always print their sign; badges carry a
  word; variance can append "fav" / "unfav".
- **Flat.** Cards have a 1px border and no shadow. Only floating layers (drawers, modals,
  menus, toasts, tooltips) get a shadow.
- **Small type, tabular numbers.** 12px body. Every number that can be compared sits in a
  monospaced, tabular-figure face so columns align.
- **Calm motion.** Fade and a short rise. No springs, no bounce, no spinners.
- **Tokens only.** Components reference semantic tokens through Tailwind; no hex values in
  components. (The only literal colors outside `globals.css` are the `<meta theme-color>`
  values in the root layout and `text-white` / `dark:text-black` on the danger button.)

---

## 2. Color tokens

Defined as CSS variables in `app/globals.css`. Light values sit on `:root`, dark values on
`.dark` (a class on `<html>`). Each is mapped into Tailwind via `@theme inline`, so the
Tailwind name is what components use.

| CSS variable        | Tailwind name                 | Light                                  | Dark                                   | Use |
|---------------------|-------------------------------|----------------------------------------|----------------------------------------|-----|
| `--bg`              | `bg`                          | `#ffffff`                              | `#0a0a0b`                              | Page background, sidebar, inputs, drawers, modals |
| `--surface`         | `surface`                     | `#fafafa`                              | `#111113`                              | Cards, secondary buttons |
| `--surface-2`       | `surface-2`                   | `#f4f4f5`                              | `#18181b`                              | Hover fill on buttons / icon buttons |
| `--border`          | `border`                      | `#e5e5e5`                              | `rgb(255 255 255 / 0.08)`              | Every default border (applied globally to `*`) |
| `--border-strong`   | `border-strong`               | `#c9c9cc`                              | `rgb(255 255 255 / 0.2)`               | Hover borders, chart cursor, zero lines, dashed drop zones |
| `--text-primary`    | `fg`                          | `#0a0a0a`                              | `#ffffff`                              | Headings, values, active items |
| `--text-secondary`  | `fg-2`                        | `rgb(10 10 10 / 0.72)`                 | `rgb(255 255 255 / 0.7)`               | Body copy, inactive nav, labels |
| `--text-muted`      | `fg-3`                        | `rgb(10 10 10 / 0.6)`                  | `rgb(255 255 255 / 0.5)`               | Captions, hints, eyebrows, axis ticks |
| `--favorable`       | `favorable`                   | `#15803d`                              | `#4ade80`                              | Good state, positive impact |
| `--unfavorable`     | `unfavorable`                 | `#b91c1c`                              | `#f87171`                              | Bad state, negative impact, destructive actions |
| `--warning`         | `warning`                     | `#b45309`                              | `#fbbf24`                              | Needs attention, late, low confidence |
| `--data`            | `data`                        | `#0e7490`                              | `#22d3ee`                              | Chart series, data highlights |
| `--data-soft`       | `data-soft`                   | `rgb(14 116 144 / 0.14)`               | `rgb(34 211 238 / 0.16)`               | Text selection, highlighted inline text |
| `--inverted`        | `inverted`                    | `#0a0a0a`                              | `#ffffff`                              | Primary button, toasts, chart tooltips |
| `--inverted-text`   | `inverted-fg`                 | `#ffffff`                              | `#0a0a0a`                              | Text on `inverted` |
| `--inverted-muted`  | `inverted-muted`              | `rgb(255 255 255 / 0.62)`              | `rgb(10 10 10 / 0.6)`                  | Secondary text on `inverted` |
| `--backdrop`        | `backdrop`                    | `rgb(10 10 10 / 0.18)`                 | `rgb(0 0 0 / 0.5)`                     | Scrim behind drawers / modals / mobile nav |
| `--overlay-shadow`  | `shadow-overlay`              | `0 12px 40px -12px rgb(0 0 0 / 0.18), 0 2px 8px -2px rgb(0 0 0 / 0.06)` | `0 16px 48px -12px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06)` | Floating layers only |

Each theme also sets `color-scheme` (`light` / `dark`) so native controls and scrollbars match.

**Text steps are one ink at three opacities.** `fg-3` is tuned per theme (0.6 light,
0.5 dark) to stay at WCAG AA contrast on `surface`.

**Opacity tints of `fg` for neutral fills.** Rather than more gray tokens, neutral fills
use the ink color at low alpha, which works in both themes:

| Class              | Use |
|--------------------|-----|
| `bg-fg/[0.025]`    | Clickable table row hover |
| `bg-fg/[0.03]`     | Nav / list / chart-row hover |
| `bg-fg/[0.035]`    | Drop zone while dragging |
| `bg-fg/[0.04]`     | Selected row, focused row, menu item hover |
| `bg-fg/[0.06]`     | Active nav item, neutral badge, skeleton |
| `bg-fg/10`         | Progress / meter track |
| `border-border/70` | Row dividers inside a card (softer than the card edge) |

State colors follow the same pattern at fixed alphas: `/10` fill, `/20` border (`/25` for
warning), `/80` for solid bars.

Also in `globals.css`:

- `::selection` uses `--data-soft`.
- `:focus-visible` is a `1px solid var(--text-secondary)` outline, offset 2px.
- `* { border-color: var(--border) }`, so a bare `border` class is always the token color.

---

## 3. Typography

**Fonts.** Geist Sans for UI, Geist Mono for numbers, loaded with `next/font/google` and
exposed as `--font-geist-sans` / `--font-geist-mono`, then mapped to Tailwind's
`--font-sans` / `--font-mono`. Body falls back to `ui-sans-serif, system-ui, sans-serif`.

**Base.** `body` is `12px / 1.5`, antialiased, `color: var(--text-primary)`.

**Scale (as used).**

| Size   | Class           | Weight     | Use |
|--------|-----------------|------------|-----|
| 9px    | `text-[9px]`    | —          | Inline "Estimate"-style tags only |
| 10px   | `text-[10px]` / `text-2xs` | medium for badges | Eyebrows, badges, table headers, axis ticks, counts |
| 11px   | `text-[11px]`   | normal / medium | Captions, hints, sub-labels, field labels, card footers, xs buttons, segmented options |
| 12px   | `text-xs`       | normal / medium | Body, table cells, nav items, sm buttons, inputs |
| 13px   | `text-[13px]`   | semibold   | Card titles, empty-state titles, evidence values, product wordmark; 13px/1.7 for long-form summary prose |
| 14px   | `text-sm`       | semibold   | Drawer and modal titles |
| 15px   | `text-[15px]`   | semibold   | Page titles (`h1`), auth page titles |
| 20px   | `text-xl`       | medium, `tracking-tight`, `leading-6` | Headline metric values |

`text-2xs` (10px / 14px line height) is registered as a theme token.

Weights: `font-medium` (500) for interactive labels and values, `font-semibold` (600) for
headings. Nothing heavier.

**Utilities** (defined with `@utility` in `globals.css`):

```css
.num     { font-family: Geist Mono; font-variant-numeric: tabular-nums; }
.eyebrow { font-family: Geist Mono; font-size: 10px; line-height: 14px;
           letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
```

**Where mono (`num`) is used:**

- Every metric value and every number in a table cell (`<Td mono>`).
- Signed variances, percentage-point deltas, confidence percentages.
- Eyebrow labels: section labels, table headers, metric labels, sidebar group labels.
- Counts next to tabs and nav items.
- Segmented-control options (period codes like MTD / QTD).
- File names, import/source labels, "data through" timestamps.
- Chart axis ticks and tooltip headers.
- Avatar initials and the product wordmark (`num text-[13px] font-semibold tracking-[0.06em]`).

Prose, headings, buttons, and form labels stay in sans.

---

## 4. Spacing, radius, borders

**Spacing.** Tailwind's 4px scale; most common values:

- Gaps: `gap-3` (12px) between cards and stacked sections; `gap-2` / `gap-1.5` inside rows;
  `gap-4` between columns in a two-column grid.
- Card padding: `px-4` horizontal everywhere; `pt-4 pb-3` for card headers, `py-3.5` for
  metric cells, `py-2.5` for card footers.
- Page padding: `px-4 py-5`, `md:px-6`.
- Page width: `max-w-[1400px]` default, `max-w-[720px]` for narrow pages (settings, forms).
- Auth column: `max-w-[340px]`, offset `pt-[14vh]`.

**Heights (fixed rhythm).**

| Height | Use |
|--------|-----|
| `h-12` (48px) | Page header min height, sidebar brand row, auth header |
| `h-9` (36px)  | Table body rows |
| `h-8` (32px)  | Table header rows, inputs, default selects, variance bar rows |
| `h-7` (28px)  | Nav items, menu items, dense selects, compact bar rows |
| `h-[18px]`    | Badges |
| `h-0.5`       | Progress line |

**Radius.**

| Class          | Use |
|----------------|-----|
| `rounded-lg`   | Cards, modals, toasts, upload zone |
| `rounded-md`   | Buttons, inputs, selects, nav items, menus, tooltips, segmented track, empty-state icon tile |
| `rounded-[5px]`| Segmented options (nests inside `rounded-md` with `p-0.5`) |
| `rounded`      | Menu items, list hover rows |
| `rounded-[3px]`| Chart bars |
| `rounded-full` | Badges, dots, avatars, progress tracks |

Drawers are square (they're flush to the viewport edge).

**Borders.**

- Always 1px, always a token (`border-border`, or `border-border-strong` on hover).
- Cards: `border border-border`. Dividers inside a card: `border-t border-border`;
  between rows in a list: `border-border/70`.
- Dashed borders mark drop targets and demo / placeholder notices
  (`border-dashed border-border-strong/70`, `border-dashed border-border`).
- Grid-of-cells pattern: put `gap-px` on a container with `bg-border` and give each cell
  `bg-surface`; the gaps render as hairlines.
- Metric strips: one `Card` with a grid inside; cells divided by `border-l` / `border-t`
  computed per breakpoint, not by separate cards.

**Shadows.** Only `shadow-overlay`, only on floating layers. Never on cards.

**Z-index.** Page header `z-30`; sidebar and backdrops `z-40`; drawers, modals, mobile nav
`z-50`; toasts `z-[60]`.

---

## 5. Components

All primitives live in `components/ui`. Shell components live in `components/shell`.
`cn()` (`lib/cn.ts`) joins class names; it does not merge conflicting Tailwind classes, so
pass overrides that don't collide.

### App shell — `components/shell/app-shell.tsx`

Fixed 220px sidebar on `md+`, content offset with `md:pl-[220px]`. Below `md`, the sidebar
becomes a slide-in sheet (`x: -24 → 0`, 0.2s ease-out) over a `bg-backdrop
backdrop-blur-[2px]` scrim, closed by Escape, scrim click, or route change. Exposes
`useMobileNav()` so the page header can open it. Wraps children in the app's providers
(toasts, etc.). The sidebar is rendered inside `<Suspense>` with a static `SidebarFrame`
fallback because it reads `usePathname()`.

### Sidebar — `components/shell/sidebar.tsx`

- Frame: `w-[220px] h-full flex flex-col border-r border-border bg-bg`.
- Brand row: `h-12 px-4`, wordmark `num text-[13px] font-semibold tracking-[0.06em] text-fg`.
- Groups: `eyebrow px-2 pb-1.5` label, `mb-4` between groups, items `gap-px`.
- Item: `h-7 px-2 gap-2 rounded-md text-xs`, icon `size-3.5 strokeWidth={1.75}`.
  - Active: `bg-fg/[0.06] font-medium text-fg`, icon `text-fg`, `aria-current="page"`.
  - Idle: `text-fg-2 hover:bg-fg/[0.03] hover:text-fg`, icon `text-fg-3`.
  - Trailing indicator: a mono count (`num text-[10px] text-fg-3`) or a `Dot` for state.
- Account footer: `border-t p-2`; 24px round initials avatar; name `text-xs font-medium`,
  org `text-[11px] text-fg-3`; opens an upward menu (`rounded-md border bg-bg p-1
  shadow-overlay`, items `h-7 rounded px-2 text-xs text-fg-2 hover:bg-fg/[0.04]`).

Use for primary navigation only. Nav config is a typed array of groups; active state uses
exact match for the root route and prefix match elsewhere.

### Page header and body — `components/shell/page-header.tsx`

- `PageHeader({ title, subtitle?, actions? })`: sticky (`top-0 z-30`), `border-b`,
  translucent `bg-bg/85 backdrop-blur-md`. Inner row `min-h-12 max-w-[1400px] px-4 py-2.5
  md:px-6`, wraps on small screens. Title `text-[15px] leading-5 font-semibold`, subtitle
  `text-[11px] text-fg-3`, both truncated. Hamburger shows below `md`.
- `PageBody({ narrow? })`: centered column, `px-4 py-5 md:px-6`, 1400px or 720px wide.

Every page is `PageHeader` + `PageBody`. Subtitle states what the page answers in one line.
Page-level actions (primary buttons, period selector) go in `actions`.

### Card — `components/ui/card.tsx`

- `Card`: `rounded-lg border border-border bg-surface`. No padding of its own; content
  sets its own `px-4`.
- `CardHeader({ title, eyebrow?, description?, action? })`: `px-4 pt-4 pb-3`; optional
  eyebrow above, title `text-[13px] font-semibold leading-5`, description `text-xs
  text-fg-3`; `action` slot right-aligned.
- `CardFooter`: `border-t px-4 py-2.5 text-[11px] text-fg-3`. Use for freshness notes,
  sources, "view all" links.

Use a card for any grouped block of content. Stack cards with `gap-3`. Don't nest cards;
use a bordered inner list or the `gap-px` cell grid instead.

### Metric — `components/ui/metric.tsx`

- `Metric({ label, value, format, sub?, hint? })`: `px-4 py-3.5 gap-1.5`; `eyebrow` label;
  value `num text-xl leading-6 font-medium tracking-tight` rendered with `AnimatedNumber`
  (tweens 0.6s ease-out between values, skipped under reduced motion); `sub` line
  `text-[11px] text-fg-3`; `hint` goes to `title`.
  Lay out 2–4 metrics inside one `Card` as a grid (`grid-cols-2 lg:grid-cols-4`) with
  border dividers between cells.
- `toneFor(amount, epsilon)`: returns `text-favorable` / `text-unfavorable` / `text-fg-3`
  based on the sign of a favorability-adjusted amount. Use for any signed delta.
- `Variance({ value, short?, label? })`: signed currency in `num`, colored by sign; positive
  always means good. `label` appends "fav" / "unfav" at 10px for places where color would
  otherwise carry the meaning alone.
- `PointsDelta({ delta, higherIsBetter })`: signed percentage-point change (`+1.2 pts`),
  colored by whether the direction is good for that metric.
- `ConfidenceIndicator({ value, threshold = 0.75 })`: 24×4px meter plus a 10px mono percent;
  turns `warning` below the threshold.

### Table — `components/ui/table.tsx`

- `Table`: horizontal-scroll wrapper, `w-full border-collapse text-xs`.
- `THead`: one row with `border-b`.
- `Th({ align, sortKey?, sort?, onSort? })`: `eyebrow h-8 px-3 font-normal`, first cell
  `pl-4`, last `pr-4` (aligns with card padding). Sortable headers are buttons; the arrow
  is hidden until hover (`opacity-0 group-hover:opacity-60`) and solid when active;
  `aria-sort` set.
- `Tr({ onClick?, selected? })`: `border-b border-border/70`, no border on the last row.
  Clickable rows get `cursor-pointer hover:bg-fg/[0.025]`, keyboard focus (Enter / Space),
  and `focus-visible:bg-fg/[0.04]`. Selected: `bg-fg/[0.04]`.
- `Td({ align, mono? })`: `h-9 px-3 whitespace-nowrap`, same edge padding as `Th`.
  `mono` applies `num`. Right-align every numeric column.
- `useSort(rows, accessors, initial)`: client-side sort; numeric columns sort descending on
  first click, text ascending.

Tables sit directly inside a `Card` (usually under a `CardHeader`), never in their own box.
Numbers are full precision in tables, abbreviated in summaries (see §8).

### Badge and Dot — `components/ui/badge.tsx`

`Badge({ tone, dot? })`: `inline-flex h-[18px] rounded-full border px-1.5 text-[10px]
font-medium leading-none whitespace-nowrap`. Optional leading 6px dot in `currentColor`.

| Tone          | Classes |
|---------------|---------|
| `neutral`     | `text-fg-2 bg-fg/[0.06] border-fg/10` |
| `muted`       | `text-fg-3 bg-transparent border-border` |
| `favorable`   | `text-favorable bg-favorable/10 border-favorable/20` |
| `unfavorable` | `text-unfavorable bg-unfavorable/10 border-unfavorable/20` |
| `warning`     | `text-warning bg-warning/10 border-warning/25` |
| `data`        | `text-data bg-data/10 border-data/20` |

Use for status and short categorical labels (one or two words). Use `muted` for neutral
metadata (role, type) and state tones only for actual state. `Dot({ tone })` is the same
palette as a bare 6px circle, for compact indicators (nav items, list rows).

### Buttons and controls — `components/ui/button.tsx`, `controls.tsx`

`Button({ variant, size, icon?, loading? })`, base `rounded-md font-medium`, transitions on
background / border / opacity / color at 150ms ease-out, disabled at 50% opacity.

| Variant     | Classes |
|-------------|---------|
| `primary`   | `bg-inverted text-inverted-fg hover:opacity-90` |
| `secondary` (default) | `bg-surface text-fg border-border hover:border-border-strong hover:bg-surface-2` |
| `ghost`     | `text-fg-2 hover:text-fg hover:bg-surface-2` |
| `danger`    | `bg-unfavorable text-white dark:text-black hover:opacity-90` |

Sizes: `sm` (default) `px-3 py-1.5 text-xs`; `xs` `px-2 py-1 text-[11px]`. `loading` keeps
the label's width (label goes `invisible`) and overlays an indeterminate `Progress` line
instead of a spinner. One primary button per view region.

Fields share one class string: `rounded-md border border-border bg-bg text-xs text-fg`,
`placeholder:text-fg-3`, `hover:border-border-strong`, `focus:border-fg-3
focus:outline-none`.

- `Input`: `h-8 px-2.5`.
- `Select({ dense? })`: native select, `appearance-none`, chevron icon overlaid; `h-8` or
  `h-7 text-[11px]` when dense.
- `Field({ label, hint?, children: (id) => … })`: label `text-[11px] font-medium text-fg-2`,
  hint `text-[11px] text-fg-3`, `gap-1.5`. The render prop passes a generated `id`.
- `Segmented({ value, onChange, options, label })`: radiogroup. Track `rounded-md border
  bg-surface p-0.5`; options `num px-2.5 py-1 text-[11px] font-medium`; active pill
  `rounded-[5px] border bg-bg` slides between options via a shared `layoutId` (0.2s
  ease-out). Use for 2–5 mutually exclusive view modes (period, theme).
- `Tabs({ value, onChange, tabs })`: underline tabs, `gap-4 border-b`, labels `text-xs
  font-medium pb-2`, optional mono count; active indicator is a 1px `bg-fg` line that
  slides via `layoutId`. Use to switch between sibling panels within a page.

### Drawer — `components/ui/overlay.tsx`

`Drawer({ open, onClose, title, eyebrow?, actions?, footer?, width = 400 })`.

- Panel: `fixed inset-y-0 right-0 z-50 flex flex-col border-l bg-bg shadow-overlay`,
  `max-w-[100vw]`.
- Header: `border-b px-4 py-3`, optional eyebrow, title `text-sm font-semibold`, actions
  slot, close icon button (`p-1 rounded-md text-fg-3 hover:bg-surface-2`).
- Body scrolls (`flex-1 overflow-y-auto`); optional footer `border-t px-4 py-3`,
  right-aligned buttons.
- Enters from the right: `x: 24, opacity: 0 → 0, 1`, 0.25s, ease `[0.16, 1, 0.3, 1]`.

Use for detail on a selected row or item ("show me the evidence") while keeping the list
visible behind it.

### Modal — `components/ui/overlay.tsx`

`Modal({ open, onClose, title, description?, footer?, width = 440 })`.

- Positioned at `pt-[12vh]`, centered, scrollable container with `p-4`.
- Panel: `rounded-lg border bg-bg shadow-overlay`, `max-w-full`.
- Header `px-4 pt-4`, title `text-sm font-semibold`, description `text-xs text-fg-2`.
  Body `px-4 pt-3 pb-4`. Footer `border-t px-4 py-3`, right-aligned.
- Enters with `y: 8 → 0`, opacity, 0.2s ease-out.

Use for short, blocking tasks: confirm, invite, a small form. Anything that needs scrolling
or reference to the page behind it is a drawer.

**Shared overlay behavior:** rendered through a portal only after hydration
(`useSyncExternalStore` returning false on the server), `role="dialog" aria-modal`,
`aria-labelledby` on the title, Escape closes, backdrop click closes, body scroll locked,
focus moves to the panel on open and returns to the previously focused element on close.
Backdrop: `fixed inset-0 z-40 bg-backdrop backdrop-blur-[2px]`, fades 0.2s ease-out.

### Toast — `components/ui/toast.tsx`

`ToastProvider` + `useToast()(message, { detail?, tone? })`.

- Stack: `fixed right-4 bottom-4 z-[60] w-[320px] gap-2`, `role="status" aria-live="polite"`.
- Toast: `rounded-lg bg-inverted px-3 py-2.5 text-inverted-fg shadow-overlay`; icon
  `size-3.5` (check for `success`, triangle for `warning`); message `text-xs font-medium`,
  detail `text-[11px] text-inverted-muted`.
- Max 3 visible (oldest dropped), auto-dismiss after 3s. Enters `y: 8 → 0` 0.25s ease-out,
  exits by fading 0.15s; siblings reflow with `layout`.

Use to confirm a completed action. Never for errors that need a decision; those belong
inline or in a modal.

### Empty state and skeleton — `components/ui/empty-state.tsx`

- `EmptyState({ icon?, title, description?, action? })`: centered, `px-6 py-14`; icon in a
  32px `rounded-md border bg-surface text-fg-3` tile; title `text-[13px] font-semibold`;
  description `max-w-sm text-xs text-fg-3`; actions `mt-4`. Put it inside the card whose
  content is missing. Copy says what's missing and what to do about it.
- `Skeleton`: `animate-pulse rounded bg-fg/[0.06]`. Size it to the content it replaces
  (e.g. three lines at 100% / 92% / 70%) so nothing shifts when data arrives.

### Progress — `components/ui/progress.tsx`

A 2px line (`h-0.5 rounded-full bg-fg/10`). Determinate fill `bg-fg/80` animates width
0.5s ease-out. Indeterminate: a one-third-width bar `bg-fg/70` sweeping across every 1.4s
with ease-out. This is the only loading indicator; there are no spinners.

### Upload zone — `components/data-sources/upload-zone.tsx`

Built on `react-dropzone` with `noClick` (an explicit button opens the picker).

- Frame: `rounded-lg border border-dashed`, `px-6 py-10` (or `px-4 py-6` compact),
  transition on background and border 200ms ease-out.
- Idle: `border-border-strong/70 bg-transparent`, icon `text-fg-3`.
  Dragging: `border-fg-3 bg-fg/[0.035]`, icon `text-fg`, copy changes to "Drop to upload".
- Content: upload icon `size-5 strokeWidth={1.5}`, headline `text-xs text-fg`, accepted
  formats `text-[11px] text-fg-3`, then a secondary-style "Choose files" button.
- Rejected files are passed through with the accepted ones so the flow can explain the
  rejection instead of silently dropping them.

Copy and accepted MIME types are app-specific; the frame and states are the reusable part.

### Charts — `components/charts/*`

Recharts, styled entirely with CSS variables so charts follow the theme with no re-render.

- **One axis.** Y axis on the left only, no axis lines, no tick lines, `tickCount={4}`,
  `width={52}`. X axis ticks every month, `minTickGap={16}`, `dy={6}`.
- **Ticks:** `fill: var(--text-muted)`, `fontSize: 10`, `fontFamily: var(--font-geist-mono)`.
- **Grid:** horizontal only (`vertical={false}`), `stroke: var(--border)`.
- **Series styles:**
  - `data`: `var(--data)`, 2px solid — the primary / actual series.
  - `data-secondary`: `var(--data)`, 2px, dash `2 3` — a second series in the same family.
  - `reference`: `var(--text-muted)`, 1.5px, dash `4 4` — budget / target / comparison.
  - Lines `type="monotone"`, no dots; active dot r=4, fill `var(--data)`, 2px
    `var(--surface)` ring; none on reference lines. Gaps are not connected.
  - Draw-in animation 500ms ease-out.
- **Legend:** custom, not Recharts'. A row of `text-[11px] text-fg-2` labels, each with a
  14×6 SVG line sample drawn with the series' exact stroke and dash.
- **Tooltip:** inverted. `rounded-md bg-inverted px-2.5 py-2 text-inverted-fg
  shadow-overlay min-w-[160px]`; header in mono 10px uppercase `text-inverted-muted`;
  rows `text-[11px]` label left (muted), mono value right; optional footnote below a
  `border-inverted-fg/15` rule. Tooltip animation off. Cursor is a 1px `var(--border-strong)`
  line.
- **Accessibility:** the chart container is `role="img"` with an `aria-label` naming the
  series. Recharts' default focus outlines are removed in `globals.css`.
- **Diverging bars** (`variance-bars.tsx`): not Recharts. CSS grid row
  `[label 9rem] [bar 1fr] [value 5.5rem]`; a 1px `bg-border-strong` zero line at center;
  negative bars extend left in `bg-unfavorable/80`, positive right in `bg-favorable/80`,
  `rounded-[3px]`, `h-3`; widths animate 0.5s ease-out with 0.03s per-row stagger. The
  signed value is always printed beside the bar.

Charts sit in a `Card` with a `CardHeader` whose `action` slot holds the legend.

---

## 6. Motion

Library: Motion (`motion/react`). Primitives in `components/ui/motion.tsx`.

| What | Values |
|------|--------|
| Entrance (`FadeIn`) | `opacity 0→1`, `y 8→0`, 0.3s `easeOut`, optional `delay` |
| List entrance (`Stagger` / `StaggerItem`) | same as entrance, children staggered 0.05s |
| Stacked cards on a page | `FadeIn` with `delay` 0, 0.05, 0.1… |
| Number change (`AnimatedNumber`) | tween 0.6s `easeOut`, writes to DOM directly; skipped on first render and under `prefers-reduced-motion` |
| Segmented / tab indicator | shared `layoutId`, 0.2s `easeOut` |
| Expand / collapse | `height 0→auto` + opacity, 0.25s `easeOut` |
| Drawer | `x 24→0` + opacity, 0.25s, cubic-bezier `[0.16, 1, 0.3, 1]` |
| Modal | `y 8→0` + opacity, 0.2s `easeOut` |
| Mobile nav | `x -24→0` + opacity, 0.2s `easeOut` |
| Backdrop | opacity, 0.2s `easeOut` |
| Toast | in `y 8→0` 0.25s `easeOut`; out opacity 0.15s |
| Progress (determinate) | width 0.5s `easeOut` |
| Progress (indeterminate) | sweep 1.4s `easeOut`, repeating |
| Chart lines / bars | 0.5s ease-out; bars staggered 0.03s |
| Hover color/border transitions | 100–150ms (`duration-100` on nav/rows, `duration-150` on buttons/fields) |

No springs, no bounce, no scale-up entrances, no spinners. Hover feedback is color or fill
only, never movement.

---

## 7. Theme provider (no flash)

Files: `components/theme/theme-provider.tsx`, `components/theme/inline-script.tsx`,
`app/layout.tsx`, the `.theme-switching` rule in `app/globals.css`. No `next-themes`
(it is still listed in `package.json` but unused; React 19 warns about its script tag).

1. **Before first paint.** `themeScript` is a tiny dependency-free IIFE rendered in
   `<head>`. It reads the stored preference (`dark` / `system`; missing = `light`, the
   default), resolves `system` with `matchMedia("(prefers-color-scheme: dark)")`, toggles `.dark` on
   `<html>`, and sets `style.colorScheme`. Wrapped in `try/catch` so blocked storage falls
   back to light silently.
2. **InlineScript.** Renders the script with `type="text/javascript"` on the server and
   `type="text/plain"` on the client, with `suppressHydrationWarning`. The browser runs it
   once during HTML parsing; on the client React sees an inert script and doesn't warn.
3. **`<html suppressHydrationWarning>`** because the class is changed before hydration.
4. **ThemeProvider** (client) exposes `{ preference, resolved, setPreference }` via
   `useTheme()`. State is read with `useSyncExternalStore` from `localStorage` and from
   the `<html>` class (server snapshot: `light` / `light`), so there's no effect-driven
   re-render and no mismatch.
5. **Applying a change** adds `.theme-switching` to `<html>`, toggles `.dark`, sets
   `colorScheme`, then removes the class on the next tick. `.theme-switching *` sets
   `transition: none !important` so hover/color transitions don't animate the swap.
6. **Light is the default.** Choosing `light` removes the storage key; `dark` and `system`
   are stored. A first-time visitor gets light regardless of OS setting.
7. **Live updates.** Listens to the OS `prefers-color-scheme` change (applies only when the
   preference is `system`) and to `storage` events (syncs other tabs).
8. **Browser chrome.** `viewport.themeColor` in the root layout is `#ffffff`, matching the
   default light `--bg`.
9. **Tailwind dark variant** is bound to the class:
   `@custom-variant dark (&:where(.dark, .dark *));`. Because colors are tokens, `dark:`
   is almost never needed in components.

**Dark-mode prompt** (`components/theme/dark-mode-prompt.tsx`, mounted in the app shell):
if the OS prefers dark and the user has never been asked or picked a theme, a `Modal`
offers Keep light / Match my computer / Use dark. Any choice, or closing it, sets
`THEME_PROMPT_KEY` so it never shows again; picking a theme in Settings sets it too.

The UI control is a `Segmented` with Light / Dark / System. Change `STORAGE_KEY` when
reusing.

---

## 8. Conventions not obvious from the tokens

Rules the implementation follows consistently, beyond the token and component specs above.

**Layout and structure**

- Every page is `PageHeader` + `PageBody`; cards stacked with `gap-3`; multi-column grids
  collapse to one column below `md` / `lg`.
- Horizontal padding is 16px (`px-4`) at every level: card headers, table edge cells,
  metric cells, drawer and modal sections. Content aligns down the page.
- Groups of related numbers live in one card divided by hairlines, not in separate cards.
- Pages hold no logic; a page renders a `*-view.tsx` client component that loads data and
  composes primitives.
- Client components that read the pathname or search params sit under `<Suspense>` with a
  static fallback of the same size.

**Interaction and accessibility**

- Global `cursor: pointer` on buttons, links, selects, summaries, labels with `for`,
  checkboxes, radios; `not-allowed` on disabled buttons.
- Focus ring is a single 1px secondary-ink outline, offset 2px. Clickable table rows are
  keyboard focusable and use a fill instead of an outline.
- Icon-only buttons have `aria-label`. Segmented controls are `radiogroup` / `radio`;
  tabs are `tablist` / `tab`; sortable headers set `aria-sort`; nav uses `aria-current`.
- Icons: `lucide-react`, `size-3.5` in nav / menus / buttons / overlays, `strokeWidth={1.75}`
  in navigation and lists, `1.5` for larger illustrative icons.
- Expandable content declares `aria-expanded`.
- Loading keeps layout: skeletons match content size; buttons keep their width; data hooks
  keep the previous value while reloading so numbers tween instead of blinking.

**Numbers and copy**

- Numbers are right-aligned in tables and always `num`.
- Abbreviated currency in summaries and metrics (`$8.42M`, `-$290K`, `$4.8K`), full in
  tables (`$1,284,310`). Percents with one decimal (`93.4%`). Changes in percentage points
  as `+1.2 pts`. Helpers in `lib/format.ts`.
- Signed deltas always show `+` or `-`; zero renders as `$0` / `0.0 pts` in muted ink.
- Color follows *favorability*, not sign. A cost increase is a negative (unfavorable)
  number. Metrics where lower is better pass `higherIsBetter={false}`.
- Values computed or estimated by a model get a visible "Estimate" tag
  (`num text-[9px] uppercase tracking-[0.06em] border rounded-sm text-fg-3`) and show a
  "based on data through …" timestamp in mono.
- Eyebrows are labels, not headings: a few words, uppercased by the utility (write them in
  normal case in source).
- Sentence case everywhere else. Plain, specific copy; no placeholder text.

---

## 9. Reusable shell — files to copy

Copy these into a starter repo. Items marked *(adapt)* contain app-specific content that
needs to be replaced; everything else is generic.

**Foundation**

- `app/globals.css` — tokens, Tailwind theme mapping, base styles, `num` / `eyebrow`,
  theme-switching rule. *(Remove the Recharts block if not using Recharts.)*
- `app/layout.tsx` — fonts, `<html>` setup, theme script, `ThemeProvider`, `themeColor`.
  *(adapt: metadata, product name import.)*
- `lib/cn.ts` — class joiner.
- `lib/format.ts` — number / currency / percent / plural formatters.
  *(Generic; `formatVariance*` assume positive = good.)*

**Theme**

- `components/theme/theme-provider.tsx` *(adapt: `STORAGE_KEY`)*
- `components/theme/inline-script.tsx`
- `components/theme/dark-mode-prompt.tsx` *(optional; only if the default is light)*

**UI primitives** (`components/ui`)

- `badge.tsx` — `Badge`, `Dot`, `Tone`
- `button.tsx`
- `card.tsx` — `Card`, `CardHeader`, `CardFooter`
- `controls.tsx` — `Input`, `Select`, `Field`, `Segmented`, `Tabs`
- `empty-state.tsx` — `EmptyState`, `Skeleton`
- `metric.tsx` — `Metric`, `Variance`, `PointsDelta`, `ConfidenceIndicator`, `toneFor`
- `motion.tsx` — `FadeIn`, `Stagger`, `StaggerItem`, `AnimatedNumber`
- `overlay.tsx` — `Drawer`, `Modal`
- `progress.tsx`
- `table.tsx` — `Table`, `THead`, `Th`, `Tr`, `Td`, `useSort`
- `toast.tsx` — `ToastProvider`, `useToast`
- *Not generic:* `period-selector.tsx` (wraps `Segmented` with app periods from `lib/dates`).

**Shell** (`components/shell`)

- `app-shell.tsx` *(adapt: provider list — drop `AppProvider` / `UploadProvider` or swap
  in your own)*
- `sidebar.tsx` *(adapt: `NAV` config, badge sources, data calls for org / member / counts,
  sign-out cookie, dev tools)*
- `page-header.tsx` — `PageHeader`, `PageBody`
- `app/(app)/layout.tsx` — wraps product routes in `AppShell`
- `app/(auth)/layout.tsx` — centered auth column with wordmark *(adapt: product name)*
- `components/shell/auth-form.tsx` *(adapt: copy and mock auth logic; the layout of
  title, description, `Field`s, full-width primary button is the reusable part)*
- `proxy.ts` *(adapt: mock session gate; replace with real auth)*

**Charts and patterns** (optional)

- `components/charts/trend-chart.tsx` — `TrendChart`, `ChartLegend` *(depends on
  `formatMonth` from `lib/dates.ts`; swap for your own x-axis formatter)*
- `components/charts/variance-bars.tsx` — diverging bar list *(uses `Variance` and
  `formatCurrency`)*
- `components/data-sources/upload-zone.tsx` *(adapt: copy, accepted types)*
- `components/insights/evidence.tsx` — `EvidenceList` (`gap-px` cell grid),
  `SourceList`, `EstimateTag` *(adapt: types and link targets)*

**Dependencies**

`next`, `react`, `react-dom`, `tailwindcss` v4 (+ `@tailwindcss/turbopack` or PostCSS
plugin), `motion`, `lucide-react`; optionally `recharts` and `react-dropzone`. Fonts come
from `next/font/google` (Geist, Geist Mono).
