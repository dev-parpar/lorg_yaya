import { TouchableOpacity, ActivityIndicator, ViewStyle, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./text";
import { ReactNode } from "react";
import { COLORS, GRADIENTS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

const CONFIG = {
  primary: {
    gradient: GRADIENTS.primaryButton as unknown as readonly [string, string, ...string[]],
    depthColor: COLORS.primaryDepth,
    textColor: COLORS.primaryForeground,
    shadow: SHADOWS.button,
  },
  outline: {
    gradient: GRADIENTS.outlineButton as unknown as readonly [string, string, ...string[]],
    depthColor: COLORS.outlineDepth,
    textColor: COLORS.foreground,
    shadow: SHADOWS.button,
  },
  destructive: {
    gradient: GRADIENTS.destructiveButton as unknown as readonly [string, string, ...string[]],
    depthColor: COLORS.destructive,
    textColor: COLORS.destructiveForeground,
    shadow: SHADOWS.button,
  },
  ghost: {
    gradient: null,
    depthColor: "transparent",
    textColor: COLORS.primary,
    shadow: null,
  },
} as const;

/**
 * Skeuomorphic physical button.
 * Primary / outline / destructive variants use a LinearGradient surface with
 * a dark bottom border that simulates physical depth (the "depth edge").
 * Ghost buttons are transparent with ink-coloured text.
 */
export function Button({
  onPress,
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const cfg = CONFIG[variant];
  const isDisabled = disabled || loading;

  // Ghost variant — no gradient, no shadow
  if (variant === "ghost") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.6}
        style={[styles.ghostBase, isDisabled && styles.disabled, style]}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <Text style={[styles.ghostText, { color: cfg.textColor }]}>{children}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[isDisabled && styles.disabled, style]}
    >
      {/* Depth edge — the "raised" illusion */}
      <View
        style={[
          cfg.shadow ?? {},
          styles.depthWrapper,
          { borderBottomColor: cfg.depthColor, borderColor: cfg.depthColor },
        ]}
      >
        <LinearGradient
          colors={cfg.gradient!}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.inner}>
            {loading ? (
              <ActivityIndicator color={cfg.textColor} size="small" />
            ) : (
              <Text style={[styles.label, { color: cfg.textColor }]}>{children}</Text>
            )}
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  depthWrapper: {
    borderRadius: RADII.button,
    borderWidth: 1,
    borderBottomWidth: 4,
    overflow: "visible",
  },
  gradient: {
    borderRadius: RADII.button - 1,
    overflow: "hidden",
  },
  inner: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ghostBase: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADII.button,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.45,
  },
});
