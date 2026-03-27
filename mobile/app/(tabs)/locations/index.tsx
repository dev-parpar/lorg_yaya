import { useState } from "react";
import { FlatList, View, Modal, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Building2, Users, Plus, Pencil } from "lucide-react-native";
import { locationsApi } from "@/lib/api/locations";
import { COLORS } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { EntityPhoto } from "@/components/ui/entity-photo";
import type { LocationWithCounts } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationFormState {
  name: string;
  type: "HOME" | "OFFICE";
  address: string;
}

// ── Edit modal — owns its own useImageUpload instance ───────────────────────

function EditLocationModal({
  location,
  onClose,
}: {
  location: LocationWithCounts;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState<LocationFormState>({
    name: location.name,
    type: location.type as "HOME" | "OFFICE",
    address: location.address ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  // Track local signedImageUrl so photo updates show immediately
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    location.signedImageUrl,
  );

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof locationsApi.update>[1]) =>
      locationsApi.update(location.id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
    onError: (e: Error) => setError(e.message),
  });

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "locations",
    buildPath: () => `${user!.id}/${location.id}`,
    onUpload: async (imagePath) => {
      const updated = await locationsApi.update(location.id, { imagePath });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
    onRemove: async () => {
      const updated = await locationsApi.update(location.id, { imagePath: null });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
  });

  function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setError(null);
    updateMutation.mutate(
      { name: form.name.trim(), type: form.type, address: form.address.trim() || undefined },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Screen>
      <PageHeader title="Edit Location" showBack={false} />
      <View className="gap-4">
        {/* Photo */}
        <View className="items-center mb-2">
          <EntityPhoto
            signedUrl={localSignedUrl}
            onPress={showActionSheet}
            isUploading={isUploading}
            size="xl"
            shape="rounded"
            FallbackIcon={form.type === "OFFICE" ? Building2 : Home}
          />
        </View>

        <Input
          label="Name"
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Main House"
        />
        <View>
          <Text variant="caption" className="font-medium text-foreground mb-2">Type</Text>
          <View className="flex-row gap-3">
            {(["HOME", "OFFICE"] as const).map((t) => (
              <Button
                key={t}
                variant={form.type === t ? "primary" : "outline"}
                onPress={() => setForm((f) => ({ ...f, type: t }))}
                className="flex-1"
              >
                {t === "HOME" ? "Home" : "Office"}
              </Button>
            ))}
          </View>
        </View>
        <Input
          label="Address (optional)"
          value={form.address}
          onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
          placeholder="123 Main St"
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

// ── Location card ─────────────────────────────────────────────────────────

function LocationCard({
  location,
  onPress,
  onEdit,
  onDelete,
  onMembers,
}: {
  location: LocationWithCounts;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMembers: () => void;
}) {
  const Icon = location.type === "HOME" ? Home : Building2;
  const isOwner = location.role === "OWNER";

  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center gap-3">
        {location.signedImageUrl ? (
          <Image
            source={{ uri: location.signedImageUrl }}
            style={{ width: 52, height: 52, borderRadius: 12 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="rounded-xl bg-primary/10 p-3">
            <Icon size={22} color={COLORS.primary} />
          </View>
        )}

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="h3">{location.name}</Text>
            {!isOwner && (
              <View style={{ backgroundColor: "rgba(212,168,83,0.25)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: COLORS.warning, fontSize: 11, fontWeight: "600" }}>Shared</Text>
              </View>
            )}
          </View>
          <Text variant="caption">
            {location.type} · {location._count.cabinets} cabinet{location._count.cabinets !== 1 ? "s" : ""}
          </Text>
          {location.address && (
            <Text variant="caption" className="text-muted-foreground mt-0.5">
              {location.address}
            </Text>
          )}
        </View>

          <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={onMembers} className="p-2">
            <Users size={16} color={COLORS.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} className="p-2">
            <Pencil size={16} color={COLORS.mutedForeground} />
          </TouchableOpacity>
          {isOwner && (
            <Button onPress={onDelete} variant="ghost" className="px-2">
              <Text className="text-destructive text-xs">Delete</Text>
            </Button>
          )}
        </View>
      </View>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function LocationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<LocationFormState>({ name: "", type: "HOME", address: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingLocation, setEditingLocation] = useState<LocationWithCounts | null>(null);

  const { data: locations, isLoading, error, refetch } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setShowCreateForm(false);
      setCreateForm({ name: "", type: "HOME", address: "" });
      setCreateError(null);
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  function handleCreate() {
    if (!createForm.name.trim()) { setCreateError("Name is required."); return; }
    setCreateError(null);
    createMutation.mutate({
      name: createForm.name.trim(),
      type: createForm.type,
      address: createForm.address.trim() || undefined,
    });
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Delete Location", `Delete "${name}" and all its contents?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const headerRight = (
    <View className="flex-row items-center gap-1">
      <NotificationBell />
      <TouchableOpacity
        onPress={() => setShowCreateForm(true)}
        className="bg-primary rounded-full p-2.5 ml-1"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Plus size={20} color={COLORS.primaryForeground} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Locations" rightElement={headerRight} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Locations" rightElement={headerRight} />
        <ErrorView message={(error as Error).message} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PageHeader title="Locations" subtitle="Your homes & offices" rightElement={headerRight} />

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => router.push(`/(tabs)/locations/${item.id}`)}
            onEdit={() => setEditingLocation(item)}
            onDelete={() => confirmDelete(item.id, item.name)}
            onMembers={() => router.push(`/(tabs)/locations/${item.id}/members`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Home}
            title="No locations yet"
            description="Add your first home or office to start organizing."
            action={<Button onPress={() => setShowCreateForm(true)}>Add Location</Button>}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      />

      {/* ── Create location modal ─────────────────────────────────────── */}
      <Modal visible={showCreateForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Location" showBack={false} />
          <View className="gap-4">
            <Input
              label="Name"
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Main House"
            />
            <View>
              <Text variant="caption" className="font-medium text-foreground mb-2">Type</Text>
              <View className="flex-row gap-3">
                {(["HOME", "OFFICE"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={createForm.type === t ? "primary" : "outline"}
                    onPress={() => setCreateForm((f) => ({ ...f, type: t }))}
                    className="flex-1"
                  >
                    {t === "HOME" ? "Home" : "Office"}
                  </Button>
                ))}
              </View>
            </View>
            <Input
              label="Address (optional)"
              value={createForm.address}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, address: v }))}
              placeholder="123 Main St"
            />
            {createError && <Text variant="caption" className="text-destructive">{createError}</Text>}
            <Button onPress={handleCreate} loading={createMutation.isPending} className="mt-2">
              Create Location
            </Button>
            <Button onPress={() => { setShowCreateForm(false); setCreateError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>

      {/* ── Edit location modal (owns its own useImageUpload) ─────────── */}
      <Modal visible={!!editingLocation} animationType="slide" presentationStyle="pageSheet">
        {editingLocation && (
          <EditLocationModal
            location={editingLocation}
            onClose={() => setEditingLocation(null)}
          />
        )}
      </Modal>
    </Screen>
  );
}
