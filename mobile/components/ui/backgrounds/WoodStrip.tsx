/**
 * WoodStrip
 *
 * Renders a dark-walnut wood-grain strip using LinearGradient.
 * No external images — the grain is simulated with a carefully tuned
 * multi-stop horizontal gradient.
 *
 * Written once, used as the tab bar background across the entire app.
 */

import React from "react";
import { ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/theme/tokens";

interface WoodStripProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function WoodStrip({ children, style }: WoodStripProps) {
  return (
    <LinearGradient
      colors={GRADIENTS.woodTab}
      locations={[0, 0.1, 0.25, 0.42, 0.58, 0.75, 0.9, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
