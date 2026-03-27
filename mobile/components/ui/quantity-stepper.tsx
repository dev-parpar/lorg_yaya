import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { COLORS, GRADIENTS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/**
 * Skeuomorphic wooden +/− stepper.
 * Each button uses the outline button gradient (cream paper look) with a
 * depth edge. The value is displayed on a matching paper swatch.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={styles.row}>
      <StepButton
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
      >
        <Minus size={14} color={atMin ? COLORS.muted : COLORS.foreground} />
      </StepButton>

      <View style={styles.valueShadow}>
        <LinearGradient
          colors={GRADIENTS.outlineButton}
          style={styles.valueBox}
        >
          <Text style={styles.valueText}>{value}</Text>
        </LinearGradient>
      </View>

      <StepButton
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={atMax}
      >
        <Plus size={14} color={atMax ? COLORS.muted : COLORS.foreground} />
      </StepButton>
    </View>
  );
}

function StepButton({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={disabled ? { opacity: 0.45 } : undefined}
    >
      <View style={styles.btnDepth}>
        <LinearGradient
          colors={GRADIENTS.outlineButton}
          style={styles.btnGradient}
        >
          {children}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnDepth: {
    ...SHADOWS.button,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: COLORS.outlineDepth,
  },
  btnGradient: {
    borderRadius: RADII.button - 1,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  valueShadow: {
    ...SHADOWS.input,
    borderRadius: RADII.input,
  },
  valueBox: {
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 36,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  valueText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
});
