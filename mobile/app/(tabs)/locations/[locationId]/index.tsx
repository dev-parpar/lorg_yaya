import { useState } from "react";
import { FlatList, View, Modal, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Pencil } from "lucide-react-native";
import { locationsApi } from "@/lib/api/locations";
import { COLORS } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { useLocalCabinets } from "@/lib/hooks/useLocalCabinets";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";
import { EntityPhoto } from "@/components/ui/entity-photo";
import type { CabinetWithCounts } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Edit cabinet modal — owns its own useImageUpload instance ────────────────

function EditCabinetModal({
  cabinet,
  locationId,
  onUpdate,
  onClose,
}: {
  cabinet: CabinetWithCounts;
  locationId: string;
  onUpdate: (cabinetId: string, changes: Partial<{
    name: string;
    description: string | null;
    imagePath: string | null;
    signedImageUrl: string | null;
  }>) => Promise<void>;
  onClose: () => void;
}) {
  const { user } = useAuthStore();

  const [name, setName] = useState(cabinet.name);
  const [desc, setDesc] = useState(cabinet.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    cabinet.signedImageUrl,
  );

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "cabinets",
    buildPath: () => `${user!.id}/${cabinet.id}`,
    onUpload: async (imagePath, signedUrl) => {
      await onUpdate(cabinet.id, { imagePath, signedImageUrl: signedUrl });
      setLocalSignedUrl(signedUrl);
    },
    onRemove: async () => {
      await onUpdate(cabinet.id, { imagePath: null, signedImageUrl: null });
      setLocalSignedUrl(null);
    },
  });

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      await onUpdate(cabinet.id, {
        name: name.trim(),
        description: desc.trim() || null,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
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
        <Button onPress={handleSave} loading={saving} className="mt-2">
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
          <View className="rounded-xl bg-primary/10 p-3">
            <Package size={22} color={COLORS.primary} />
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
            <Pencil size={16} color={COLORS.mutedForeground} />
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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingCabinet, setEditingCabinet] = useState<CabinetWithCounts | null>(null);

  // Location metadata still lives in PostgreSQL
  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: () => locationsApi.get(locationId),
    enabled: !!locationId,
  });

  // Cabinets now come from local SQLite
  const { cabinets, isLoading, create, update, remove } = useLocalCabinets(locationId);
  const { pendingCount, hasError, isSynced } = useSyncStatus(locationId);

  async function handleCreate() {
    if (!createName.trim()) { setCreateError("Name is required."); return; }
    setCreateError(null);
    setCreating(true);
    try {
      await create(createName.trim(), createDesc.trim() || null);
      setShowCreateForm(false);
      setCreateName("");
      setCreateDesc("");
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Delete Cabinet", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove(id) },
    ]);
  }

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinets" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PageHeader
        title={location?.name ?? "Cabinets"}
        subtitle={`${cabinets.length} cabinet(s)${pendingCount > 0 ? ` · ${pendingCount} pending` : hasError ? " · sync error" : ""}`}
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
            <Button onPress={handleCreate} loading={creating} className="mt-2">
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
            locationId={locationId}
            onUpdate={update}
            onClose={() => setEditingCabinet(null)}
          />
        )}
      </Modal>
    </Screen>
  );
}
