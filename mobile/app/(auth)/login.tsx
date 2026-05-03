import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/auth/supabase";
import { posthog } from "@/lib/analytics/posthog";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (!authError) {
      posthog?.capture("user_logged_in", { method: "email" });
    }

    if (authError) {
      const msg = authError.message.toLowerCase();

      if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
        setError("Please check your email and click the confirmation link before signing in.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("banned") || msg.includes("user not allowed")) {
        // Supabase hard-deletes the auth user on account deletion, so this
        // path is a safety net for any edge cases.
        setError("This account no longer exists. Please register a new account.");
      } else {
        setError(authError.message);
      }
    }
    // Auth state listener in _layout.tsx handles redirect on success
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center"
      >
        <View className="mb-10">
          <Text variant="h1" className="mb-2">Welcome back</Text>
          <Text variant="muted">Sign in to your inventory</Text>
        </View>

        <View className="gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          {error && (
            <Text variant="caption" className="text-destructive">{error}</Text>
          )}

          <Button onPress={handleLogin} loading={loading} className="mt-2">
            Sign in
          </Button>
        </View>

        <View className="flex-row justify-center mt-8 gap-1">
          <Text variant="muted">No account?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text variant="body" className="text-primary font-semibold">Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
