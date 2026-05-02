import { View, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Building2, Mail } from "lucide-react-native";
import { invitesApi } from "@/lib/api/invites";
import type { Invite } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

function InviteCard({
  invite,
  onAccept,
  onDecline,
  isResponding,
}: {
  invite: Invite;
  onAccept: () => void;
  onDecline: () => void;
  isResponding: boolean;
}) {
  const Icon = invite.location.type === "HOME" ? Home : Building2;
  return (
    <Card className="mb-3">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="rounded-xl bg-primary/10 p-3">
          <Icon size={20} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text variant="h3">{invite.location.name}</Text>
          <Text variant="caption">
            {invite.location.type}
            {invite.location.address ? ` · ${invite.location.address}` : ""}
          </Text>
          <Text variant="caption" className="text-muted-foreground mt-0.5">
            Invited by @{invite.invitedByUsername ?? "unknown"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button onPress={onAccept} loading={isResponding} className="flex-1">
          Accept
        </Button>
        <Button onPress={onDecline} variant="outline" disabled={isResponding} className="flex-1">
          Decline
        </Button>
      </View>
    </Card>
  );
}

export default function InvitesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: invites, isLoading } = useQuery({
    queryKey: ["invites"],
    queryFn: invitesApi.list,
  });

  const respondMutation = useMutation({
    mutationFn: ({ inviteId, action }: { inviteId: string; action: "accept" | "decline" }) =>
      invitesApi.respond(inviteId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  return (
    <Screen scroll={false}>
      <PageHeader
        title="Invites"
        subtitle="Pending location invites"
        showBack
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={invites ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InviteCard
              invite={item}
              isResponding={respondMutation.isPending}
              onAccept={() => respondMutation.mutate({ inviteId: item.id, action: "accept" })}
              onDecline={() => respondMutation.mutate({ inviteId: item.id, action: "decline" })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Mail}
              title="No pending invites"
              description="When someone invites you to their location, it will appear here."
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        />
      )}
    </Screen>
  );
}
