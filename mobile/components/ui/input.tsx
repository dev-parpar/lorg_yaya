import { TextInput, TextInputProps, View, StyleSheet } from "react-native";
import { Text } from "./text";
import { NeuView } from "./neu-view";
import { COLORS, RADII, FONTS } from "@/lib/theme/tokens";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * Neumorphic input field.
 * Renders as an inset well "pressed into" the surface.
 * Focus deepens the well. Error state adds an accent ring.
 */
export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <NeuView
        variant={error ? "insetDeep" : "inset"}
        radius={RADII.input}
        style={error ? styles.errorRing : undefined}
      >
        <TextInput
          style={[styles.field, style]}
          placeholderTextColor={COLORS.mutedForeground}
          {...props}
        />
      </NeuView>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  field: {
    fontFamily: FONTS.body,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.foreground,
    borderRadius: RADII.input,
  },
  errorRing: {
    borderColor: COLORS.destructive,
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.destructive,
    marginTop: 2,
  },
});
