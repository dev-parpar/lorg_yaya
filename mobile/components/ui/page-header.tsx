import { ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import { Text } from "./text";
import { COLORS, GRADIENTS, RADII, SHADOWS } from "@/lib/theme/tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onAdd?: () => void;
  rightElement?: ReactNode;
}

/**
 * Skeuomorphic masking-tape header.
 * The title sits on a horizontal strip that mimics a piece of cream masking
 * tape stuck onto the cork board. A warm gradient + torn-edge shadows give
 * it tactile depth without any images.
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
      {/* ── Tape strip ───────────────────────────────────────────── */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.tape}
      >
        {/* Left side: back button or spacer */}
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={18} color={COLORS.foreground} />
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
              style={styles.addBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={18} color={COLORS.primaryForeground} />
            </TouchableOpacity>
          ) : null)}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  tape: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADII.input,
    ...SHADOWS.header,
    // Simulate torn-edge feel with a slightly uneven border
    borderWidth: 1,
    borderColor: "rgba(184, 145, 75, 0.4)",
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
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(200, 167, 125, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primaryDepth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
});
