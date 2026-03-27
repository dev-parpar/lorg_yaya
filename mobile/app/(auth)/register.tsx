import { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/auth/supabase";
import { profilesApi } from "@/lib/api/profiles";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function useUsernameCheck(username: string, delay = 500) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = username.toLowerCase().trim();

    if (!trimmed) {
      setStatus("idle");
      setMessage(null);
      return;
    }

    if (trimmed.length < 3) {
      setStatus("invalid");
      setMessage("At least 3 characters required.");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setStatus("invalid");
      setMessage("Only lowercase letters, numbers, and underscores.");
      return;
    }

    setStatus("checking");
    setMessage(null);

    const timer = setTimeout(async () => {
      try {
        const result = await profilesApi.checkUsername(trimmed);
        if (result.error) {
          setStatus("invalid");
          setMessage(result.error);
        } else {
          setStatus(result.available ? "available" : "taken");
          setMessage(result.available ? "Username is available!" : "Username is already taken.");
        }
      } catch {
        setStatus("idle");
        setMessage(null);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [username, delay]);

  return { status, message };
}

function UsernameStatusBadge({ status, message }: { status: UsernameStatus; message: string | null }) {
  if (!message) return null;

  const colors: Record<UsernameStatus, string> = {
    idle: "text-muted-foreground",
    checking: "text-muted-foreground",
    available: "text-green-600",
    taken: "text-destructive",
    invalid: "text-destructive",
  };

  return <Text variant="caption" className={`mt-1 ${colors[status]}`}>{message}</Text>;
}

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status: usernameStatus, message: usernameMessage } = useUsernameCheck(username);

  async function handleRegister() {
    const trimmedName = name.trim();
    const trimmedUsername = username.toLowerCase().trim();

    if (!trimmedName || !email.trim() || !trimmedUsername || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("That username is already taken. Please choose another.");
      return;
    }
    if (usernameStatus === "invalid" || usernameStatus === "checking") {
      setError("Please wait for username validation to complete.");
      return;
    }
    if (usernameStatus !== "available") {
      setError("Please enter a valid, available username.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Step 1: Create Supabase auth user, storing username in metadata.
      // emailRedirectTo must point to the deployed API host so the confirmation
      // link in the email does not redirect to localhost.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: trimmedName, username: trimmedUsername },
          emailRedirectTo: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/auth/confirm`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Step 2: If we have an immediate session (email confirmation disabled),
      // create the profile straight away.
      if (authData.session) {
        try {
          await profilesApi.create(trimmedUsername);
        } catch {
          // Profile creation failure is non-fatal here — the root layout
          // will retry on next sign-in using user_metadata.username.
        }
        // Auth state listener in _layout.tsx handles the redirect.
        return;
      }

      // Step 3: Email confirmation required — navigate to verify screen.
      // The username is stored in user_metadata and will be used to create
      // the profile automatically after the user confirms and signs in.
      router.replace("/(auth)/verify-email");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center"
      >
        <View className="mb-10">
          <Text variant="h1" className="mb-2">Create account</Text>
          <Text variant="muted">Start managing your inventory</Text>
        </View>

        <View className="gap-4">
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane Smith"
            autoCapitalize="words"
            autoComplete="name"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View>
            <Input
              label="Username"
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              placeholder="e.g. john_doe"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <UsernameStatusBadge status={usernameStatus} message={usernameMessage} />
          </View>

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            secureTextEntry
          />

          {error && (
            <Text variant="caption" className="text-destructive">{error}</Text>
          )}

          <Button
            onPress={handleRegister}
            loading={loading}
            disabled={usernameStatus === "checking" || usernameStatus === "taken" || usernameStatus === "invalid"}
            className="mt-2"
          >
            Create account
          </Button>
        </View>

        <View className="flex-row justify-center mt-8 gap-1">
          <Text variant="muted">Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text variant="body" className="text-primary font-semibold">Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
