import { Redirect } from "expo-router";
import { useAuthStore } from "@/lib/store/auth-store";
import { View, ActivityIndicator } from "react-native";

export default function RootIndex() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return session
    ? <Redirect href="/(tabs)/locations" />
    : <Redirect href="/(auth)/login" />;
}
