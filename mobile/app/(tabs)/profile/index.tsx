import { useState, useEffect, useRef } from "react";
import { View, Alert, Modal } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi } from "@/lib/api/profiles";
import { apiClient } from "@/lib/api/client";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationBell } from "@/components/ui/notification-bell";
import { EntityPhoto } from "@/components/ui/entity-photo";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, LogOut, AtSign, Trash2, Pencil } from "lucide-react-native";
import { COLORS } from "@/lib/theme/tokens";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import type { Profile } from "@/types";

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: profilesApi.getMe,
    enabled: !!user,
  });

  // Avatar upload
  const avatarMutation = useMutation({
    mutationFn: (avatarPath: string | null) => profilesApi.updateAvatar(avatarPath),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
    onError: (e: Error) => Alert.alert("Update failed", e.message),
  });

  const { showActionSheet: showAvatarSheet, isUploading: uploadingAvatar } = useImageUpload({
    bucket: "avatars",
    buildPath: () => `${user!.id}`,
    onUpload: async (imagePath) => { await avatarMutation.mutateAsync(imagePath); },
    onRemove: async () => { await avatarMutation.mutateAsync(null); },
  });

  // Debounced username availability check
  useEffect(() => {
    if (!showEdit) return;
    const trimmed = editUsername.trim().toLowerCase();

    if (trimmed === profile?.username) {
      setUsernameStatus("available");
      return;
    }
    if (!trimmed) { setUsernameStatus("idle"); return; }
    if (!USERNAME_REGEX.test(trimmed)) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { available } = await profilesApi.checkUsername(trimmed);
      setUsernameStatus(available ? "available" : "taken");
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [editUsername, showEdit, profile?.username]);

  const updateMutation = useMutation({
    mutationFn: async ({ fullName, username }: { fullName: string; username: string }) => {
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedName = fullName.trim();

      if (trimmedName !== (user?.user_metadata?.full_name ?? "")) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: trimmedName } });
        if (error) throw new Error(error.message);
      }

      if (trimmedUsername !== profile?.username) {
        await profilesApi.updateUsername(trimmedUsername);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      supabase.auth.refreshSession();
      setShowEdit(false);
      setSaveError(null);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  function openEdit() {
    setEditFullName(user?.user_metadata?.full_name ?? "");
    setEditUsername(profile?.username ?? "");
    setUsernameStatus("available");
    setSaveError(null);
    setShowEdit(true);
  }

  function handleSave() {
    if (!editUsername.trim()) { setSaveError("Username is required."); return; }
    if (usernameStatus === "taken") { setSaveError("That username is already taken."); return; }
    if (usernameStatus === "invalid") { setSaveError("Username must be 3–30 chars: lowercase, numbers, underscores only."); return; }
    if (usernameStatus === "checking") { setSaveError("Please wait while we check username availability."); return; }
    setSaveError(null);
    updateMutation.mutate({ fullName: editFullName, username: editUsername });
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your inventory data — locations, cabinets, shelves, and items. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: confirmDeleteAccount },
      ],
    );
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Are you absolutely sure?",
      'Tap "Yes, delete" only if you are certain. All data will be gone permanently.',
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, delete", style: "destructive", onPress: executeDeleteAccount },
      ],
    );
  }

  async function executeDeleteAccount() {
    setDeletingAccount(true);
    try {
      await apiClient.delete("/api/account");
      await supabase.auth.signOut();
    } catch (e) {
      setDeletingAccount(false);
      Alert.alert("Deletion failed", (e as Error).message ?? "Something went wrong. Please try again.");
    }
  }

  const typedProfile = profile as unknown as Profile | null;

  const usernameHint =
    usernameStatus === "checking" ? "Checking…"
    : usernameStatus === "taken" ? "Username already taken"
    : usernameStatus === "invalid" ? "3–30 chars: lowercase, numbers, underscores only"
    : usernameStatus === "available" && editUsername.trim() !== profile?.username ? "Available!"
    : undefined;

  const usernameHintColor =
    usernameStatus === "available" ? "text-green-600"
    : usernameStatus === "taken" || usernameStatus === "invalid" ? "text-destructive"
    : "text-muted-foreground";

  return (
    <Screen>
      <PageHeader title="Profile" rightElement={<NotificationBell />} />

      {/* ── User card ─────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <View className="items-center py-4">
          <View className="mb-3">
            <EntityPhoto
              signedUrl={typedProfile?.signedAvatarUrl}
              onPress={showAvatarSheet}
              isUploading={uploadingAvatar || avatarMutation.isPending}
              size="xl"
              shape="circle"
              FallbackIcon={User}
            />
          </View>
          <Text variant="h3">
            {user?.user_metadata?.full_name ?? profile?.username ?? "Inventory Owner"}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-2">
            <Mail size={14} color={COLORS.mutedForeground} />
            <Text variant="caption">{user?.email}</Text>
          </View>
          {profile?.username && (
            <View className="flex-row items-center gap-1.5 mt-1">
              <AtSign size={14} color={COLORS.mutedForeground} />
              <Text variant="caption">{profile.username}</Text>
            </View>
          )}
        </View>

        <Button onPress={openEdit} variant="outline" className="mx-2 mb-2">
          <View className="flex-row items-center gap-2">
            <Pencil size={15} color={COLORS.foreground} />
            <Text className="text-foreground font-semibold">Edit profile</Text>
          </View>
        </Button>
      </Card>

      {/* ── Account details ───────────────────────────────────────────── */}
      <Card className="mb-6">
        <View className="gap-2">
          <Text variant="caption" className="font-semibold uppercase tracking-widest mb-1">
            Account
          </Text>
          <View className="flex-row justify-between items-center py-1">
            <Text variant="body">Member since</Text>
            <Text variant="caption">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <Button onPress={handleSignOut} variant="outline" className="mb-3">
          <View className="flex-row items-center gap-2">
            <LogOut size={16} color={COLORS.foreground} />
          <Text className="text-foreground font-semibold">Sign out</Text>
        </View>
      </Button>

      <Button onPress={handleDeleteAccount} variant="destructive" loading={deletingAccount} disabled={deletingAccount}>
          <View className="flex-row items-center gap-2">
            <Trash2 size={16} color={COLORS.primaryForeground} />
          <Text className="text-white font-semibold">
            {deletingAccount ? "Deleting…" : "Delete account"}
          </Text>
        </View>
      </Button>

      {/* ── Edit profile modal ─────────────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="Edit Profile" showBack={false} />
          <View className="gap-4">
            <Input
              label="Full name"
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="e.g. Jane Doe"
              autoCapitalize="words"
            />

            <View>
              <Input
                label="Username"
                value={editUsername}
                onChangeText={(v) => setEditUsername(v.toLowerCase().trim())}
                placeholder="e.g. jane_doe"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameHint && (
                <Text variant="caption" className={`mt-1 ${usernameHintColor}`}>
                  {usernameHint}
                </Text>
              )}
            </View>

            {saveError && <Text variant="caption" className="text-destructive">{saveError}</Text>}

            <Button
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={usernameStatus === "taken" || usernameStatus === "checking"}
              className="mt-2"
            >
              Save Changes
            </Button>
            <Button onPress={() => { setShowEdit(false); setSaveError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
