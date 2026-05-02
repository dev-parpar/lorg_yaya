import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { COLORS, FONTS } from "@/lib/theme/tokens";

interface StyledTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "muted";
}

/**
 * Neumorphic themed Text.
 * Headings use Plus Jakarta Sans (bold/extrabold) for a modern geometric feel.
 * Body / caption / muted use DM Sans for clean legibility.
 */
export function Text({ variant = "body", style, ...props }: StyledTextProps) {
  return (
    <RNText style={[styles[variant], style]} {...props} />
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.foreground,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FONTS.typewriter,
    fontSize: 20,
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: FONTS.typewriter,
    fontSize: 16,
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 21,
  },
  caption: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 17,
  },
  muted: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 21,
  },
});
