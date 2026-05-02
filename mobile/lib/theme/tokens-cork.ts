/**
 * Skeuomorphic Cork Board design tokens.
 * Single source of truth — import from here in every component and screen.
 * Change a value here and it propagates everywhere instantly.
 */

export const COLORS = {
  // ── Cork board ──────────────────────────────────────────────────────────
  cork: "#8B6D47",
  corkDark: "#6B5030",
  corkLight: "#A07C50",

  // ── Note card (cream paper) ─────────────────────────────────────────────
  card: "#FFFDE7",
  cardGradientEnd: "#FFF3C4",
  cardShadow: "rgba(60, 30, 10, 0.38)",

  // ── Typography ──────────────────────────────────────────────────────────
  foreground: "#2C1810",
  mutedForeground: "#6B4A2C",

  // ── Interactive / Primary ───────────────────────────────────────────────
  primary: "#B91C1C",
  primaryLight: "#C41E1E",
  primaryDark: "#8B1010",
  primaryDepth: "#6B0A0A",
  primaryForeground: "#FFFFFF",

  // ── Borders & kraft surfaces ────────────────────────────────────────────
  border: "#B8914B",
  muted: "#C8A77D",
  mutedSurface: "#EDE0C4",

  // ── Destructive ─────────────────────────────────────────────────────────
  destructive: "#7F1D1D",
  destructiveLight: "#991B1B",
  destructiveForeground: "#FFFFFF",

  // ── Tab bar (dark walnut) ───────────────────────────────────────────────
  tabWood: "#1A0E06",
  tabBrass: "#D4A853",
  tabInactive: "#9B7845",

  // ── Utility ─────────────────────────────────────────────────────────────
  white: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.55)",
  success: "#15803D",
  successLight: "#16A34A",
  info: "#1D4ED8",
  warning: "#B45309",

  // ── Ghost / outline button ──────────────────────────────────────────────
  outlineGradientTop: "#FFFDE7",
  outlineGradientBottom: "#F5E8B0",
  outlineDepth: "#9B7640",
} as const;

export const FONTS = {
  typewriter: "SpecialElite_400Regular",
} as const;

export const SHADOWS = {
  card: {
    shadowColor: "#3C1E0A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    shadowColor: "#1A0A02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
  header: {
    shadowColor: "#3C1E0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    shadowColor: "#3C1E0A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
} as const;

export const RADII = {
  card: 12,
  button: 10,
  input: 8,
  tag: 20,
  pin: 5,
} as const;

export const GRADIENTS = {
  primaryButton: ["#C41E1E", "#B01818", "#8B1010"] as const,
  outlineButton: ["#FFFDE7", "#F5E8B0"] as const,
  destructiveButton: ["#991B1B", "#7F1D1D"] as const,
  card: ["#FFFDE7", "#FFF3C4"] as const,
  header: ["#F5F0D0", "#EDE8C0", "#F5F0D0"] as const,
  woodTab: ["#0D0705", "#1F1008", "#2C1A0E", "#231508", "#3D2314", "#2C1A0E", "#1F1008", "#0D0705"] as const,
} as const;

/** Stub — cork theme doesn't use neumorphic shadows */
export const NEU = {
  lightShadow: { shadowColor: "transparent", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  darkShadow: { shadowColor: "#3C1E0A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 6 },
  lightShadowHover: { shadowColor: "transparent", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  darkShadowHover: { shadowColor: "#3C1E0A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  lightShadowSmall: { shadowColor: "transparent", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  darkShadowSmall: { shadowColor: "#1A0A02", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 3, elevation: 4 },
  insetBackground: "#EDE0C4",
  insetBorderLight: "rgba(255, 253, 231, 0.5)",
  insetBorderDark: "rgba(184, 145, 75, 0.4)",
  insetDeepBackground: "#E5D8BC",
} as const;
