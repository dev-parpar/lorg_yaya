import "../global.css";
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi } from "@/lib/api/profiles";

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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
