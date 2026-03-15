import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { invitesApi } from "@/lib/api/invites";
import { useAuthStore } from "@/lib/store/auth-store";
import { Text } from "./text";

/**
 * Persistent notification bell shown in every top-level screen header.
 * Displays a red badge with the count of pending location invites and
 * navigates to the notifications screen on press.
 */
export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: invites } = useQuery({
    queryKey: ["invites"],
    queryFn: invitesApi.list,
    enabled: !!user,
    // Refresh every 60 s so the badge stays current without a full reload
    refetchInterval: 60_000,
  });

  const count = invites?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/locations/invites")}
      className="relative p-2"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={
        count > 0 ? `${count} pending notification${count !== 1 ? "s" : ""}` : "Notifications"
      }
    >
      <Bell size={22} color="#0F172A" />

      {count > 0 && (
        <View
          className="absolute top-0.5 right-0.5 bg-red-500 rounded-full items-center justify-center"
          style={{ minWidth: 16, height: 16, paddingHorizontal: 3 }}
        >
          <Text className="text-white font-bold" style={{ fontSize: 10, lineHeight: 14 }}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
