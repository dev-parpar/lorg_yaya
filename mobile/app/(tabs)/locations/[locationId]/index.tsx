import { useState } from "react";
import { FlatList, View, Modal, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react-native";
import { locationsApi } from "@/lib/api/locations";
import { cabinetsApi } from "@/lib/api/cabinets";
import type { CabinetWithCounts } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CabinetCard({
  cabinet,
  onPress,
  onDelete,
}: {
  cabinet: CabinetWithCounts;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center gap-3">
        <View className="rounded-xl bg-blue-50 p-3">
          <Package size={22} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text variant="h3">{cabinet.name}</Text>
          {cabinet.description && (
            <Text variant="caption" className="mt-0.5">{cabinet.description}</Text>
          )}
          <Text variant="caption" className="mt-1">
            {cabinet._count.shelves} shelf(s) · {cabinet._count.items} item(s)
          </Text>
        </View>
        <Button onPress={onDelete} variant="ghost" className="px-2">
          <Text className="text-destructive text-xs">Delete</Text>
        </Button>
      </View>
    </Card>
  );
}

export default function LocationDetailScreen() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: () => locationsApi.get(locationId),
    enabled: !!locationId,
  });

  const { data: cabinets, isLoading, error, refetch } = useQuery({
    queryKey: ["cabinets", locationId],
    queryFn: () => locationsApi.getCabinets(locationId),
    enabled: !!locationId,
  });

  const createMutation = useMutation({
    mutationFn: cabinetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] });
      setShowForm(false);
      setFormName("");
      setFormDescription("");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: cabinetsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] }),
  });

  function handleCreate() {
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setFormError(null);
    createMutation.mutate({
      locationId,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
    });
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Delete Cabinet", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinets" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinets" showBack />
        <ErrorView message={(error as Error).message} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PageHeader
        title={location?.name ?? "Cabinets"}
        subtitle={`${cabinets?.length ?? 0} cabinet(s)`}
        showBack
        onAdd={() => setShowForm(true)}
      />

      <FlatList
        data={cabinets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CabinetCard
            cabinet={item}
            onPress={() => router.push(`/(tabs)/locations/${locationId}/${item.id}`)}
            onDelete={() => confirmDelete(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Package}
            title="No cabinets yet"
            description="Add a cabinet to start storing items."
            action={<Button onPress={() => setShowForm(true)}>Add Cabinet</Button>}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Cabinet" showBack={false} />
          <View className="gap-4">
            <Input label="Name" value={formName} onChangeText={setFormName} placeholder="e.g. Kitchen Cabinet" />
            <Input
              label="Description (optional)"
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="What goes here?"
              multiline
              numberOfLines={3}
            />
            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}
            <Button onPress={handleCreate} loading={createMutation.isPending} className="mt-2">
              Create Cabinet
            </Button>
            <Button onPress={() => { setShowForm(false); setFormError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
