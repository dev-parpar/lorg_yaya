import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { COLORS, FONTS } from "@/lib/theme/tokens";

interface StyledTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "muted";
}

/**
 * Skeuomorphic themed Text.
 * Headings (h1, h2, h3) use the Special Elite typewriter font.
 * Body / caption / muted use the system font for legibility at small sizes.
 * All variants use the dark ink foreground palette.
 */
export function Text({ variant = "body", style, ...props }: StyledTextProps) {
  return (
    <RNText style={[styles[variant], style]} {...props} />
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: FONTS.typewriter,
    fontSize: 26,
    color: COLORS.foreground,
    letterSpacing: 0.5,
  },
  h2: {
    fontFamily: FONTS.typewriter,
    fontSize: 20,
    color: COLORS.foreground,
    letterSpacing: 0.4,
  },
  h3: {
    fontFamily: FONTS.typewriter,
    fontSize: 16,
    color: COLORS.foreground,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 17,
  },
  muted: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 20,
  },
});
