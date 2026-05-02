/**
 * Neumorphism (Soft UI) design tokens.
 * Single source of truth — import from here in every component and screen.
 *
 * The entire visual system is built on a single cool grey surface (#E0E5EC).
 * All depth comes from dual opposing shadows — one light (top-left),
 * one dark (bottom-right). No borders, no gradients for structure.
 */

export const COLORS = {
  // ── Background surface ─────────────────────────────────────────────────
  cork: "#E0E5EC",           // base surface (every screen background)
  corkDark: "#C8CED8",       // slightly darker variant
  corkLight: "#EDF1F7",      // slightly lighter variant

  // ── Card surface (same material as background) ─────────────────────────
  card: "#E0E5EC",           // same as background — neumorphic principle
  cardGradientEnd: "#E0E5EC",
  cardShadow: "rgb(163, 177, 198)",

  // ── Typography ──────────────────────────────────────────────────────────
  foreground: "#3D4852",     // primary text (7.5:1 contrast)
  mutedForeground: "#6B7280", // secondary text (4.6:1 WCAG AA)

  // ── Interactive / Primary (soft violet accent) ──────────────────────────
  primary: "#6C63FF",
  primaryLight: "#8B84FF",
  primaryDark: "#5A52E0",
  primaryDepth: "#4840C0",
  primaryForeground: "#FFFFFF",

  // ── Borders & surfaces ──────────────────────────────────────────────────
  border: "transparent",      // neumorphism uses shadows, not borders
  muted: "#B0B8C4",
  mutedSurface: "#D1D9E6",

  // ── Destructive ─────────────────────────────────────────────────────────
  destructive: "#DC2626",
  destructiveLight: "#EF4444",
  destructiveForeground: "#FFFFFF",

  // ── Tab bar ─────────────────────────────────────────────────────────────
  tabWood: "#E0E5EC",        // matches surface
  tabBrass: "#6C63FF",       // accent as active indicator
  tabInactive: "#9CA3AF",

  // ── Utility ─────────────────────────────────────────────────────────────
  white: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.3)",
  success: "#38B2AC",
  successLight: "#4FD1C5",
  info: "#6C63FF",
  warning: "#F59E0B",

  // ── Button variants ─────────────────────────────────────────────────────
  outlineGradientTop: "#E0E5EC",
  outlineGradientBottom: "#E0E5EC",
  outlineDepth: "#B0B8C4",
} as const;

export const FONTS = {
  typewriter: "PlusJakartaSans_700Bold", // headings use Jakarta Sans Bold
  display: "PlusJakartaSans_800ExtraBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
} as const;

/**
 * Neumorphic shadow specs.
 *
 * React Native only supports a single shadow per View on iOS.
 * The NeuView component layers two Views for the dual-shadow effect.
 * These specs are used as fallbacks for components that apply
 * shadows directly (not through NeuView).
 */
export const SHADOWS = {
  card: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  button: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export const RADII = {
  card: 24,     // soft, pillow-like corners
  button: 16,   // rounded-2xl
  input: 16,    // same as button
  tag: 9999,    // full pill
  pin: 12,      // repurposed: icon well radius
} as const;

/**
 * Gradients are not core to neumorphism.
 * These exist for backward-compatibility with components that
 * reference GRADIENTS. Values are kept monochromatic.
 */
export const GRADIENTS = {
  primaryButton: ["#6C63FF", "#5A52E0", "#4840C0"] as const,
  outlineButton: ["#E0E5EC", "#E0E5EC"] as const,
  destructiveButton: ["#DC2626", "#B91C1C"] as const,
  card: ["#E0E5EC", "#E0E5EC"] as const,
  header: ["#E0E5EC", "#E0E5EC", "#E0E5EC"] as const,
  woodTab: [
    "#E0E5EC", "#E0E5EC", "#E0E5EC", "#E0E5EC",
    "#E0E5EC", "#E0E5EC", "#E0E5EC", "#E0E5EC",
  ] as const,
} as const;

// ── Neumorphism-specific values ──────────────────────────────────────────────

export const NEU = {
  /** Light source shadow (top-left highlight) */
  lightShadow: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  /** Dark shadow (bottom-right depth) */
  darkShadow: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },

  /** Raised hover — larger, more pronounced */
  lightShadowHover: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  darkShadowHover: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },

  /** Small raised — for buttons, pills */
  lightShadowSmall: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  darkShadowSmall: {
    shadowColor: "rgb(163, 177, 198)",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },

  /**
   * Inset simulation — since RN doesn't support inset shadows,
   * we simulate with a slightly darker background + directional borders.
   */
  insetBackground: "#D1D9E6",
  insetBorderLight: "rgba(255, 255, 255, 0.7)",
  insetBorderDark: "rgba(163, 177, 198, 0.5)",

  /** Deep inset — for inputs, active wells */
  insetDeepBackground: "#CCD3DD",
} as const;
