import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { NeuView } from "@/components/ui/neu-view";
import { COLORS, RADII, FONTS } from "@/lib/theme/tokens";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/**
 * Neumorphic +/- stepper.
 * Buttons are raised from the surface; the value sits in an inset well.
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

      <NeuView variant="inset" radius={RADII.input}>
        <View style={styles.valueBox}>
          <Text style={styles.valueText}>{value}</Text>
        </View>
      </NeuView>

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
      <NeuView variant="raisedSmall" radius={RADII.button}>
        <View style={styles.btnInner}>
          {children}
        </View>
      </NeuView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnInner: {
    width: 32,
    height: 32,
    borderRadius: RADII.button,
    alignItems: "center",
    justifyContent: "center",
  },
  valueBox: {
    width: 40,
    height: 32,
    borderRadius: RADII.input,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
});
