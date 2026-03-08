import { useState } from "react";
import { SectionList, View, Modal, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Package2, ChevronRight } from "lucide-react-native";
import { cabinetsApi } from "@/lib/api/cabinets";
import { itemsApi } from "@/lib/api/items";
import type { ShelfWithCounts, Item } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Section =
  | { key: "shelves"; title: string; data: ShelfWithCounts[] }
  | { key: "items"; title: string; data: Item[] };

export default function CabinetDetailScreen() {
  const { locationId, cabinetId, shelf: shelfFilter } = useLocalSearchParams<{
    locationId: string;
    cabinetId: string;
    shelf?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showShelfForm, setShowShelfForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [shelfName, setShelfName] = useState("");
  const [shelfPosition, setShelfPosition] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: shelves, isLoading: shelvesLoading, error: shelvesError, refetch: refetchShelves } = useQuery({
    queryKey: ["shelves", cabinetId],
    queryFn: () => cabinetsApi.getShelves(cabinetId),
    enabled: !!cabinetId,
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["items", cabinetId, shelfFilter],
    queryFn: () => cabinetsApi.getItems(cabinetId, shelfFilter),
    enabled: !!cabinetId,
  });

  const createShelfMutation = useMutation({
    mutationFn: cabinetsApi.createShelf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelves", cabinetId] });
      setShowShelfForm(false);
      setShelfName("");
      setShelfPosition("");
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const createItemMutation = useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", cabinetId] });
      setShowItemForm(false);
      setItemName(""); setItemQty("1");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items", cabinetId] }),
  });

  function handleCreateItem() {
    if (!itemName.trim()) { setFormError("Item name is required."); return; }
    setFormError(null);
    createItemMutation.mutate({
      cabinetId,
      name: itemName.trim(),
      quantity: parseInt(itemQty, 10) || 1,
    });
  }

  function confirmDeleteItem(id: string, name: string) {
    Alert.alert("Delete Item", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItemMutation.mutate(id) },
    ]);
  }

  const isLoading = shelvesLoading || itemsLoading;

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinet" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </Screen>
    );
  }

  if (shelvesError) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinet" showBack />
        <ErrorView onRetry={() => { refetchShelves(); refetchItems(); }} />
      </Screen>
    );
  }

  const unassignedItems = shelfFilter
    ? (items ?? [])  // API already filters by shelf
    : (items ?? []).filter((i) => !i.shelfId);

  const sections: Section[] = shelfFilter
    ? [{ key: "items", title: "Items on this shelf", data: items ?? [] }]
    : [
        { key: "shelves", title: "Shelves", data: shelves ?? [] },
        { key: "items", title: "Items (unassigned)", data: unassignedItems },
      ];

  const pageTitle = shelfFilter
    ? (shelves?.find((s) => s.id === shelfFilter)?.name ?? "Shelf")
    : "Cabinet";

  return (
    <Screen scroll={false}>
      <PageHeader
        title={pageTitle}
        subtitle={shelfFilter ? `${items?.length ?? 0} item(s)` : `${shelves?.length ?? 0} shelves · ${items?.length ?? 0} items`}
        showBack
        onAdd={() => setShowItemForm(true)}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between mb-2 mt-4">
            <Text variant="caption" className="font-semibold uppercase tracking-widest">{section.title}</Text>
            {section.key === "shelves" && (
              <TouchableOpacity onPress={() => setShowShelfForm(true)}>
                <Text variant="caption" className="text-primary">+ Add shelf</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item, section }) => {
          if (section.key === "shelves") {
            const shelf = item as ShelfWithCounts;
            return (
              <Card
                onPress={() => router.push(`/(tabs)/locations/${locationId}/${cabinetId}?shelf=${shelf.id}`)}
                className="mb-2"
              >
                <View className="flex-row items-center gap-3">
                  <Layers size={18} color="#2563EB" />
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">{shelf.name}</Text>
                    <Text variant="caption">{shelf._count.items} item(s)</Text>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
              </Card>
            );
          }

          const itm = item as Item;
          return (
            <Card className="mb-2">
              <View className="flex-row items-center gap-3">
                <Package2 size={18} color="#64748B" />
                <View className="flex-1">
                  <Text variant="body" className="font-medium">{itm.name}</Text>
                  <Text variant="caption">Qty: {itm.quantity}</Text>
                </View>
                <Button onPress={() => confirmDeleteItem(itm.id, itm.name)} variant="ghost" className="px-2">
                  <Text className="text-destructive text-xs">Del</Text>
                </Button>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={Package2}
            title="Empty cabinet"
            description="Add shelves to organise, or add items directly."
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
      />

      {/* Add item modal */}
      <Modal visible={showItemForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Item" showBack={false} />
          <View className="gap-4">
            <Input label="Name" value={itemName} onChangeText={setItemName} placeholder="e.g. Power Drill" />
            <Input
              label="Quantity"
              value={itemQty}
              onChangeText={setItemQty}
              keyboardType="number-pad"
              placeholder="1"
            />
            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}
            <Button onPress={handleCreateItem} loading={createItemMutation.isPending} className="mt-2">
              Add Item
            </Button>
            <Button onPress={() => { setShowItemForm(false); setFormError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>

      {/* Add shelf modal */}
      <Modal visible={showShelfForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Shelf" showBack={false} />
          <View className="gap-4">
            <Input
              label="Shelf Name"
              value={shelfName}
              onChangeText={setShelfName}
              placeholder="e.g. Top Shelf"
            />
            <Input
              label="Shelf Number / Position"
              value={shelfPosition}
              onChangeText={setShelfPosition}
              keyboardType="number-pad"
              placeholder={`e.g. ${(shelves?.length ?? 0) + 1}`}
            />
            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}
            <Button
              onPress={() => {
                if (!shelfName.trim()) { setFormError("Name is required."); return; }
                setFormError(null);
                const position = shelfPosition.trim()
                  ? parseInt(shelfPosition.trim(), 10)
                  : (shelves?.length ?? 0) + 1;
                createShelfMutation.mutate({ cabinetId, name: shelfName.trim(), position });
              }}
              loading={createShelfMutation.isPending}
            >
              Create Shelf
            </Button>
            <Button
              onPress={() => {
                setShowShelfForm(false);
                setShelfName("");
                setShelfPosition("");
                setFormError(null);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
