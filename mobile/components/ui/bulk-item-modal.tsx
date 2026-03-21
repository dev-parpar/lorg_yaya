import { useState, useRef } from "react";
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { X, Plus, ChevronDown } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi, type BatchItemRow } from "@/lib/api/items";
import { ALL_ITEM_TYPES, ITEM_TYPE_LABELS } from "@/types";
import type { ItemType } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

// ── Types ─────────────────────────────────────────────────────────────────

interface RowState extends BatchItemRow {
  /** Local-only key for FlatList — not sent to API */
  _key: string;
}

interface BulkItemModalProps {
  visible: boolean;
  cabinetId: string;
  shelfId?: string;
  onClose: () => void;
  /** Invalidation key so the parent list refreshes after save */
  queryKey: unknown[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

let _counter = 0;
function newRow(): RowState {
  return { _key: String(++_counter), name: "", quantity: 1, itemType: "OTHER" };
}

function showTypePicker(current: ItemType, onSelect: (t: ItemType) => void) {
  const options = [...ALL_ITEM_TYPES.map((t) => ITEM_TYPE_LABELS[t]), "Cancel"];
  const cancelIndex = options.length - 1;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, title: "Select item type" },
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
        onPress: () => onSelect(t),
        style: t === current ? ("default" as const) : ("default" as const),
      })).concat([{ text: "Cancel", onPress: () => {}, style: "cancel" as const }]),
    );
  }
}

// ── Item row component ────────────────────────────────────────────────────

function ItemRow({
  row,
  index,
  canRemove,
  onChangeName,
  onChangeType,
  onChangeQty,
  onRemove,
  onSubmitEditing,
}: {
  row: RowState;
  index: number;
  canRemove: boolean;
  onChangeName: (v: string) => void;
  onChangeType: (t: ItemType) => void;
  onChangeQty: (n: number) => void;
  onRemove: () => void;
  onSubmitEditing: () => void;
}) {
  return (
    <Card className="mb-3">
      {/* Header row: label + remove button */}
      <View className="flex-row items-center justify-between mb-2">
        <Text variant="caption" className="font-semibold text-muted-foreground uppercase tracking-wide">
          Item {index + 1}
        </Text>
        {canRemove && (
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Name input */}
      <Input
        placeholder="Item name (e.g. Hammer)"
        value={row.name}
        onChangeText={onChangeName}
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        autoCapitalize="words"
      />

      {/* Type + Quantity row */}
      <View className="flex-row items-center justify-between mt-3">
        {/* Type picker chip */}
        <TouchableOpacity
          onPress={() => showTypePicker(row.itemType, onChangeType)}
          className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5"
        >
          <Text variant="caption" className="text-primary font-semibold">
            {ITEM_TYPE_LABELS[row.itemType]}
          </Text>
          <ChevronDown size={12} color="#2563EB" />
        </TouchableOpacity>

        {/* Quantity stepper */}
        <QuantityStepper value={row.quantity} onChange={onChangeQty} />
      </View>
    </Card>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

export function BulkItemModal({
  visible,
  cabinetId,
  shelfId,
  onClose,
  queryKey,
}: BulkItemModalProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RowState[]>([newRow()]);
  const listRef = useRef<FlatList>(null);

  function reset() {
    setRows([newRow()]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── Row CRUD ─────────────────────────────────────────────────────────

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
    // Scroll to bottom after the state update settles
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function updateRow<K extends keyof BatchItemRow>(key: string, field: K, value: BatchItemRow[K]) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  // ── Submit ────────────────────────────────────────────────────────────

  const batchMutation = useMutation({
    mutationFn: (validRows: BatchItemRow[]) =>
      itemsApi.batchCreate({ cabinetId, shelfId, items: validRows }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      handleClose();
      Alert.alert(
        "Items added",
        `${result.count} item${result.count !== 1 ? "s" : ""} added successfully.`,
      );
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  function handleSubmit() {
    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      Alert.alert("Nothing to add", "Please enter at least one item name.");
      return;
    }

    // Warn about blank rows being skipped
    const blankCount = rows.length - validRows.length;
    if (blankCount > 0) {
      Alert.alert(
        "Skip blank rows?",
        `${blankCount} row${blankCount > 1 ? "s" : ""} without a name will be skipped.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Add ${validRows.length} item${validRows.length !== 1 ? "s" : ""}`,
            onPress: () =>
              batchMutation.mutate(
                validRows.map((r) => ({ name: r.name.trim(), quantity: r.quantity, itemType: r.itemType })),
              ),
          },
        ],
      );
    } else {
      batchMutation.mutate(
        validRows.map((r) => ({ name: r.name.trim(), quantity: r.quantity, itemType: r.itemType })),
      );
    }
  }

  const namedCount = rows.filter((r) => r.name.trim().length > 0).length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Screen scroll={false}>
        <PageHeader
          title="Add Multiple Items"
          subtitle={namedCount > 0 ? `${namedCount} item${namedCount !== 1 ? "s" : ""} ready` : "Fill in items below"}
          showBack={false}
        />

        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r._key}
          renderItem={({ item: row, index }) => (
            <ItemRow
              row={row}
              index={index}
              canRemove={rows.length > 1}
              onChangeName={(v) => updateRow(row._key, "name", v)}
              onChangeType={(t) => updateRow(row._key, "itemType", t)}
              onChangeQty={(n) => updateRow(row._key, "quantity", n)}
              onRemove={() => removeRow(row._key)}
              // Tap "next" on keyboard → focus next row or add a new one
              onSubmitEditing={() => {
                const nextIndex = index + 1;
                if (nextIndex < rows.length) {
                  // Nothing to do — RN manages focus between inputs
                } else {
                  addRow();
                }
              }}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity
              onPress={addRow}
              className="flex-row items-center gap-2 py-3 mb-4"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View className="rounded-full bg-primary/10 p-1">
                <Plus size={14} color="#2563EB" />
              </View>
              <Text variant="caption" className="text-primary font-semibold">
                Add another item
              </Text>
            </TouchableOpacity>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        />

        {/* Fixed footer */}
        <View className="gap-3 pt-2">
          <Button
            onPress={handleSubmit}
            loading={batchMutation.isPending}
            disabled={namedCount === 0 || batchMutation.isPending}
          >
            {namedCount > 0
              ? `Add ${namedCount} Item${namedCount !== 1 ? "s" : ""}`
              : "Add Items"}
          </Button>
          <Button onPress={handleClose} variant="ghost" disabled={batchMutation.isPending}>
            Cancel
          </Button>
        </View>
      </Screen>
    </Modal>
  );
}
