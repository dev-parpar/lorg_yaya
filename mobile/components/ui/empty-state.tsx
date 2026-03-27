import { View, StyleSheet } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./text";
import { ReactNode } from "react";
import { COLORS, GRADIENTS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Skeuomorphic empty-state.
 * The icon sits on a cream note-card plaque with a red pushpin and warm
 * shadow — it looks like a blank note pinned to the cork board waiting
 * to be filled in.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* Pinned plaque */}
      <View style={styles.plaqueShadow}>
        <LinearGradient colors={GRADIENTS.card} style={styles.plaque}>
          {/* Pin */}
          <View style={styles.pin} />
          <View style={styles.iconRing}>
            <Icon size={32} color={COLORS.mutedForeground} />
          </View>
        </LinearGradient>
      </View>

      <Text variant="h3" style={styles.title}>{title}</Text>
      <Text variant="muted" style={styles.description}>{description}</Text>
      {action && <View style={styles.actionWrapper}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  plaqueShadow: {
    ...SHADOWS.card,
    borderRadius: RADII.card,
    marginBottom: 20,
  },
  plaque: {
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 20,
    alignItems: "center",
    overflow: "hidden",
    minWidth: 120,
  },
  pin: {
    position: "absolute",
    top: 10,
    left: "50%",
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(200, 167, 125, 0.25)",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    color: COLORS.card,
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 260,
    color: COLORS.mutedSurface,
  },
  actionWrapper: {
    width: "100%",
  },
});
