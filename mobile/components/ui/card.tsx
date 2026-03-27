import { View, ViewStyle, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { COLORS, GRADIENTS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Skeuomorphic note-card.
 * Renders as a cream-gradient paper card pinned to the cork board with a
 * visible red pushpin dot in the top-left corner.
 */
export function Card({ children, onPress, style }: CardProps) {
  const inner = (
    <LinearGradient
      colors={GRADIENTS.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.gradient, style]}
    >
      {/* Red pushpin dot */}
      <View style={styles.pin} />
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={styles.shadow}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={styles.shadow}>{inner}</View>;
}

const styles = StyleSheet.create({
  shadow: {
    ...SHADOWS.card,
    borderRadius: RADII.card,
  },
  gradient: {
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 24,   // extra top padding so the pin lives in the margin zone
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  pin: {
    position: "absolute",
    top: 10,
    left: 16,
    width: RADII.pin * 2,
    height: RADII.pin * 2,
    borderRadius: RADII.pin,
    backgroundColor: COLORS.primary,
    // Pin bead shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
});
