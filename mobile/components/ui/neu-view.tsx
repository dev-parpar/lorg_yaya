/**
 * NeuView — Neumorphic shadow wrapper.
 *
 * Renders the dual-shadow effect that defines neumorphism:
 * - **raised**: Two layered Views — outer has the light (top-left) shadow,
 *   inner has the dark (bottom-right) shadow. Creates the extruded effect.
 * - **inset**: A slightly darker background with directional borders to
 *   simulate an inset / pressed-in well. True inset shadows aren't possible
 *   in React Native, so we fake it with border color + background tricks.
 * - **flat**: No shadows — just the background color and radius.
 *
 * All interactive neumorphic elements should wrap their content in NeuView.
 */

import { View, ViewStyle, StyleSheet, Platform } from "react-native";
import { ReactNode } from "react";
import { COLORS, NEU, RADII } from "@/lib/theme/tokens";

type NeuVariant = "raised" | "raisedSmall" | "inset" | "insetDeep" | "flat";

interface NeuViewProps {
  variant?: NeuVariant;
  radius?: number;
  style?: ViewStyle;
  innerStyle?: ViewStyle;
  children?: ReactNode;
}

export function NeuView({
  variant = "raised",
  radius = RADII.card,
  style,
  innerStyle,
  children,
}: NeuViewProps) {
  if (variant === "flat") {
    return (
      <View style={[{ backgroundColor: COLORS.cork, borderRadius: radius }, style]}>
        {children}
      </View>
    );
  }

  if (variant === "inset" || variant === "insetDeep") {
    const bg = variant === "insetDeep" ? NEU.insetDeepBackground : NEU.insetBackground;
    return (
      <View
        style={[
          styles.insetOuter,
          {
            backgroundColor: bg,
            borderRadius: radius,
          },
          style,
        ]}
      >
        <View style={[{ borderRadius: radius - 1 }, innerStyle]}>
          {children}
        </View>
      </View>
    );
  }

  // Raised variants: layer two views for dual shadows
  const lightShadow = variant === "raisedSmall" ? NEU.lightShadowSmall : NEU.lightShadow;
  const darkShadow = variant === "raisedSmall" ? NEU.darkShadowSmall : NEU.darkShadow;

  return (
    <View
      style={[
        lightShadow,
        { borderRadius: radius },
        style,
      ]}
    >
      <View
        style={[
          darkShadow,
          {
            backgroundColor: COLORS.cork,
            borderRadius: radius,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  insetOuter: {
    // Simulate inset shadow with directional borders
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopColor: NEU.insetBorderDark,
    borderLeftColor: NEU.insetBorderDark,
    borderBottomColor: NEU.insetBorderLight,
    borderRightColor: NEU.insetBorderLight,
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
});
