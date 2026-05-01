import { useState, useCallback, useEffect } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  TextInput as RNTextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AlertTriangle, Trash2, ChevronDown, CheckCircle2, X } from "lucide-react-native";
import { ALL_ITEM_TYPES, ITEM_TYPE_LABELS } from "@/types";
import type { DetectedItem, ItemType } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

// ── Android type picker modal ─────────────────────────────────────────────────
// Alert.alert on Android truncates buttons beyond ~3, so we use a proper modal.

function AndroidTypePicker({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: ItemType;
  onSelect: (t: ItemType) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 480 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <Text variant="body" className="font-semibold">Select item type</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {/* Scrollable list of all types */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {ALL_ITEM_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { onSelect(t); onClose(); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                    backgroundColor: t === current ? "#EFF6FF" : "transparent",
                  }}
                >
                  <Text variant="body" style={{ color: t === current ? "#2563EB" : "#0F172A" }}>
                    {ITEM_TYPE_LABELS[t]}
                  </Text>
                  {t === current && (
                    <CheckCircle2 size={16} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showTypePicker(current: ItemType, onSelect: (t: ItemType) => void) {
  // iOS: native action sheet (handles any number of options natively)
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: [...ALL_ITEM_TYPES.map((t) => ITEM_TYPE_LABELS[t]), "Cancel"],
      cancelButtonIndex: ALL_ITEM_TYPES.length,
      title: "Select item type",
    },
    (index) => {
      if (index < ALL_ITEM_TYPES.length) onSelect(ALL_ITEM_TYPES[index]);
    },
  );
}

// ── Single detected item row ──────────────────────────────────────────────────

function DetectedItemRow({
  item,
  onChangeName,
  onChangeType,
  onChangeQty,
  onRemove,
  onToggleIncrement,
}: {
  item: DetectedItem;
  onChangeName: (v: string) => void;
  onChangeType: (t: ItemType) => void;
  onChangeQty: (n: number) => void;
  onRemove: () => void;
  onToggleIncrement: () => void;
}) {
  const [showAndroidTypePicker, setShowAndroidTypePicker] = useState(false);
  const isLowConfidence = item.confidence < 0.6;
  const showWarning = item.isDuplicate || isLowConfidence;

  return (
    <Card className="mb-3">
      {/* Row header: status icon + name input + trash */}
      <View className="flex-row items-center gap-2 mb-3">
        {showWarning ? (
          <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
        ) : (
          <CheckCircle2 size={16} color="#22C55E" style={{ flexShrink: 0 }} />
        )}

        <RNTextInput
          value={item.name}
          onChangeText={onChangeName}
          placeholder="Item name"
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "500",
            color: "#0F172A",
            paddingVertical: 0,
          }}
          placeholderTextColor="#94A3B8"
          autoCapitalize="words"
        />

        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Duplicate warning */}
      {item.isDuplicate && (
        <View className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <Text style={{ fontSize: 12, color: "#92400E" }}>
            Already in this cabinet (current qty: {item.existingQty ?? "?"})
          </Text>
          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              onPress={onToggleIncrement}
              className={`flex-1 rounded-lg py-1.5 items-center border ${
                item.incrementInstead
                  ? "bg-primary border-primary"
                  : "bg-transparent border-border"
              }`}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: item.incrementInstead ? "#FFFFFF" : "#64748B",
                }}
              >
                Add {item.quantity} more
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onToggleIncrement}
              className={`flex-1 rounded-lg py-1.5 items-center border ${
                !item.incrementInstead
                  ? "bg-primary border-primary"
                  : "bg-transparent border-border"
              }`}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: !item.incrementInstead ? "#FFFFFF" : "#64748B",
                }}
              >
                Create new entry
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Low confidence badge */}
      {isLowConfidence && !item.isDuplicate && (
        <View className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3">
          <Text style={{ fontSize: 12, color: "#92400E" }}>
            Low confidence — please verify the name and type.
          </Text>
        </View>
      )}

      {/* Type chip + qty stepper */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === "ios") {
              showTypePicker(item.type, onChangeType);
            } else {
              setShowAndroidTypePicker(true);
            }
          }}
          className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5"
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563EB" }}>
            {ITEM_TYPE_LABELS[item.type]}
          </Text>
          <ChevronDown size={12} color="#2563EB" />
        </TouchableOpacity>

        <QuantityStepper value={item.quantity} onChange={onChangeQty} />
      </View>

      {/* Android-only scrollable type picker */}
      {Platform.OS === "android" && (
        <AndroidTypePicker
          visible={showAndroidTypePicker}
          current={item.type}
          onSelect={onChangeType}
          onClose={() => setShowAndroidTypePicker(false)}
        />
      )}
    </Card>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export interface ItemReviewModalProps {
  visible: boolean;
  /** Items returned by the vision + dedup pass */
  detectedItems: DetectedItem[];
  cabinetId: string;
  shelfId?: string;
  onClose: () => void;
  /** Create a single item via local ops */
  onCreateItem: (input: {
    name: string;
    quantity?: number;
    itemType?: ItemType;
    shelfId?: string | null;
  }) => Promise<string>;
  /** Update an existing item via local ops */
  onUpdateItem: (itemId: string, changes: Partial<{ quantity: number }>) => Promise<void>;
  /** Batch-create items via local ops */
  onBatchCreate: (
    items: Array<{
      name: string;
      quantity?: number;
      itemType?: ItemType;
    }>,
    shelfId?: string | null,
  ) => Promise<void>;
}

export function ItemReviewModal({
  visible,
  detectedItems,
  cabinetId,
  shelfId,
  onClose,
  onCreateItem,
  onUpdateItem,
  onBatchCreate,
}: ItemReviewModalProps) {
  const [rows, setRows] = useState<DetectedItem[]>(detectedItems);

  // React Native Modals stay mounted even when visible=false, so useState(detectedItems)
  // only fires once at mount time (when detectedItems is still []). Sync whenever
  // the modal opens with a fresh set of detections.
  useEffect(() => {
    console.log("[ItemReviewModal] useEffect — visible:", visible, "detectedItems.length:", detectedItems.length);
    if (visible && detectedItems.length > 0) {
      console.log("[ItemReviewModal] setting rows:", JSON.stringify(detectedItems));
      setRows(detectedItems);
    }
  }, [visible, detectedItems]);

  // ── Row mutation helpers ──────────────────────────────────────────────────

  function updateRow<K extends keyof DetectedItem>(key: string, field: K, value: DetectedItem[K]) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  const onChangeName = useCallback(
    (key: string, v: string) => updateRow(key, "name", v),
    [],
  );
  const onChangeType = useCallback(
    (key: string, t: ItemType) => updateRow(key, "type", t),
    [],
  );
  const onChangeQty = useCallback(
    (key: string, n: number) => updateRow(key, "quantity", n),
    [],
  );
  const onToggleIncrement = useCallback(
    (key: string) =>
      setRows((prev) =>
        prev.map((r) =>
          r._key === key ? { ...r, incrementInstead: !r.incrementInstead } : r,
        ),
      ),
    [],
  );

  // ── Submission ────────────────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    const active = rows.filter((r) => !r.skipped && r.name.trim().length > 0);

    if (active.length === 0) {
      Alert.alert("Nothing to add", "All items have been removed.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Items to increment (existing entries)
      const increments = active.filter((r) => r.isDuplicate && r.incrementInstead && r.existingItemId);
      // Items to create fresh
      const creates = active.filter((r) => !r.isDuplicate || !r.incrementInstead);

      // Run increments via local update ops
      await Promise.all(
        increments.map((r) =>
          onUpdateItem(r.existingItemId!, {
            quantity: (r.existingQty ?? 0) + r.quantity,
          }),
        ),
      );

      // Batch-create new items via local ops
      if (creates.length > 0) {
        await onBatchCreate(
          creates.map((r) => ({
            name: r.name.trim(),
            quantity: r.quantity,
            itemType: r.type,
          })),
          shelfId,
        );
      }

      onClose();

      const incrCount = increments.length;
      const newCount = creates.length;
      const total = active.length;
      Alert.alert(
        "Items saved",
        [
          newCount > 0 && `${newCount} new item${newCount !== 1 ? "s" : ""} added`,
          incrCount > 0 && `${incrCount} item${incrCount !== 1 ? "s" : ""} incremented`,
        ]
          .filter(Boolean)
          .join(" · ") || `${total} item${total !== 1 ? "s" : ""} saved`,
      );
    } catch (e) {
      Alert.alert("Error", (e as Error).message ?? "Failed to save items. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeCount = rows.filter((r) => !r.skipped && r.name.trim().length > 0).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Screen scroll={false}>
        <PageHeader
          title="Review Items"
          subtitle={
            rows.length === 0
              ? "No items detected"
              : `${rows.length} item${rows.length !== 1 ? "s" : ""} detected`
          }
          showBack={false}
        />

        {rows.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text variant="muted" className="text-center">
              No items to review. Tap cancel to go back.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {rows.map((item) => (
              <DetectedItemRow
                key={item._key}
                item={item}
                onChangeName={(v) => onChangeName(item._key, v)}
                onChangeType={(t) => onChangeType(item._key, t)}
                onChangeQty={(n) => onChangeQty(item._key, n)}
                onRemove={() => removeRow(item._key)}
                onToggleIncrement={() => onToggleIncrement(item._key)}
              />
            ))}
          </ScrollView>
        )}

        <View className="gap-3 pt-2">
          <Button
            onPress={handleConfirm}
            loading={isSubmitting}
            disabled={activeCount === 0 || isSubmitting}
          >
            {activeCount > 0
              ? `Confirm ${activeCount} item${activeCount !== 1 ? "s" : ""}`
              : "Confirm"}
          </Button>
          <Button onPress={onClose} variant="ghost" disabled={isSubmitting}>
            Cancel
          </Button>
        </View>
      </Screen>
    </Modal>
  );
}
