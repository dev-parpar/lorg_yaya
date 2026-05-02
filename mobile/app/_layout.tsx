import "../global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi } from "@/lib/api/profiles";
import { COLORS } from "@/lib/theme/tokens";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

/**
 * After a user signs in, ensure they have a profile record.
 * This handles the email-confirmation flow: the username was stored in
 * user_metadata during signUp and is used here to create the profile
 * on their first authenticated session.
 */
async function ensureProfile(userId: string, userMetadata: Record<string, unknown>) {
  try {
    const existing = await profilesApi.getMe();
    if (existing) return;

    const username = userMetadata?.username as string | undefined;
    if (username) {
      await profilesApi.create(username);
    }
  } catch {
    // Non-fatal — user can still use the app; profile creation will be retried
    // on the next sign-in or can be handled in a dedicated onboarding screen.
  }
}

export default function RootLayout() {
  const { setSession, setLoading } = useAuthStore();

  // Load neumorphic fonts — block render until ready (no FOUT)
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      if (session?.user) {
        ensureProfile(session.user.id, session.user.user_metadata);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        ensureProfile(session.user.id, session.user.user_metadata);
      } else {
        router.replace("/(auth)/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  // Neumorphic splash — cool grey surface with accent spinner
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.cork }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
