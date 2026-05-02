import { View, StyleSheet } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { Text } from "./text";
import { NeuView } from "./neu-view";
import { ReactNode } from "react";
import { COLORS, RADII } from "@/lib/theme/tokens";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Neumorphic empty-state.
 * The icon sits in an inset well "drilled" into a raised card surface,
 * creating a nested depth effect (raised → inset → icon).
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* Raised plaque with drilled icon well */}
      <NeuView variant="raised" radius={RADII.card} style={styles.plaque}>
        <View style={styles.plaqueInner}>
          <NeuView variant="insetDeep" radius={36}>
            <View style={styles.iconWell}>
              <Icon size={32} color={COLORS.mutedForeground} />
            </View>
          </NeuView>
        </View>
      </NeuView>

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
  plaque: {
    marginBottom: 20,
  },
  plaqueInner: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: RADII.card,
    alignItems: "center",
  },
  iconWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    color: COLORS.foreground,
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 260,
    color: COLORS.mutedForeground,
  },
  actionWrapper: {
    width: "100%",
  },
});
