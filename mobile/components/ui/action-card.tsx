import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRightLeft, Check, X, Package, Layers } from "lucide-react-native";
import type { InventoryAction } from "@/types";
import { ITEM_TYPE_LABELS } from "@/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { NeuView } from "@/components/ui/neu-view";
import { COLORS, RADII, FONTS } from "@/lib/theme/tokens";

function ActionIcon({ type }: { type: InventoryAction["type"] }) {
  const size = 14;
  switch (type) {
    case "add_item":
      return <Plus size={size} color="#16A34A" />;
    case "update_item":
      return <Pencil size={size} color="#2563EB" />;
    case "remove_item":
      return <Trash2 size={size} color="#DC2626" />;
    case "move_item":
      return <ArrowRightLeft size={size} color="#6C63FF" />;
    case "add_cabinet":
      return <Package size={size} color="#16A34A" />;
    case "update_cabinet":
      return <Package size={size} color="#2563EB" />;
    case "remove_cabinet":
      return <Package size={size} color="#DC2626" />;
    case "add_shelf":
      return <Layers size={size} color="#16A34A" />;
    case "update_shelf":
      return <Layers size={size} color="#2563EB" />;
    case "remove_shelf":
      return <Layers size={size} color="#DC2626" />;
  }
}

function actionLabel(action: InventoryAction): string {
  switch (action.type) {
    case "add_item": {
      const typeLabel = ITEM_TYPE_LABELS[action.item.itemType] ?? action.item.itemType;
      return `Add ${action.item.name} (${typeLabel}, ×${action.item.quantity})`;
    }
    case "update_item": {
      const parts: string[] = [];
      if (action.changes.name) parts.push(`name → ${action.changes.name}`);
      if (action.changes.quantity != null) parts.push(`qty → ${action.changes.quantity}`);
      if (action.changes.itemType) {
        const label = ITEM_TYPE_LABELS[action.changes.itemType] ?? action.changes.itemType;
        parts.push(`type → ${label}`);
      }
      return `Update: ${parts.join(", ") || "item"}`;
    }
    case "remove_item":
      return "Remove item";
    case "move_item":
      return "Move item";
    case "add_cabinet":
      return `Add cabinet "${action.cabinet.name}"`;
    case "update_cabinet": {
      const parts: string[] = [];
      if (action.changes.name) parts.push(`name → ${action.changes.name}`);
      if (action.changes.description !== undefined) parts.push("description updated");
      return `Update cabinet: ${parts.join(", ") || "cabinet"}`;
    }
    case "remove_cabinet":
      return "Delete cabinet";
    case "add_shelf":
      return `Add shelf "${action.shelf.name}"`;
    case "update_shelf": {
      const parts: string[] = [];
      if (action.changes.name) parts.push(`name → ${action.changes.name}`);
      return `Update shelf: ${parts.join(", ") || "shelf"}`;
    }
    case "remove_shelf":
      return "Delete shelf";
  }
}

function actionColor(type: InventoryAction["type"]): string {
  switch (type) {
    case "add_item":
    case "add_cabinet":
    case "add_shelf":
      return "rgba(22, 163, 74, 0.1)";
    case "update_item":
    case "update_cabinet":
    case "update_shelf":
      return "rgba(37, 99, 235, 0.1)";
    case "remove_item":
    case "remove_cabinet":
    case "remove_shelf":
      return "rgba(220, 38, 38, 0.1)";
    case "move_item":
      return "rgba(108, 99, 255, 0.1)";
  }
}

interface ActionCardProps {
  actions: InventoryAction[];
  status: "pending" | "confirmed" | "rejected";
  onConfirm: () => Promise<void>;
  onReject: () => void;
}

export function ActionCard({ actions, status, onConfirm, onReject }: ActionCardProps) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <NeuView variant="raised" radius={RADII.card} style={styles.outer}>
      <View style={styles.container}>
        {/* Action list */}
        <View style={styles.actionList}>
          {actions.map((action, i) => (
            <NeuView key={i} variant="inset" radius={12}>
              <View
                style={[styles.actionRow, { backgroundColor: actionColor(action.type) }]}
              >
                <ActionIcon type={action.type} />
                <Text variant="caption" style={styles.actionLabel} numberOfLines={2}>
                  {actionLabel(action)}
                </Text>
              </View>
            </NeuView>
          ))}
        </View>

        {/* Footer */}
        {status === "pending" && (
          <View style={styles.buttonRow}>
            <Button
              onPress={handleConfirm}
              disabled={confirming}
              loading={confirming}
              className="flex-1"
            >
              Confirm
            </Button>
            <Button
              onPress={onReject}
              variant="outline"
              disabled={confirming}
              className="flex-1"
            >
              Cancel
            </Button>
          </View>
        )}

        {status === "confirmed" && (
          <View style={styles.statusRow}>
            <Check size={14} color={COLORS.success} />
            <Text variant="caption" style={{ color: COLORS.success, fontWeight: "600" }}>
              Changes applied
            </Text>
          </View>
        )}

        {status === "rejected" && (
          <View style={styles.statusRow}>
            <X size={14} color={COLORS.mutedForeground} />
            <Text variant="caption" style={{ color: COLORS.mutedForeground }}>
              Cancelled
            </Text>
          </View>
        )}
      </View>
    </NeuView>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 8,
  },
  container: {
    borderRadius: RADII.card,
    overflow: "hidden",
  },
  actionList: {
    padding: 12,
    gap: 6,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionLabel: {
    flex: 1,
    color: COLORS.foreground,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
