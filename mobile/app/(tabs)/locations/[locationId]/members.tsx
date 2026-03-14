import { useState } from "react";
import { View, FlatList, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, User, UserPlus, UserMinus } from "lucide-react-native";
import { invitesApi } from "@/lib/api/invites";
import { useAuthStore } from "@/lib/store/auth-store";
import type { LocationMember } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MemberRowProps {
  username: string | null;
  label: string;
  isOwner: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

function MemberRow({ username, label, isOwner, canRemove, onRemove }: MemberRowProps) {
  return (
    <Card className="mb-2">
      <View className="flex-row items-center gap-3">
        <View className="rounded-full bg-primary/10 p-2">
          {isOwner ? <Crown size={16} color="#2563EB" /> : <User size={16} color="#64748B" />}
        </View>
        <View className="flex-1">
          <Text variant="body" className="font-semibold">
            @{username ?? "unknown"}
          </Text>
          <Text variant="caption">{label}</Text>
        </View>
        {canRemove && (
          <Button onPress={onRemove} variant="ghost" className="px-2">
            <UserMinus size={16} color="#EF4444" />
          </Button>
        )}
      </View>
    </Card>
  );
}

export default function MembersScreen() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showInviteInput, setShowInviteInput] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["members", locationId],
    queryFn: () => invitesApi.getMembers(locationId!),
    enabled: !!locationId,
  });

  const inviteMutation = useMutation({
    mutationFn: (username: string) => invitesApi.send(locationId!, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", locationId] });
      setInviteUsername("");
      setShowInviteInput(false);
      setInviteError(null);
      Alert.alert("Invite sent", "The user will see your invite when they open the app.");
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => invitesApi.removeMember(locationId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", locationId] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const isOwner = data?.owner.userId === user?.id;

  function confirmRemove(member: LocationMember) {
    const isSelf = member.userId === user?.id;
    Alert.alert(
      isSelf ? "Leave location" : "Remove member",
      isSelf
        ? "You will lose access to this location and all its contents."
        : `Remove @${member.username ?? member.userId} from this location?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isSelf ? "Leave" : "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(member.id),
        },
      ],
    );
  }

  function handleSendInvite() {
    const trimmed = inviteUsername.trim().toLowerCase();
    if (!trimmed) {
      setInviteError("Please enter a username.");
      return;
    }
    setInviteError(null);
    inviteMutation.mutate(trimmed);
  }

  return (
    <Screen>
      <PageHeader
        title="Members"
        subtitle="Who has access to this location"
        showBack
        onBack={() => router.back()}
        onAdd={isOwner ? () => setShowInviteInput((v) => !v) : undefined}
      />

      {/* Invite input — owner only */}
      {isOwner && showInviteInput && (
        <Card className="mb-4">
          <Text variant="caption" className="font-semibold mb-3">Invite by username</Text>
          <View className="gap-3">
            <Input
              placeholder="e.g. jane_doe"
              value={inviteUsername}
              onChangeText={setInviteUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inviteError && (
              <Text variant="caption" className="text-destructive">{inviteError}</Text>
            )}
            <View className="flex-row gap-2">
              <Button
                onPress={handleSendInvite}
                loading={inviteMutation.isPending}
                className="flex-1"
              >
                <View className="flex-row items-center gap-2">
                  <UserPlus size={16} color="#fff" />
                  <Text className="text-white font-semibold">Send invite</Text>
                </View>
              </Button>
              <Button
                onPress={() => { setShowInviteInput(false); setInviteError(null); }}
                variant="outline"
              >
                Cancel
              </Button>
            </View>
          </View>
        </Card>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={data?.members ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            data?.owner ? (
              <MemberRow
                username={data.owner.username}
                label="Owner"
                isOwner
                canRemove={false}
                onRemove={() => {}}
              />
            ) : null
          }
          renderItem={({ item }) => {
            const isSelf = item.userId === user?.id;
            const canRemove = isOwner || isSelf;
            const label = item.status === "PENDING"
              ? "Invited — pending"
              : item.status === "ACCEPTED"
              ? "Editor"
              : item.status;
            return (
              <MemberRow
                username={item.username}
                label={label}
                isOwner={false}
                canRemove={canRemove}
                onRemove={() => confirmRemove(item)}
              />
            );
          }}
          ListEmptyComponent={
            <Text variant="muted" className="text-center mt-6">
              No members yet. {isOwner ? "Use the + button to invite someone." : ""}
            </Text>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </Screen>
  );
}
