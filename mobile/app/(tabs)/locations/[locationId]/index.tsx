import { useState } from "react";
import { FlatList, View, Modal, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil } from "lucide-react-native";
import { locationsApi } from "@/lib/api/locations";
import { cabinetsApi } from "@/lib/api/cabinets";
import { useAuthStore } from "@/lib/store/auth-store";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { EntityPhoto } from "@/components/ui/entity-photo";
import type { CabinetWithCounts } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Edit cabinet modal — owns its own useImageUpload instance ────────────────

function EditCabinetModal({
  cabinet,
  onClose,
}: {
  cabinet: CabinetWithCounts;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { locationId } = useLocalSearchParams<{ locationId: string }>();

  const [name, setName] = useState(cabinet.name);
  const [desc, setDesc] = useState(cabinet.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    cabinet.signedImageUrl,
  );

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof cabinetsApi.update>[1]) =>
      cabinetsApi.update(cabinet.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] }),
    onError: (e: Error) => setError(e.message),
  });

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "cabinets",
    buildPath: () => `${user!.id}/${cabinet.id}`,
    onUpload: async (imagePath) => {
      const updated = await cabinetsApi.update(cabinet.id, { imagePath });
      queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
    onRemove: async () => {
      const updated = await cabinetsApi.update(cabinet.id, { imagePath: null });
      queryClient.invalidateQueries({ queryKey: ["cabinets", locationId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
  });

  function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    updateMutation.mutate(
      { name: name.trim(), description: desc.trim() || undefined },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Screen>
      <PageHeader title="Edit Cabinet" showBack={false} />
      <View className="gap-4">
        <View className="items-center mb-2">
          <EntityPhoto
            signedUrl={localSignedUrl}
            onPress={showActionSheet}
            isUploading={isUploading}
            size="xl"
            shape="rounded"
            FallbackIcon={Package}
          />
        </View>
        <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Kitchen Cabinet" />
        <Input
          label="Description (optional)"
          value={desc}
          onChangeText={setDesc}
          placeholder="What goes here?"
          multiline
          numberOfLines={3}
        />
        {error && <Text variant="caption" className="text-destructive">{error}</Text>}
        <Button onPress={handleSave} loading={updateMutation.isPending} className="mt-2">
          Save Changes
        </Button>
        <Button onPress={onClose} variant="ghost">Cancel</Button>
      </View>
    </Screen>
  );
}

// ── Cabinet card ──────────────────────────────────────────────────────────

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
        {cabinet.signedImageUrl ? (
          <Image
            source={{ uri: cabinet.signedImageUrl }}
            style={{ width: 52, height: 52, borderRadius: 12 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="rounded-xl bg-blue-50 p-3">
            <Package size={22} color="#2563EB" />
          </View>
        )}
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

// ── Main screen ───────────────────────────────────────────────────────────

export default function LocationDetailScreen() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingCabinet, setEditingCabinet] = useState<CabinetWithCounts | null>(null);

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
            onEdit={() => setEditingCabinet(item)}
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

      {/* ── Edit cabinet modal (owns its own useImageUpload) ──────────── */}
      <Modal visible={!!editingCabinet} animationType="slide" presentationStyle="pageSheet">
        {editingCabinet && (
          <EditCabinetModal
            cabinet={editingCabinet}
            onClose={() => setEditingCabinet(null)}
          />
        )}
      </Modal>
    </Screen>
  );
}
