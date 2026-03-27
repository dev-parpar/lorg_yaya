import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { invitesApi } from "@/lib/api/invites";
import { useAuthStore } from "@/lib/store/auth-store";
import { Text } from "./text";
import { COLORS } from "@/lib/theme/tokens";

/**
 * Notification bell shown in every top-level screen header.
 * Styled with the cork-board theme: brass-coloured bell, red badge.
 */
export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: invites } = useQuery({
    queryKey: ["invites"],
    queryFn: invitesApi.list,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const count = invites?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/locations/invites")}
      style={styles.btn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={
        count > 0 ? `${count} pending notification${count !== 1 ? "s" : ""}` : "Notifications"
      }
    >
      <Bell size={22} color={COLORS.foreground} />

      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: COLORS.primaryForeground,
  },
});
