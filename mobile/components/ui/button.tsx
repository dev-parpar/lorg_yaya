import { TouchableOpacity, ActivityIndicator, ViewStyle, StyleSheet, View } from "react-native";
import { Text } from "./text";
import { NeuView } from "./neu-view";
import { ReactNode } from "react";
import { COLORS, RADII, FONTS } from "@/lib/theme/tokens";

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

/**
 * Neumorphic button.
 * - Primary: Accent violet surface, raised from the background.
 * - Outline: Same-surface raised, blends with the background.
 * - Destructive: Red surface, raised.
 * - Ghost: No depth, just tinted text.
 */
export function Button({
  onPress,
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

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
          <Text style={[styles.ghostText, { color: COLORS.primary }]}>{children}</Text>
        )}
      </TouchableOpacity>
    );
  }

  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";
  const bgColor = isPrimary
    ? COLORS.primary
    : isDestructive
      ? COLORS.destructive
      : COLORS.cork;
  const textColor = isPrimary || isDestructive
    ? COLORS.primaryForeground
    : COLORS.foreground;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[isDisabled && styles.disabled, style]}
    >
      <NeuView
        variant="raisedSmall"
        radius={RADII.button}
        innerStyle={{ backgroundColor: bgColor }}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <Text style={[styles.label, { color: textColor }]}>{children}</Text>
          )}
        </View>
      </NeuView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADII.button,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  ghostBase: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADII.button,
  },
  ghostText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.45,
  },
});
