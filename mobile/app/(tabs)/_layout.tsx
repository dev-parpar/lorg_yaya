import { Tabs, Redirect } from "expo-router";
import { Home, Search, User, Sparkles } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSyncManager } from "@/lib/hooks/useSyncManager";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WoodStrip } from "@/components/ui/backgrounds/WoodStrip";
import { COLORS } from "@/lib/theme/tokens";

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
        <ActivityIndicator size="large" color={COLORS.card} />
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
          borderTopWidth: 1,
          borderTopColor: "rgba(212, 168, 83, 0.3)",
        },
        // Dark walnut wood strip as the tab bar background
        tabBarBackground: () => (
          <WoodStrip style={{ flex: 1 }} />
        ),
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
