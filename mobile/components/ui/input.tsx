import { TextInput, TextInputProps, View, StyleSheet } from "react-native";
import { Text } from "./text";
import { COLORS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * Skeuomorphic paper form field.
 * Renders as a cream note-paper rectangle with a warm ink border.
 * Labels use the muted ink colour; error state adds a red border.
 */
export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[styles.fieldShadow, error ? styles.errorShadow : null]}>
        <TextInput
          style={[
            styles.field,
            error ? styles.errorBorder : null,
            style,
          ]}
          placeholderTextColor={COLORS.mutedForeground}
          {...props}
        />
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  fieldShadow: {
    ...SHADOWS.input,
    borderRadius: RADII.input,
  },
  field: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.input,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.foreground,
  },
  errorShadow: {
    shadowColor: COLORS.destructive,
  },
  errorBorder: {
    borderColor: COLORS.destructive,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.destructive,
    marginTop: 2,
  },
});
