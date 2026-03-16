import { useState } from "react";
import { FlatList, View, Modal, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil } from "lucide-react-native";
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
  onEdit,
  onDelete,
}: {
  cabinet: CabinetWithCounts;
  onPress: () => void;
  onEdit: () => void;
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
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={onEdit} className="p-2">
            <Pencil size={16} color="#64748B" />
          </TouchableOpacity>
          <Button onPress={onDelete} variant="ghost" className="px-2">
            <Text className="text-destructive text-xs">Delete</Text>
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function LocationDetailScreen() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form
  const [editingCabinet, setEditingCabinet] = useState<CabinetWithCounts | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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
      setShowCreateForm(false);
      setCreateName("");
      setCreateDesc("");
      setCreateError(null);
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      cabinetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] });
      setEditingCabinet(null);
      setEditError(null);
    },
    onError: (e: Error) => setEditError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: cabinetsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] }),
  });

  function handleCreate() {
    if (!createName.trim()) { setCreateError("Name is required."); return; }
    setCreateError(null);
    createMutation.mutate({
      locationId,
      name: createName.trim(),
      description: createDesc.trim() || undefined,
    });
  }

  function openEdit(cab: CabinetWithCounts) {
    setEditName(cab.name);
    setEditDesc(cab.description ?? "");
    setEditError(null);
    setEditingCabinet(cab);
  }

  function handleUpdate() {
    if (!editingCabinet) return;
    if (!editName.trim()) { setEditError("Name is required."); return; }
    setEditError(null);
    updateMutation.mutate({
      id: editingCabinet.id,
      data: { name: editName.trim(), description: editDesc.trim() || undefined },
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
        onAdd={() => setShowCreateForm(true)}
      />

      <FlatList
        data={cabinets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CabinetCard
            cabinet={item}
            onPress={() => router.push(`/(tabs)/locations/${locationId}/${item.id}`)}
            onEdit={() => openEdit(item)}
            onDelete={() => confirmDelete(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Package}
            title="No cabinets yet"
            description="Add a cabinet to start storing items."
            action={<Button onPress={() => setShowCreateForm(true)}>Add Cabinet</Button>}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      />

      {/* ── Create cabinet modal ──────────────────────────────────────── */}
      <Modal visible={showCreateForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Cabinet" showBack={false} />
          <View className="gap-4">
            <Input label="Name" value={createName} onChangeText={setCreateName} placeholder="e.g. Kitchen Cabinet" />
            <Input
              label="Description (optional)"
              value={createDesc}
              onChangeText={setCreateDesc}
              placeholder="What goes here?"
              multiline
              numberOfLines={3}
            />
            {createError && <Text variant="caption" className="text-destructive">{createError}</Text>}
            <Button onPress={handleCreate} loading={createMutation.isPending} className="mt-2">
              Create Cabinet
            </Button>
            <Button onPress={() => { setShowCreateForm(false); setCreateError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>

      {/* ── Edit cabinet modal ────────────────────────────────────────── */}
      <Modal visible={!!editingCabinet} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="Edit Cabinet" showBack={false} />
          <View className="gap-4">
            <Input label="Name" value={editName} onChangeText={setEditName} placeholder="e.g. Kitchen Cabinet" />
            <Input
              label="Description (optional)"
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="What goes here?"
              multiline
              numberOfLines={3}
            />
            {editError && <Text variant="caption" className="text-destructive">{editError}</Text>}
            <Button onPress={handleUpdate} loading={updateMutation.isPending} className="mt-2">
              Save Changes
            </Button>
            <Button onPress={() => { setEditingCabinet(null); setEditError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
