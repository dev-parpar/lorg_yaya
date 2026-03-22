import { useState, useCallback } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput as RNTextInput,
  ActivityIndicator,
} from "react-native";
import { AlertTriangle, Trash2, ChevronDown, CheckCircle2 } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/lib/api/items";
import { ALL_ITEM_TYPES, ITEM_TYPE_LABELS } from "@/types";
import type { DetectedItem, ItemType } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

// ── Helpers ───────────────────────────────────────────────────────────────────

function showTypePicker(current: ItemType, onSelect: (t: ItemType) => void) {
  const labels = ALL_ITEM_TYPES.map((t) => ITEM_TYPE_LABELS[t]);
  const options = [...labels, "Cancel"];

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: "Select item type" },
      (index) => {
        if (index < ALL_ITEM_TYPES.length) onSelect(ALL_ITEM_TYPES[index]);
      },
    );
  } else {
    Alert.alert(
      "Select item type",
      undefined,
      ALL_ITEM_TYPES.map((t) => ({
        text: ITEM_TYPE_LABELS[t],
        style: (t === current ? "default" : "default") as "default",
        onPress: () => onSelect(t),
      })).concat([{ text: "Cancel", style: "cancel" as const, onPress: () => {} }]),
    );
  }
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
          onPress={() => showTypePicker(item.type, onChangeType)}
          className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5"
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563EB" }}>
            {ITEM_TYPE_LABELS[item.type]}
          </Text>
          <ChevronDown size={12} color="#2563EB" />
        </TouchableOpacity>

        <QuantityStepper value={item.quantity} onChange={onChangeQty} />
      </View>
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
  /** TanStack Query key(s) to invalidate after a successful save */
  queryKey: unknown[];
}

export function ItemReviewModal({
  visible,
  detectedItems,
  cabinetId,
  shelfId,
  onClose,
  queryKey,
}: ItemReviewModalProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<DetectedItem[]>(detectedItems);

  // Sync rows when new detections arrive (modal re-opened with new scan)
  // We do this by keying on visible changes via a separate useEffect-like pattern.
  // Since this is a controlled modal, we rely on the parent unmounting/remounting.

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

      // Run increments in parallel
      await Promise.all(
        increments.map((r) =>
          itemsApi.update(r.existingItemId!, {
            quantity: (r.existingQty ?? 0) + r.quantity,
          }),
        ),
      );

      // Batch-create new items
      if (creates.length > 0) {
        await itemsApi.batchCreate({
          cabinetId,
          shelfId,
          items: creates.map((r) => ({
            name: r.name.trim(),
            quantity: r.quantity,
            itemType: r.type,
          })),
        });
      }

      await queryClient.invalidateQueries({ queryKey });
      onClose();

      const total = active.length;
      const incrCount = increments.length;
      const newCount = creates.length;
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
