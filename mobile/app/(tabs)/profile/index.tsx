import { View, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi } from "@/lib/api/profiles";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, LogOut, AtSign } from "lucide-react-native";

export default function ProfileScreen() {
  const { user } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: profilesApi.getMe,
    enabled: !!user,
  });

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <Screen>
      <View className="pt-2 mb-6">
        <Text variant="h2">Profile</Text>
      </View>

      <Card className="mb-4">
        <View className="items-center py-4">
          <View className="rounded-full bg-primary/10 p-5 mb-3">
            <User size={36} color="#2563EB" />
          </View>
          <Text variant="h3">
            {profile?.username ? `@${profile.username}` : (user?.user_metadata?.full_name ?? "Inventory Owner")}
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

      <Card className="mb-4">
        <View className="gap-2">
          <Text variant="caption" className="font-semibold uppercase tracking-widest mb-1">Account</Text>
          <View className="flex-row justify-between items-center py-1">
            <Text variant="body">User ID</Text>
            <Text variant="caption" className="max-w-[180px] text-right" numberOfLines={1}>{user?.id}</Text>
          </View>
          <View className="flex-row justify-between items-center py-1">
            <Text variant="body">Member since</Text>
            <Text variant="caption">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>
      </Card>

      <Button onPress={handleSignOut} variant="destructive" className="mt-4">
        <View className="flex-row items-center gap-2">
          <LogOut size={16} color="#fff" />
          <Text className="text-white font-semibold">Sign out</Text>
        </View>
      </Button>
    </Screen>
  );
}
