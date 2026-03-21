import { useState } from "react";
import {
  SectionList,
  View,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Package2, ChevronRight, ArrowRightLeft, Pencil } from "lucide-react-native";
import { cabinetsApi } from "@/lib/api/cabinets";
import { itemsApi } from "@/lib/api/items";
import { useAuthStore } from "@/lib/store/auth-store";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { EntityPhoto } from "@/components/ui/entity-photo";
import { BulkItemModal } from "@/components/ui/bulk-item-modal";
import type { ShelfWithCounts, Item, ItemType } from "@/types";
import { ITEM_TYPE_LABELS, ALL_ITEM_TYPES } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorView } from "@/components/ui/error-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SectionItem = ShelfWithCounts | Item;
type Section =
  | { key: "shelves"; title: string; data: SectionItem[] }
  | { key: "items"; title: string; data: SectionItem[] };

// ── Edit shelf modal ──────────────────────────────────────────────────────

function EditShelfModal({
  shelf,
  cabinetId,
  onClose,
}: {
  shelf: ShelfWithCounts;
  cabinetId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [name, setName] = useState(shelf.name);
  const [position, setPosition] = useState(String(shelf.position));
  const [error, setError] = useState<string | null>(null);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    shelf.signedImageUrl,
  );

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; position?: number }) =>
      cabinetsApi.updateShelf(shelf.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelves", cabinetId] }),
    onError: (e: Error) => setError(e.message),
  });

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "shelves",
    buildPath: () => `${user!.id}/${shelf.id}`,
    onUpload: async (imagePath) => {
      const updated = await cabinetsApi.updateShelf(shelf.id, { imagePath });
      queryClient.invalidateQueries({ queryKey: ["shelves", cabinetId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
    onRemove: async () => {
      const updated = await cabinetsApi.updateShelf(shelf.id, { imagePath: null });
      queryClient.invalidateQueries({ queryKey: ["shelves", cabinetId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
  });

  function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    const pos = position.trim() ? parseInt(position.trim(), 10) : shelf.position;
    updateMutation.mutate({ name: name.trim(), position: pos }, { onSuccess: () => onClose() });
  }

  return (
    <Screen>
      <PageHeader title="Edit Shelf" showBack={false} />
      <View className="gap-4">
        <View className="items-center mb-2">
          <EntityPhoto
            signedUrl={localSignedUrl}
            onPress={showActionSheet}
            isUploading={isUploading}
            size="lg"
            shape="rounded"
            FallbackIcon={Layers}
          />
        </View>
        <Input label="Shelf Name" value={name} onChangeText={setName} placeholder="e.g. Top Shelf" />
        <Input
          label="Position"
          value={position}
          onChangeText={setPosition}
          keyboardType="number-pad"
          placeholder="e.g. 1"
        />
        {error && <Text variant="caption" className="text-destructive">{error}</Text>}
        <Button onPress={handleSave} loading={updateMutation.isPending} className="mt-2">Save Changes</Button>
        <Button onPress={onClose} variant="ghost">Cancel</Button>
      </View>
    </Screen>
  );
}

// ── Edit item modal ───────────────────────────────────────────────────────

function EditItemModal({
  item,
  cabinetId,
  onClose,
}: {
  item: Item;
  cabinetId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.quantity));
  const [type, setType] = useState<ItemType>(item.itemType);
  const [error, setError] = useState<string | null>(null);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    item.signedImageUrl,
  );

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; quantity: number; itemType: ItemType }) =>
      itemsApi.update(item.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items", cabinetId] }),
    onError: (e: Error) => setError(e.message),
  });

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "items",
    buildPath: () => `${user!.id}/${item.id}`,
    onUpload: async (imagePath) => {
      const updated = await itemsApi.updatePhoto(item.id, imagePath);
      queryClient.invalidateQueries({ queryKey: ["items", cabinetId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
    onRemove: async () => {
      const updated = await itemsApi.updatePhoto(item.id, null);
      queryClient.invalidateQueries({ queryKey: ["items", cabinetId] });
      setLocalSignedUrl(updated.signedImageUrl);
    },
  });

  function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    updateMutation.mutate(
      { name: name.trim(), quantity: parseInt(qty, 10) || 1, itemType: type },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Screen>
      <PageHeader title="Edit Item" showBack={false} />
      <View className="gap-4">
        <View className="items-center mb-2">
          <EntityPhoto
            signedUrl={localSignedUrl}
            onPress={showActionSheet}
            isUploading={isUploading}
            size="lg"
            shape="rounded"
            FallbackIcon={Package2}
          />
        </View>
        <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Power Drill" />
        <Input label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="1" />
        <View>
          <Text variant="caption" className="font-medium text-foreground mb-2">Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
            <View className="flex-row gap-2 px-1">
              {ALL_ITEM_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`rounded-full px-3 py-1.5 border ${type === t ? "bg-primary border-primary" : "bg-transparent border-border"}`}
                >
                  <Text className={`text-sm font-medium ${type === t ? "text-white" : "text-foreground"}`}>
                    {ITEM_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        {error && <Text variant="caption" className="text-destructive">{error}</Text>}
        <Button onPress={handleSave} loading={updateMutation.isPending} className="mt-2">Save Changes</Button>
        <Button onPress={onClose} variant="ghost">Cancel</Button>
      </View>
    </Screen>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function CabinetDetailScreen() {
  const { locationId, cabinetId, shelf: shelfFilter } = useLocalSearchParams<{
    locationId: string;
    cabinetId: string;
    shelf?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Shelf create form
  const [showShelfForm, setShowShelfForm] = useState(false);
  const [shelfName, setShelfName] = useState("");
  const [shelfPosition, setShelfPosition] = useState("");

  // Shelf edit modal
  const [editingShelf, setEditingShelf] = useState<ShelfWithCounts | null>(null);

  // Item create form (single)
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemType, setItemType] = useState<ItemType>("OTHER");

  // Bulk item entry modal
  const [showBulkForm, setShowBulkForm] = useState(false);

  // Item edit modal
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [itemToAssign, setItemToAssign] = useState<Item | null>(null);

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
      setItemName("");
      setItemQty("1");
      setItemType("OTHER");
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const assignShelfMutation = useMutation({
    mutationFn: ({ itemId, shelfId }: { itemId: string; shelfId: string }) =>
      itemsApi.update(itemId, { shelfId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", cabinetId] });
      queryClient.invalidateQueries({ queryKey: ["shelves", cabinetId] });
      setShowAssignModal(false);
      setItemToAssign(null);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items", cabinetId] }),
  });

  function handleCreateItem() {
    if (!itemName.trim()) { setFormError("Item name is required."); return; }
    setFormError(null);
    createItemMutation.mutate({ cabinetId, name: itemName.trim(), quantity: parseInt(itemQty, 10) || 1, itemType });
  }

  function confirmDeleteItem(id: string, name: string) {
    Alert.alert("Delete Item", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItemMutation.mutate(id) },
    ]);
  }

  /** Show an action sheet so the user picks single or bulk entry. */
  function promptAddItem() {
    const options = ["Add Single Item", "Add Multiple Items", "Cancel"];
    const cancelIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (index) => {
          if (index === 0) setShowItemForm(true);
          else if (index === 1) setShowBulkForm(true);
        },
      );
    } else {
      Alert.alert("Add Items", undefined, [
        { text: "Add Single Item", onPress: () => setShowItemForm(true) },
        { text: "Add Multiple Items", onPress: () => setShowBulkForm(true) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
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

  const unassignedItems = shelfFilter ? (items ?? []) : (items ?? []).filter((i) => !i.shelfId);
  const sections: Section[] = shelfFilter
    ? [{ key: "items", title: "Items on this shelf", data: (items ?? []) as SectionItem[] }]
    : [
        { key: "shelves", title: "Shelves", data: (shelves ?? []) as SectionItem[] },
        { key: "items", title: "Unassigned Items", data: unassignedItems as SectionItem[] },
      ];

  const pageTitle = shelfFilter
    ? (shelves?.find((s) => s.id === shelfFilter)?.name ?? "Shelf")
    : "Cabinet";

  const hasShelves = (shelves?.length ?? 0) > 0;

  return (
    <Screen scroll={false}>
      <PageHeader
        title={pageTitle}
        subtitle={shelfFilter
          ? `${items?.length ?? 0} item(s)`
          : `${shelves?.length ?? 0} shelves · ${items?.length ?? 0} items`}
        showBack
        onAdd={promptAddItem}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${(item as { id: string }).id}-${index}`}
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between mb-2 mt-4">
            <Text variant="caption" className="font-semibold uppercase tracking-widest">
              {section.title}
            </Text>
            {section.key === "shelves" && (
              <TouchableOpacity onPress={() => setShowShelfForm(true)}>
                <Text variant="caption" className="text-primary">+ Add shelf</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item, section }) => {
          if (section.key === "shelves") {
            const shelf = item as unknown as ShelfWithCounts;
            return (
              <Card
                onPress={() => router.push(`/(tabs)/locations/${locationId}/${cabinetId}?shelf=${shelf.id}`)}
                className="mb-2"
              >
                <View className="flex-row items-center gap-3">
                  {shelf.signedImageUrl ? (
                    <Image
                      source={{ uri: shelf.signedImageUrl }}
                      style={{ width: 40, height: 40, borderRadius: 8 }}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                  ) : (
                    <Layers size={18} color="#2563EB" />
                  )}
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">{shelf.name}</Text>
                    <Text variant="caption">{shelf._count.items} item(s) · position {shelf.position}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingShelf(shelf)} className="p-2">
                    <Pencil size={15} color="#64748B" />
                  </TouchableOpacity>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
              </Card>
            );
          }

          const itm = item as unknown as Item;
          return (
            <Card className="mb-2">
              <View className="flex-row items-center gap-3">
                {itm.signedImageUrl ? (
                  <Image
                    source={{ uri: itm.signedImageUrl }}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : (
                  <Package2 size={18} color="#64748B" />
                )}
                <View className="flex-1">
                  <Text variant="body" className="font-medium">{itm.name}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                    <Text variant="caption">Qty: {itm.quantity}</Text>
                    <View className="bg-primary/10 rounded-full px-2 py-0.5">
                      <Text variant="caption" className="text-primary font-medium">
                        {ITEM_TYPE_LABELS[itm.itemType] ?? itm.itemType}
                      </Text>
                    </View>
                  </View>
                  {itm.shelfId && (
                    <Text variant="caption" className="text-primary mt-0.5">
                      {shelves?.find((s) => s.id === itm.shelfId)?.name ?? "On a shelf"}
                    </Text>
                  )}
                </View>
                <View className="flex-row gap-1 items-center">
                  {!itm.shelfId && hasShelves && (
                    <TouchableOpacity
                      onPress={() => { setItemToAssign(itm); setShowAssignModal(true); }}
                      className="rounded-lg bg-primary/10 px-2 py-1.5"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View className="flex-row items-center gap-1">
                        <ArrowRightLeft size={12} color="#2563EB" />
                        <Text variant="caption" className="text-primary font-medium">Assign</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setEditingItem(itm)} className="p-2">
                    <Pencil size={15} color="#64748B" />
                  </TouchableOpacity>
                  <Button onPress={() => confirmDeleteItem(itm.id, itm.name)} variant="ghost" className="px-2">
                    <Text className="text-destructive text-xs">Del</Text>
                  </Button>
                </View>
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

      {/* ── Assign to shelf modal ─────────────────────────────────────── */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet">
        <Screen scroll={false}>
          <PageHeader title="Assign to Shelf" showBack={false} />
          <Text variant="muted" className="mb-4">
            Pick a shelf for <Text variant="body" className="font-semibold">{itemToAssign?.name}</Text>
          </Text>
          <FlatList
            data={shelves ?? []}
            keyExtractor={(s) => s.id}
            renderItem={({ item: shelf }) => (
              <Card
                onPress={() => itemToAssign && assignShelfMutation.mutate({ itemId: itemToAssign.id, shelfId: shelf.id })}
                className="mb-3"
              >
                <View className="flex-row items-center gap-3">
                  <Layers size={18} color="#2563EB" />
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">{shelf.name}</Text>
                    <Text variant="caption">{shelf._count.items} item(s) already here</Text>
                  </View>
                  {assignShelfMutation.isPending && <ActivityIndicator size="small" color="#2563EB" />}
                </View>
              </Card>
            )}
            ListEmptyComponent={<Text variant="muted" className="text-center mt-8">No shelves yet.</Text>}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
          <Button onPress={() => { setShowAssignModal(false); setItemToAssign(null); }} variant="ghost" className="mt-4">
            Cancel
          </Button>
        </Screen>
      </Modal>

      {/* ── Add item modal ────────────────────────────────────────────── */}
      <Modal visible={showItemForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Item" showBack={false} />
          <View className="gap-4">
            <Input label="Name" value={itemName} onChangeText={setItemName} placeholder="e.g. Power Drill" />
            <Input label="Quantity" value={itemQty} onChangeText={setItemQty} keyboardType="number-pad" placeholder="1" />
            <View>
              <Text variant="caption" className="font-medium text-foreground mb-2">Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                <View className="flex-row gap-2 px-1">
                  {ALL_ITEM_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setItemType(t)}
                      className={`rounded-full px-3 py-1.5 border ${itemType === t ? "bg-primary border-primary" : "bg-transparent border-border"}`}
                    >
                      <Text className={`text-sm font-medium ${itemType === t ? "text-white" : "text-foreground"}`}>
                        {ITEM_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}
            <Button onPress={handleCreateItem} loading={createItemMutation.isPending} className="mt-2">Add Item</Button>
            <Button onPress={() => { setShowItemForm(false); setFormError(null); setItemType("OTHER"); }} variant="ghost">Cancel</Button>
          </View>
        </Screen>
      </Modal>

      {/* ── Edit item modal (owns its own useImageUpload) ─────────────── */}
      <Modal visible={!!editingItem} animationType="slide" presentationStyle="pageSheet">
        {editingItem && (
          <EditItemModal
            item={editingItem}
            cabinetId={cabinetId}
            onClose={() => setEditingItem(null)}
          />
        )}
      </Modal>

      {/* ── Add shelf modal ───────────────────────────────────────────── */}
      <Modal visible={showShelfForm} animationType="slide" presentationStyle="pageSheet">
        <Screen>
          <PageHeader title="New Shelf" showBack={false} />
          <View className="gap-4">
            <Input label="Shelf Name" value={shelfName} onChangeText={setShelfName} placeholder="e.g. Top Shelf" />
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
                const pos = shelfPosition.trim() ? parseInt(shelfPosition.trim(), 10) : (shelves?.length ?? 0) + 1;
                createShelfMutation.mutate({ cabinetId, name: shelfName.trim(), position: pos });
              }}
              loading={createShelfMutation.isPending}
            >
              Create Shelf
            </Button>
            <Button onPress={() => { setShowShelfForm(false); setShelfName(""); setShelfPosition(""); setFormError(null); }} variant="ghost">
              Cancel
            </Button>
          </View>
        </Screen>
      </Modal>

      {/* ── Edit shelf modal (owns its own useImageUpload) ────────────── */}
      <Modal visible={!!editingShelf} animationType="slide" presentationStyle="pageSheet">
        {editingShelf && (
          <EditShelfModal
            shelf={editingShelf}
            cabinetId={cabinetId}
            onClose={() => setEditingShelf(null)}
          />
        )}
      </Modal>

      {/* ── Bulk item entry modal ─────────────────────────────────────── */}
      <BulkItemModal
        visible={showBulkForm}
        cabinetId={cabinetId}
        shelfId={shelfFilter}
        onClose={() => setShowBulkForm(false)}
        queryKey={["items", cabinetId, shelfFilter]}
      />
    </Screen>
  );
}
