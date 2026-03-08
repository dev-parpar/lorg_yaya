import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";
import { View, ActivityIndicator } from "react-native";

export default function AuthLayout() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Already authenticated — redirect to main app
  if (session) {
    return <Redirect href="/(tabs)/locations" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
