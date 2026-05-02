import { Tabs, Redirect } from "expo-router";
import { Home, Search, User, Sparkles } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSyncManager } from "@/lib/hooks/useSyncManager";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, NEU } from "@/lib/theme/tokens";

export default function TabsLayout() {
  const { session, isLoading } = useAuthStore();

  // Initialize SQLite, run migrations, start sync engines for all locations.
  // Internally guarded — no-ops until user and locations are available.
  useSyncManager();
  const insets = useSafeAreaInsets();

  const tabBarHeight = Platform.OS === "android" ? 56 + insets.bottom : undefined;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.cork }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.tabBrass,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          backgroundColor: COLORS.cork,
          borderTopWidth: 0,
          // Top edge shadow to separate tab bar from content
          ...NEU.darkShadow,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="locations"
        options={{
          title: "Locations",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Lorgy",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
