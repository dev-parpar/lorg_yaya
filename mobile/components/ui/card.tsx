import { ViewStyle, TouchableOpacity, View } from "react-native";
import { ReactNode } from "react";
import { NeuView } from "./neu-view";
import { RADII } from "@/lib/theme/tokens";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Neumorphic card.
 * Appears extruded from the surface — same background color, depth
 * defined entirely by dual shadows. No borders, no gradients, no pushpins.
 */
export function Card({ children, onPress, style }: CardProps) {
  const inner = (
    <NeuView variant="raised" radius={RADII.card} style={style}>
      <View style={{ padding: 16, borderRadius: RADII.card }}>
        {children}
      </View>
    </NeuView>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}
