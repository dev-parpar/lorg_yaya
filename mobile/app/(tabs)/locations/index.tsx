import { useState } from "react";
import { FlatList, View, Modal, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Building2 } from "lucide-react-native";
import { locationsApi } from "@/lib/api/locations";
import type { LocationWithCounts } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityIndicator } from "react-native";

function LocationCard({
  location,
  onPress,
  onDelete,
}: {
  location: LocationWithCounts;
  onPress: () => void;
  onDelete: () => void;
}) {
  const Icon = location.type === "HOME" ? Home : Building2;
  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center gap-3">
        <View className="rounded-xl bg-primary/10 p-3">
          <Icon size={22} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text variant="h3">{location.name}</Text>
          <Text variant="caption">
            {location.type} · {location._count.cabinets} cabinet{location._count.cabinets !== 1 ? "s" : ""}
          </Text>
          {location.address && (
            <Text variant="caption" className="text-muted-foreground mt-0.5">{location.address}</Text>
          )}
        </View>
        <Button onPress={onDelete} variant="ghost" className="px-2">
          <Text className="text-destructive text-xs">Delete</Text>
        </Button>
      </View>
    </Card>
  );
}

interface LocationFormState {
  name: string;
  type: "HOME" | "OFFICE";
  address: string;
}

export default function LocationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LocationFormState>({ name: "", type: "HOME", address: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: locations, isLoading, error, refetch } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setShowForm(false);
      setForm({ name: "", type: "HOME", address: "" });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  function handleCreate() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setFormError(null);
    createMutation.mutate({ name: form.name.trim(), type: form.type, address: form.address.trim() || undefined });
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Delete Location", `Delete "${name}" and all its contents?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Locations" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Locations" />
        <ErrorView message={(error as Error).message} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PageHeader title="Locations" subtitle="Your homes & offices" onAdd={() => setShowForm(true)} />

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => router.push(`/(tabs)/locations/${item.id}`)}
            onDelete={() => confirmDelete(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Home}
            title="No locations yet"
            description="Add your first home or office to start organizing."
            action={<Button onPress={() => setShowForm(true)}>Add Location</Button>}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      />

      {/* Create location modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Location" showBack={false} />

          <View className="gap-4">
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

            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}

            <Button onPress={handleCreate} loading={createMutation.isPending} className="mt-2">
              Create Location
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
