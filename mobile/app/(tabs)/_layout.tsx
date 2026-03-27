import { Tabs, Redirect } from "expo-router";
import { Home, Search, User, Sparkles } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { session, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();
  // On Android the bottom inset covers the gesture navigation bar.
  // React Navigation adds it automatically when SafeAreaProvider is present,
  // but we set an explicit minimum height so the tab bar is never clipped.
  const tabBarHeight = Platform.OS === "android" ? 56 + insets.bottom : undefined;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Not authenticated — redirect to login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          height: tabBarHeight,
          paddingBottom: insets.bottom,
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
