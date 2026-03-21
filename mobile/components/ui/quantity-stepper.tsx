import { View, TouchableOpacity } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Text } from "@/components/ui/text";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/**
 * Compact − value + stepper used in both the single-item and bulk-add forms.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
}: QuantityStepperProps) {
  return (
    <View className="flex-row items-center gap-1">
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="rounded-lg bg-muted p-1.5"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Minus size={14} color={value <= min ? "#CBD5E1" : "#0F172A"} />
      </TouchableOpacity>

      <Text variant="body" className="font-semibold w-7 text-center">
        {value}
      </Text>

      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="rounded-lg bg-muted p-1.5"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Plus size={14} color={value >= max ? "#CBD5E1" : "#0F172A"} />
      </TouchableOpacity>
    </View>
  );
}
