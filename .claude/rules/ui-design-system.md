---
paths:
  - "mobile/components/**/*.tsx"
  - "mobile/app/**/*.tsx"
  - "mobile/lib/theme/**"
---

# UI Design System — Skeuomorphic Cork Board

The app uses a physical cork board metaphor. All visual decisions must stay consistent with this theme.

## Design Tokens

All colors, fonts, shadows, radii, and gradients are defined in `mobile/lib/theme/tokens.ts`. Import from there — never hardcode values.

```typescript
import { COLORS, FONTS, SHADOWS, RADII, GRADIENTS } from "@/lib/theme/tokens";
```

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `COLORS.cork` | `#8B6D47` | Screen backgrounds |
| `COLORS.card` | `#FFFDE7` | Note card surfaces |
| `COLORS.foreground` | `#2C1810` | Body text (ink) |
| `COLORS.mutedForeground` | `#6B4A2C` | Secondary text |
| `COLORS.primary` | `#B91C1C` | Buttons, pushpins, accents |
| `COLORS.muted` | `#C8A77D` | Borders, kraft surfaces |
| `COLORS.tabWood` | `#1A0E06` | Tab bar background |
| `COLORS.tabBrass` | `#D4A853` | Active tab indicator |

## Visual Elements

- **Backgrounds**: Cork texture via `CorkBackground` (SVG, no raster images)
- **Cards**: Cream gradient with red pushpin dot, 1px muted border, 4px dark bottom border for depth
- **Buttons**: Gradient fill with depth border — variants: `primary` (red), `outline` (cream), `destructive` (dark red), `ghost` (transparent)
- **Inputs**: Cream field with muted border and warm shadow
- **Headers**: Masking tape effect via `PageHeader`
- **Tab bar**: Dark walnut wood strip with brass active indicators

## Typography

- **Headings** (h1/h2/h3): `SpecialElite_400Regular` (typewriter font) via `FONTS.typewriter`
- **Body/caption**: System font (SF Pro / Roboto) — do not apply the typewriter font to body text
- Use the `<Text>` component from `components/ui/text.tsx` with the appropriate variant

## Component Library

Always use existing components before building new ones:

| Component | Purpose |
|---|---|
| `Screen` | Screen wrapper (cork bg, safe area, scroll, keyboard) |
| `PageHeader` | Masking tape header with title, back button, right element |
| `Card` | Cream note card with pushpin |
| `Button` | Primary/outline/ghost/destructive with gradient depth |
| `Input` | Themed text input with label and error state |
| `Text` | Typography variants (h1, h2, h3, body, caption, muted) |
| `EntityPhoto` | Photo with fallback icon, tap to change, upload spinner |
| `EmptyState` | Centered plaque with icon, title, description, action |
| `ErrorView` | Error message with retry button |
| `QuantityStepper` | +/- stepper with bounds |
| `BulkItemModal` | Dynamic rows for batch item entry |
| `ItemReviewModal` | Review AI-detected items with edit/duplicate handling |
| `NotificationBell` | Bell icon with badge count |

## Style Rules

- Use `StyleSheet.create()` — not inline objects
- Use `RADII` constants for border radii (card=12, button=10, input=8, tag=20)
- Use `SHADOWS` presets (card, button, header, input)
- Use `GRADIENTS` for LinearGradient colors
- No dark mode — the cork board theme is inherently light
