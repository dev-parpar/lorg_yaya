import { useState } from "react";
import { View, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi } from "@/lib/api/profiles";
import { apiClient } from "@/lib/api/client";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, LogOut, AtSign, Trash2 } from "lucide-react-native";

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: profilesApi.getMe,
    enabled: !!user,
  });

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  function handleDeleteAccount() {
    // Step 1 — warn the user clearly
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your inventory data — locations, cabinets, shelves, and items. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ],
    );
  }

  function confirmDeleteAccount() {
    // Step 2 — require explicit final confirmation
    Alert.alert(
      "Are you absolutely sure?",
      "Type-to-confirm is not available on mobile. Tap \"Yes, delete\" only if you are certain. All data will be gone permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete",
          style: "destructive",
          onPress: executeDeleteAccount,
        },
      ],
    );
  }

  async function executeDeleteAccount() {
    setDeletingAccount(true);
    try {
      await apiClient.delete("/api/account");
      // Sign out locally — the auth listener in _layout.tsx redirects to login
      await supabase.auth.signOut();
    } catch (e) {
      setDeletingAccount(false);
      Alert.alert(
        "Deletion failed",
        (e as Error).message ?? "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <Screen>
      <View className="pt-2 mb-6">
        <Text variant="h2">Profile</Text>
      </View>

      {/* ── User card ───────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <View className="items-center py-4">
          <View className="rounded-full bg-primary/10 p-5 mb-3">
            <User size={36} color="#2563EB" />
          </View>
          <Text variant="h3">
            {user?.user_metadata?.full_name ?? profile?.username ?? "Inventory Owner"}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-2">
            <Mail size={14} color="#64748B" />
            <Text variant="caption">{user?.email}</Text>
          </View>
          {profile?.username && (
            <View className="flex-row items-center gap-1.5 mt-1">
              <AtSign size={14} color="#64748B" />
              <Text variant="caption">{profile.username}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* ── Account details ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <View className="gap-2">
          <Text variant="caption" className="font-semibold uppercase tracking-widest mb-1">
            Account
          </Text>
          <View className="flex-row justify-between items-center py-1">
            <Text variant="body">User ID</Text>
            <Text variant="caption" className="max-w-[180px] text-right" numberOfLines={1}>
              {user?.id}
            </Text>
          </View>
          <View className="flex-row justify-between items-center py-1">
            <Text variant="body">Member since</Text>
            <Text variant="caption">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <Button onPress={handleSignOut} variant="outline" className="mb-3">
        <View className="flex-row items-center gap-2">
          <LogOut size={16} color="#0F172A" />
          <Text className="text-foreground font-semibold">Sign out</Text>
        </View>
      </Button>

      <Button
        onPress={handleDeleteAccount}
        variant="destructive"
        loading={deletingAccount}
        disabled={deletingAccount}
      >
        <View className="flex-row items-center gap-2">
          <Trash2 size={16} color="#fff" />
          <Text className="text-white font-semibold">
            {deletingAccount ? "Deleting…" : "Delete account"}
          </Text>
        </View>
      </Button>
    </Screen>
  );
}
