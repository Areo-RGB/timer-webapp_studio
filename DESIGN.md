# Design System: IBM Carbon & Timer Machine

This document defines the design tokens, rules, and component contracts for the Timer Machine application, based on the IBM Carbon Design System.

## 1. Atmosphere & Visual Philosophy

- **Style**: High-contrast, minimal, utilitarian, inspired by IBM Carbon.
- **Surfaces**: Crisp white canvas with light gray structural layers. Flat surfaces, zero or minimal border radii (0px - 4px), sharp borders with 1px dividers.
- **Focus**: High accessibility, large readable numerals, clean tabular time displays.

## 2. Color Tokens

All colors must use declared theme tokens. Do not use raw Tailwind palette colors (e.g., `text-blue-600`, `bg-red-500`) or hardcoded hex values in component markup.

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `bg` | `#ffffff` | Page background canvas |
| `surface` | `#f4f4f4` | Secondary surface, input field fill, inactive states |
| `surface-2`| `#e8e8e8` | Hover state for surfaces |
| `surface-dark` | `#262626` | Dark surface container (dark stepper, headers) |
| `surface-dark-hover` | `#393939` | Hover state on dark surfaces |
| `line` | `#e0e0e0` | Structural borders, 1px dividers, grid gaps |
| `ink` | `#161616` | High-contrast primary text, dark buttons, dark group bars |
| `ink-hover` | `#393939` | Hover state for dark buttons and controls |
| `muted` | `#525252` | Secondary body text, timestamps, helper labels |
| `subtle` | `#8c8c8c` | Low-contrast placeholders, inactive toggle states |
| `accent` | `#0f62fe` | IBM Carbon Blue – primary actions, active focus rings, running progress |
| `accent-hover` | `#0050e6` | Hover state for primary buttons |
| `accent-pressed` | `#002d9c` | Active/pressed state for primary buttons |
| `good` | `#24a148` | Success signals |
| `warn` | `#f1c21b` | Warning states, halted timer indicator |
| `bad` | `#da1e28` | Destructive actions, delete background, error text |
| `bad-hover` | `#b81921` | Hover state for destructive buttons |

## 3. Typography

- **Font Family**: IBM Plex Sans (`font-sans`), with fallback to system sans-serif.
- **Numbers & Durations**: Always use `.tabular` (`font-variant-numeric: tabular-nums`) to prevent jittering during countdowns.
- **Scales**:
  - Large Timer Display: `text-[min(31vw,11rem)]` / `text-[min(22vw,8rem)]` with `font-light` and tight tracking
  - Page Titles: `text-[42px]` with `font-light leading-tight`
  - Section Headers: `text-xl` or `text-base font-semibold`
  - Labels & Metadata: `text-sm` or `text-xs text-muted`

## 4. Geometry & Spacing

- Base grid: **4px** increments (`p-1`, `p-2`, `p-3`, `p-4`, etc.).
- Corner radius: Strict flat design. Use `rounded-none` or small tokens (0px to 4px). No soft rounded pill buttons.
- Dividers: Crisp 1px borders using `border-line`.

## 5. Component Contracts & Rules

### Component Contracts
1. **`<Button />`**:
   - Owns its padding, font size, and background colors.
   - Use variants: `default` (IBM Blue primary), `secondary` (ink dark), `ghost` (text-accent / surface hover), `destructive` (`bg-destructive text-white`).
   - Use sizes: `default`, `sm`, `lg`, `icon`.
   - Callers may pass layout utilities (`mt-*`, `mb-*`, `w-*`, `flex-*`, `grid-*`), but must not override padding or border radius.

2. **`<SwipeRow />`**:
   - Controls horizontal gestures and revealed delete actions (`bg-bad`).
   - Callers provide the row contents.

3. **`<Stepper />`**:
   - Manages plus/minus counter controls with light or dark themes (`bg-surface-dark`, `hover:bg-surface-dark-hover`).

4. **`<DurationInput />`**:
   - Owns time formatting into hours, minutes, and seconds.

## 6. Linter Enforcements (`@shadcn/lint`)

The project enforces these guidelines via `@shadcn/lint`:
- `shadcn/no-raw-colors`: Requires all colors to match declared theme tokens.
- `shadcn/no-arbitrary-values`: Restricts bracketed arbitrary values (`p-[13px]`, `w-[231px]`), directing agents to scale tokens.
- `shadcn/no-restyle`: Enforces component contracts to prevent unauthorized restyling via `className`.
- `shadcn/no-inline-styles`: Enforces Tailwind utility classes over inline CSS.
- `shadcn/no-unknown-classes`: Catches invalid or misspelled utility classes.
