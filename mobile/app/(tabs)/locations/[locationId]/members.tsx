import { useState } from "react";
import { View, FlatList, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
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

function MemberRow({
  username,
  label,
  isOwner,
  canRemove,
  onRemove,
}: {
  username: string | null;
  label: string;
  isOwner: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
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
      setInviteError(null);
      Alert.alert(
        "Invite sent",
        "They will see the invite in their Profile tab under 'Location invites'.",
      );
    },
    onError: (e: Error) => {
      Alert.alert("Could not send invite", e.message);
    },
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

  // Shown as FlatList header so it scrolls with the list and never nests
  // inside a separate ScrollView.
  const ListHeader = (
    <>
      {/* Invite section — visible immediately once ownership is confirmed */}
      {isOwner && (
        <Card className="mb-4">
          <Text variant="caption" className="font-semibold mb-3 uppercase tracking-widest">
            Invite a member
          </Text>
          <View className="gap-3">
            <Input
              placeholder="Enter username, e.g. jane_doe"
              value={inviteUsername}
              onChangeText={(v) => {
                setInviteUsername(v);
                setInviteError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inviteError && (
              <Text variant="caption" className="text-destructive">{inviteError}</Text>
            )}
            <Button
              onPress={handleSendInvite}
              loading={inviteMutation.isPending}
              disabled={!inviteUsername.trim()}
            >
              <View className="flex-row items-center gap-2">
                <UserPlus size={16} color="#fff" />
                <Text className="text-white font-semibold">Send invite</Text>
              </View>
            </Button>
          </View>
        </Card>
      )}

      {/* Section title */}
      <Text variant="caption" className="font-semibold uppercase tracking-widest mb-3">
        Current members
      </Text>

      {/* Owner row always first */}
      {data?.owner && (
        <MemberRow
          username={data.owner.username}
          label="Owner"
          isOwner
          canRemove={false}
          onRemove={() => {}}
        />
      )}
    </>
  );

  return (
    // scroll={false} prevents nesting FlatList inside a ScrollView
    <Screen scroll={false}>
      <PageHeader
        title="Members"
        subtitle="Who has access to this location"
        showBack
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={data?.members ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => {
            const isSelf = item.userId === user?.id;
            const canRemove = isOwner || isSelf;
            const label =
              item.status === "PENDING"
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
            <Text variant="muted" className="text-center mt-2">
              No members yet.{isOwner ? " Use the form above to invite someone." : ""}
            </Text>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </Screen>
  );
}
