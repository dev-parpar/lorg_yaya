/**
 * CorkBackground
 *
 * Renders a seamlessly tiling cork-board texture using react-native-svg.
 * No external images — the entire texture is generated from SVG primitives.
 * Written once, used everywhere as the outer wrapper of every Screen.
 *
 * The 80×80 user-space tile contains 36 pre-computed ellipses that mimic
 * the irregular cellular structure of real cork. Colors are all warm brown
 * shades with varying opacity layered over the base fill.
 */

import React from "react";
import { StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";
import Svg, { Defs, Ellipse, Pattern, Rect } from "react-native-svg";
import { COLORS } from "@/lib/theme/tokens";

// [cx, cy, rx, ry, fill, opacity] — 80×80 tile, ~36 cells
const CORK_CELLS: [number, number, number, number, string, number][] = [
  // Row 1
  [7,   8,   5.5, 4.0, "#6B5030", 0.50],
  [18,  6,   4.0, 6.5, "#9B7845", 0.38],
  [28,  12,  7.0, 4.5, "#7A5C38", 0.52],
  [41,  7,   4.5, 3.5, "#6B5030", 0.42],
  [52,  11,  6.0, 4.0, "#A07C50", 0.36],
  [63,  6,   4.0, 5.5, "#7A5C38", 0.48],
  [74,  10,  5.0, 3.5, "#9B7845", 0.44],
  // Row 2
  [4,   22,  3.5, 5.5, "#6B5030", 0.46],
  [14,  26,  7.0, 4.5, "#9B7845", 0.41],
  [25,  20,  5.0, 3.5, "#7A5C38", 0.50],
  [36,  25,  6.5, 5.0, "#A07C50", 0.38],
  [49,  21,  4.0, 6.0, "#6B5030", 0.44],
  [60,  26,  7.0, 4.0, "#9B7845", 0.40],
  [72,  22,  5.0, 4.0, "#7A5C38", 0.50],
  [79,  28,  4.5, 3.5, "#A07C50", 0.38],
  // Row 3
  [9,   39,  6.0, 4.0, "#9B7845", 0.42],
  [21,  42,  4.5, 6.0, "#6B5030", 0.48],
  [33,  37,  7.5, 4.5, "#7A5C38", 0.45],
  [46,  41,  5.0, 3.5, "#A07C50", 0.40],
  [57,  38,  4.5, 5.5, "#6B5030", 0.50],
  [68,  43,  6.5, 4.0, "#9B7845", 0.42],
  [78,  38,  4.0, 5.0, "#7A5C38", 0.46],
  // Row 4
  [5,   55,  4.5, 6.0, "#A07C50", 0.38],
  [17,  58,  7.0, 4.5, "#6B5030", 0.48],
  [29,  54,  5.0, 3.5, "#9B7845", 0.44],
  [42,  59,  6.0, 4.5, "#7A5C38", 0.50],
  [54,  56,  4.0, 5.5, "#A07C50", 0.38],
  [65,  60,  5.5, 4.0, "#6B5030", 0.46],
  [76,  55,  4.5, 6.0, "#9B7845", 0.42],
  // Row 5
  [8,   72,  6.5, 4.0, "#7A5C38", 0.50],
  [19,  75,  4.0, 5.5, "#6B5030", 0.44],
  [31,  70,  5.5, 3.5, "#A07C50", 0.40],
  [43,  74,  7.0, 4.5, "#9B7845", 0.45],
  [55,  71,  4.5, 6.0, "#7A5C38", 0.48],
  [67,  75,  6.0, 4.0, "#6B5030", 0.50],
  [77,  70,  4.0, 5.0, "#A07C50", 0.38],
];

interface CorkBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function CorkBackground({ children, style }: CorkBackgroundProps) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.container, style]}>
      {/* Cork texture rendered absolutely under all content */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <Pattern
              id="cork"
              x="0"
              y="0"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              {/* Base cork tone */}
              <Rect x="0" y="0" width="80" height="80" fill={COLORS.cork} />
              {/* Cork cells */}
              {CORK_CELLS.map(([cx, cy, rx, ry, fill, opacity], i) => (
                <Ellipse
                  key={i}
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill={fill}
                  fillOpacity={opacity}
                />
              ))}
              {/* Subtle dark vignette overlay per tile for depth */}
              <Rect x="0" y="0" width="80" height="80" fill="rgba(0,0,0,0.03)" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#cork)" />
        </Svg>
      </View>

      {/* App content on top of the texture */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
