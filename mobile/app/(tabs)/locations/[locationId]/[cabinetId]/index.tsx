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
import { Layers, Package2, ChevronRight, ArrowRightLeft, Pencil, ScanLine } from "lucide-react-native";
import { COLORS } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { useItemIdentifier } from "@/lib/hooks/useItemIdentifier";
import { useLocalShelves } from "@/lib/hooks/useLocalShelves";
import { useLocalItems } from "@/lib/hooks/useLocalItems";
import { EntityPhoto } from "@/components/ui/entity-photo";
import { BulkItemModal } from "@/components/ui/bulk-item-modal";
import { ItemReviewModal } from "@/components/ui/item-review-modal";
import type { ShelfWithCounts, Item, ItemType, DetectedItem } from "@/types";
import { ITEM_TYPE_LABELS, ALL_ITEM_TYPES } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SectionItem = ShelfWithCounts | Item;
type Section =
  | { key: "shelves"; title: string; data: SectionItem[] }
  | { key: "items"; title: string; data: SectionItem[] };

// ── Edit shelf modal ──────────────────────────────────────────────────────

function EditShelfModal({
  shelf,
  onShelfUpdate,
  onClose,
}: {
  shelf: ShelfWithCounts;
  onShelfUpdate: (shelfId: string, changes: Partial<{
    name: string;
    position: number;
    imagePath: string | null;
    signedImageUrl: string | null;
  }>) => Promise<void>;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [name, setName] = useState(shelf.name);
  const [position, setPosition] = useState(String(shelf.position));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    shelf.signedImageUrl,
  );

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "shelves",
    buildPath: () => `${user!.id}/${shelf.id}`,
    onUpload: async (imagePath, signedUrl) => {
      await onShelfUpdate(shelf.id, { imagePath, signedImageUrl: signedUrl });
      setLocalSignedUrl(signedUrl);
    },
    onRemove: async () => {
      await onShelfUpdate(shelf.id, { imagePath: null, signedImageUrl: null });
      setLocalSignedUrl(null);
    },
  });

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const pos = position.trim() ? parseInt(position.trim(), 10) : shelf.position;
      await onShelfUpdate(shelf.id, { name: name.trim(), position: pos });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
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
        <Button onPress={handleSave} loading={saving} className="mt-2">Save Changes</Button>
        <Button onPress={onClose} variant="ghost">Cancel</Button>
      </View>
    </Screen>
  );
}

// ── Edit item modal ───────────────────────────────────────────────────────

function EditItemModal({
  item,
  onItemUpdate,
  onClose,
}: {
  item: Item;
  onItemUpdate: (itemId: string, changes: Partial<{
    name: string;
    quantity: number;
    itemType: ItemType;
    imagePath: string | null;
    signedImageUrl: string | null;
  }>) => Promise<void>;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.quantity));
  const [type, setType] = useState<ItemType>(item.itemType);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localSignedUrl, setLocalSignedUrl] = useState<string | null | undefined>(
    item.signedImageUrl,
  );

  const { showActionSheet, isUploading } = useImageUpload({
    bucket: "items",
    buildPath: () => `${user!.id}/${item.id}`,
    onUpload: async (imagePath, signedUrl) => {
      await onItemUpdate(item.id, { imagePath, signedImageUrl: signedUrl });
      setLocalSignedUrl(signedUrl);
    },
    onRemove: async () => {
      await onItemUpdate(item.id, { imagePath: null, signedImageUrl: null });
      setLocalSignedUrl(null);
    },
  });

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      await onItemUpdate(item.id, {
        name: name.trim(),
        quantity: parseInt(qty, 10) || 1,
        itemType: type,
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
        <Button onPress={handleSave} loading={saving} className="mt-2">Save Changes</Button>
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

  // CV scan review modal
  const [scannedItems, setScannedItems] = useState<DetectedItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { isIdentifying, showSourcePicker } = useItemIdentifier();

  // Android add-item action sheet (replaces Alert which can't be dismissed by tapping outside)
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Item edit modal
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [itemToAssign, setItemToAssign] = useState<Item | null>(null);

  // Shelves and items now come from local SQLite
  const {
    shelves,
    isLoading: shelvesLoading,
    create: createShelf,
    update: updateShelf,
    remove: removeShelf,
  } = useLocalShelves(cabinetId, locationId);

  const {
    items,
    isLoading: itemsLoading,
    create: createItem,
    batchCreate,
    update: updateItem,
    remove: removeItem,
    move: moveItem,
  } = useLocalItems(cabinetId, locationId, shelfFilter);

  const [creatingShelf, setCreatingShelf] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);

  async function handleCreateItem() {
    if (!itemName.trim()) { setFormError("Item name is required."); return; }
    setFormError(null);
    setCreatingItem(true);
    try {
      await createItem({
        name: itemName.trim(),
        quantity: parseInt(itemQty, 10) || 1,
        itemType,
        shelfId: shelfFilter ?? undefined,
      });
      setShowItemForm(false);
      setItemName("");
      setItemQty("1");
      setItemType("OTHER");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setCreatingItem(false);
    }
  }

  function confirmDeleteItem(id: string, name: string) {
    Alert.alert("Delete Item", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeItem(id) },
    ]);
  }

  /** Show an action sheet so the user picks how to add items. */
  function promptAddItem() {
    function handleChoice(index: number) {
      if (index === 0 || index === 1) {
        showSourcePicker(cabinetId, (items) => {
          setScannedItems(items);
          setShowReviewModal(true);
        });
      } else if (index === 2) {
        setShowItemForm(true);
      } else if (index === 3) {
        setShowBulkForm(true);
      }
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "📷  Scan with camera",
            "🖼   Choose from library",
            "✏️   Add single item",
            "📋  Add multiple items",
            "Cancel",
          ],
          cancelButtonIndex: 4,
        },
        handleChoice,
      );
    } else {
      // On Android, Alert.alert can't be dismissed by tapping outside.
      // Use our own bottom-sheet-style modal instead.
      setShowAddMenu(true);
    }
  }

  const isLoading = shelvesLoading || itemsLoading;

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <PageHeader title="Cabinet" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  const unassignedItems = shelfFilter ? items : items.filter((i) => !i.shelfId);
  const sections: Section[] = shelfFilter
    ? [{ key: "items", title: "Items on this shelf", data: items as SectionItem[] }]
    : [
        { key: "shelves", title: "Shelves", data: shelves as SectionItem[] },
        { key: "items", title: "Unassigned Items", data: unassignedItems as SectionItem[] },
      ];

  const pageTitle = shelfFilter
    ? (shelves.find((s) => s.id === shelfFilter)?.name ?? "Shelf")
    : "Cabinet";

  const hasShelves = shelves.length > 0;

  return (
    <Screen scroll={false}>
      <PageHeader
        title={pageTitle}
        subtitle={shelfFilter
          ? `${items.length} item(s)`
          : `${shelves.length} shelves · ${items.length} items`}
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
                    <Layers size={18} color={COLORS.primary} />
                  )}
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">{shelf.name}</Text>
                    <Text variant="caption">{shelf._count.items} item(s) · position {shelf.position}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingShelf(shelf)} className="p-2">
                    <Pencil size={15} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                  <ChevronRight size={16} color={COLORS.muted} />
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
                  <Package2 size={18} color={COLORS.mutedForeground} />
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
                      {shelves.find((s) => s.id === itm.shelfId)?.name ?? "On a shelf"}
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
                        <ArrowRightLeft size={12} color={COLORS.primary} />
                        <Text variant="caption" className="text-primary font-medium">Assign</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setEditingItem(itm)} className="p-2">
                    <Pencil size={15} color={COLORS.mutedForeground} />
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
            data={shelves}
            keyExtractor={(s) => s.id}
            renderItem={({ item: shelf }) => (
              <Card
                onPress={() => {
                  if (!itemToAssign) return;
                  void updateItem(itemToAssign.id, { shelfId: shelf.id });
                  setShowAssignModal(false);
                  setItemToAssign(null);
                }}
                className="mb-3"
              >
                <View className="flex-row items-center gap-3">
                  <Layers size={18} color={COLORS.primary} />
                  <View className="flex-1">
                    <Text variant="body" className="font-medium">{shelf.name}</Text>
                    <Text variant="caption">{shelf._count.items} item(s) already here</Text>
                  </View>
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
            <Button onPress={handleCreateItem} loading={creatingItem} className="mt-2">Add Item</Button>
            <Button onPress={() => { setShowItemForm(false); setFormError(null); setItemType("OTHER"); }} variant="ghost">Cancel</Button>
          </View>
        </Screen>
      </Modal>

      {/* ── Edit item modal (owns its own useImageUpload) ─────────────── */}
      <Modal visible={!!editingItem} animationType="slide" presentationStyle="pageSheet">
        {editingItem && (
          <EditItemModal
            item={editingItem}
            onItemUpdate={updateItem}
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
              placeholder={`e.g. ${shelves.length + 1}`}
            />
            {formError && <Text variant="caption" className="text-destructive">{formError}</Text>}
            <Button
              onPress={async () => {
                if (!shelfName.trim()) { setFormError("Name is required."); return; }
                setFormError(null);
                setCreatingShelf(true);
                try {
                  const pos = shelfPosition.trim() ? parseInt(shelfPosition.trim(), 10) : shelves.length + 1;
                  await createShelf(shelfName.trim(), pos);
                  setShowShelfForm(false);
                  setShelfName("");
                  setShelfPosition("");
                } catch (e) {
                  setFormError((e as Error).message);
                } finally {
                  setCreatingShelf(false);
                }
              }}
              loading={creatingShelf}
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
            onShelfUpdate={updateShelf}
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
        onBatchCreate={async (batchItems, shelfIdArg) => {
          await batchCreate(batchItems, shelfIdArg);
        }}
      />

      {/* ── CV scan — identifying overlay ────────────────────────────── */}
      <Modal visible={isIdentifying} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.card} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ScanLine size={20} color={COLORS.card} />
            <Text style={{ color: COLORS.card, fontSize: 16, fontWeight: "600" }}>
              Identifying items…
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── CV scan — review modal ────────────────────────────────────── */}
      <ItemReviewModal
        visible={showReviewModal}
        detectedItems={scannedItems}
        cabinetId={cabinetId}
        shelfId={shelfFilter}
        onClose={() => {
          setShowReviewModal(false);
          setScannedItems([]);
        }}
        onCreateItem={createItem}
        onUpdateItem={updateItem}
        onBatchCreate={batchCreate}
      />

      {/* ── Android add-item menu (dismissible by tapping backdrop) ──────── */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowAddMenu(false)}
        >
          {/* Stop propagation so tapping inside the sheet doesn't dismiss */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32, borderTopWidth: 2, borderColor: COLORS.border }}>
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.muted }} />
              </View>
              <Text variant="caption" className="font-semibold uppercase tracking-widest text-center mb-2 text-muted-foreground">
                Add Items
              </Text>
              {[
                { label: "📷  Scan with camera", onPress: () => { setShowAddMenu(false); showSourcePicker(cabinetId, (items) => { setScannedItems(items); setShowReviewModal(true); }); } },
                { label: "🖼   Choose from library", onPress: () => { setShowAddMenu(false); showSourcePicker(cabinetId, (items) => { setScannedItems(items); setShowReviewModal(true); }); } },
                { label: "✏️   Add single item", onPress: () => { setShowAddMenu(false); setShowItemForm(true); } },
                { label: "📋  Add multiple items", onPress: () => { setShowAddMenu(false); setShowBulkForm(true); } },
              ].map(({ label, onPress }) => (
                <TouchableOpacity
                  key={label}
                  onPress={onPress}
                  style={{ paddingVertical: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: COLORS.border }}
                >
                  <Text variant="body">{label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowAddMenu(false)}
                style={{ paddingVertical: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 }}
              >
                <Text variant="body" className="text-muted-foreground text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}
