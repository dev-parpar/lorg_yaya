import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/auth/supabase";
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

    if (authError) {
      setError(authError.message);
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
