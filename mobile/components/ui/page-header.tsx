import { ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import { Text } from "./text";
import { NeuView } from "./neu-view";
import { COLORS, RADII } from "@/lib/theme/tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onAdd?: () => void;
  rightElement?: ReactNode;
}

/**
 * Neumorphic page header.
 * A softly raised strip that holds the title, optional back button,
 * and right-side actions. Replaces the cork-theme masking tape.
 */
export function PageHeader({
  title,
  subtitle,
  showBack = false,
  onAdd,
  rightElement,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <NeuView variant="raisedSmall" radius={RADII.button}>
        <View style={styles.inner}>
          {/* Left: back button or spacer */}
          <View style={styles.left}>
            {showBack && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <NeuView variant="inset" radius={15} innerStyle={styles.iconWell}>
                  <ArrowLeft size={16} color={COLORS.foreground} />
                </NeuView>
              </TouchableOpacity>
            )}
          </View>

          {/* Center: title & subtitle */}
          <View style={styles.center}>
            <Text variant="h2" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Right: custom element or + button */}
          <View style={styles.right}>
            {rightElement ?? (onAdd ? (
              <TouchableOpacity
                onPress={onAdd}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <NeuView
                  variant="raisedSmall"
                  radius={15}
                  innerStyle={{ ...styles.addBtn, backgroundColor: COLORS.primary }}
                >
                  <Plus size={16} color={COLORS.primaryForeground} />
                </NeuView>
              </TouchableOpacity>
            ) : null)}
          </View>
        </View>
      </NeuView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADII.button,
  },
  left: {
    width: 36,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    width: 36,
    alignItems: "flex-end",
  },
  title: {
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
    textAlign: "center",
  },
  iconBtn: {
    width: 30,
    height: 30,
  },
  iconWell: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
