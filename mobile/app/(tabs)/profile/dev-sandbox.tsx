import { useState, useEffect, useRef, useMemo } from "react";
import { View, ActivityIndicator, FlatList, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { SyncEngine } from "@/lib/sync/sync-engine";
import { getDatabase } from "@/lib/local-db/database";
import { initSeqCounter, getPendingOps } from "@/lib/local-db/operations";
import { useLocalCabinets } from "@/lib/hooks/useLocalCabinets";
import { useLocalShelves } from "@/lib/hooks/useLocalShelves";
import { useLocalItems } from "@/lib/hooks/useLocalItems";
import { useLocalSearch } from "@/lib/hooks/useLocalSearch";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";
import { locationsApi } from "@/lib/api/locations";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { COLORS } from "@/lib/theme/tokens";
import type { LocationWithCounts, CabinetWithCounts, ShelfWithCounts, Item } from "@/types";

export default function DevSandboxScreen() {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [pendingOpsRefreshKey, setPendingOpsRefreshKey] = useState(0);

  // Counters for generated names
  const cabinetCounterRef = useRef(1);
  const shelfCounterRef = useRef(1);
  const itemCounterRef = useRef(1);

  // SyncEngine instance for the selected location
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ── DB initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    getDatabase();
    initSeqCounter();
    setDbReady(true);
  }, []);

  // ── API: locations list ───────────────────────────────────────────────────
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
  });

  // ── Local DB hooks (always called unconditionally) ────────────────────────
  const { cabinets, create: createCabinet, remove: removeCabinet } = useLocalCabinets(
    selectedLocationId ?? "",
  );

  const { shelves, create: createShelf, remove: removeShelf } = useLocalShelves(
    selectedCabinetId ?? "",
    selectedLocationId ?? "",
  );

  const { items, create: createItem, remove: removeItem } = useLocalItems(
    selectedCabinetId ?? "",
    selectedLocationId ?? "",
    selectedShelfId,
  );

  const { results: searchResults } = useLocalSearch(searchQuery);

  const syncStatus = useSyncStatus(selectedLocationId ?? "");

  // ── Pending ops (recomputed on key change) ────────────────────────────────
  const pendingOps = useMemo(() => {
    if (!selectedLocationId || !dbReady) return [];
    try {
      return getPendingOps(selectedLocationId);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, dbReady, pendingOpsRefreshKey]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelectLocation(locationId: string) {
    setSelectedLocationId(locationId);
    setSelectedCabinetId(null);
    setSelectedShelfId(null);
    syncEngineRef.current = new SyncEngine(locationId);
  }

  function handleBack() {
    if (syncEngineRef.current) {
      syncEngineRef.current.stopTimer();
      syncEngineRef.current = null;
    }
    setSelectedLocationId(null);
    setSelectedCabinetId(null);
    setSelectedShelfId(null);
  }

  async function handleCreateCabinet() {
    await createCabinet(`Test Cabinet ${cabinetCounterRef.current}`);
    cabinetCounterRef.current += 1;
  }

  async function handleCreateShelf() {
    await createShelf(`Test Shelf ${shelfCounterRef.current}`);
    shelfCounterRef.current += 1;
  }

  async function handleCreateItem() {
    await createItem({ name: `Test Item ${itemCounterRef.current}`, quantity: 1 });
    itemCounterRef.current += 1;
  }

  async function handlePull() {
    if (!syncEngineRef.current) return;
    setSyncing(true);
    try {
      await syncEngineRef.current.pull();
    } finally {
      setSyncing(false);
      setPendingOpsRefreshKey((k) => k + 1);
    }
  }

  async function handlePush() {
    if (!syncEngineRef.current) return;
    setSyncing(true);
    try {
      await syncEngineRef.current.push();
    } finally {
      setSyncing(false);
      setPendingOpsRefreshKey((k) => k + 1);
    }
  }

  async function handleSync() {
    if (!syncEngineRef.current) return;
    setSyncing(true);
    try {
      await syncEngineRef.current.sync();
    } finally {
      setSyncing(false);
      setPendingOpsRefreshKey((k) => k + 1);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text variant="caption" style={styles.loadingText}>Initializing database…</Text>
        </View>
      </Screen>
    );
  }

  // ── Phase 1: Location picker ──────────────────────────────────────────────
  if (!selectedLocationId) {
    return (
      <Screen>
        <PageHeader title="Dev Sandbox" showBack />
        <Text variant="h3" style={styles.sectionTitle}>Pick a Location</Text>
        {locationsLoading && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
        )}
        {!locationsLoading && (!locations || locations.length === 0) && (
          <Text variant="caption" style={styles.emptyText}>No locations found.</Text>
        )}
        {(locations ?? []).map((loc: LocationWithCounts) => (
          <Card key={loc.id} onPress={() => handleSelectLocation(loc.id)} style={styles.locationCard}>
            <Text variant="h3">{loc.name}</Text>
            <Text variant="caption" style={styles.mutedText}>{loc.type} · {loc._count.cabinets} cabinets</Text>
          </Card>
        ))}
      </Screen>
    );
  }

  // ── Phase 2: Sandbox dashboard ────────────────────────────────────────────
  const syncStatusColor =
    syncStatus.hasError
      ? COLORS.primary
      : syncStatus.pendingCount > 0
      ? COLORS.warning
      : COLORS.success;

  const syncStatusLabel =
    syncStatus.hasError
      ? "Error"
      : syncStatus.pendingCount > 0
      ? "Pending"
      : "Synced";

  return (
    <Screen>
      <PageHeader title="Dev Sandbox" showBack />

      {/* ── A. Sync Status ─────────────────────────────────────────────── */}
      <Card style={styles.sectionCard}>
        <Text variant="h3" style={styles.sectionTitle}>Sync Status</Text>
        <View style={styles.row}>
          <Text variant="body">Status</Text>
          <Text variant="body" style={[styles.statusBadge, { color: syncStatusColor }]}>
            {syncStatusLabel}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="body">Pending ops</Text>
          <Text variant="caption">{syncStatus.pendingCount}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="body">Last synced</Text>
          <Text variant="caption">
            {syncStatus.lastSynced
              ? new Date(syncStatus.lastSynced).toLocaleTimeString()
              : "Never"}
          </Text>
        </View>
        {syncStatus.syncError && (
          <Text variant="caption" style={styles.errorText}>{syncStatus.syncError}</Text>
        )}
      </Card>

      {/* ── Sync Controls ──────────────────────────────────────────────── */}
      <Card style={styles.sectionCard}>
        <Text variant="h3" style={styles.sectionTitle}>Sync Controls</Text>
        <View style={styles.syncButtonRow}>
          <Button
            onPress={handlePull}
            variant="outline"
            loading={syncing}
            style={styles.syncButton}
          >
            Pull
          </Button>
          <Button
            onPress={handlePush}
            variant="outline"
            loading={syncing}
            style={styles.syncButton}
          >
            Push
          </Button>
          <Button
            onPress={handleSync}
            variant="primary"
            loading={syncing}
            style={styles.syncButton}
          >
            Sync
          </Button>
        </View>
      </Card>

      {/* ── B. Cabinets ───────────────────────────────────────────────── */}
      <Card style={styles.sectionCard}>
        <Text variant="h3" style={styles.sectionTitle}>Cabinets ({cabinets.length})</Text>
        {cabinets.map((cab: CabinetWithCounts) => (
          <TouchableOpacity
            key={cab.id}
            onPress={() => {
              setSelectedCabinetId(cab.id === selectedCabinetId ? null : cab.id);
              setSelectedShelfId(null);
            }}
            style={[
              styles.listRow,
              cab.id === selectedCabinetId && styles.listRowSelected,
            ]}
          >
            <View style={styles.rowContent}>
              <Text variant="body">{cab.name}</Text>
              <Text variant="caption" style={styles.mutedText}>
                {cab._count.shelves} shelves · {cab._count.items} items
              </Text>
            </View>
            <Button
              onPress={() => {
                if (selectedCabinetId === cab.id) {
                  setSelectedCabinetId(null);
                  setSelectedShelfId(null);
                }
                removeCabinet(cab.id);
              }}
              variant="destructive"
              style={styles.inlineBtn}
            >
              Delete
            </Button>
          </TouchableOpacity>
        ))}
        {cabinets.length === 0 && (
          <Text variant="caption" style={styles.emptyText}>No cabinets yet.</Text>
        )}
        <Button onPress={handleCreateCabinet} variant="outline" style={styles.createBtn}>
          + Create Cabinet
        </Button>
      </Card>

      {/* ── C. Shelves (visible when cabinet selected) ────────────────── */}
      {selectedCabinetId && (
        <Card style={styles.sectionCard}>
          <Text variant="h3" style={styles.sectionTitle}>Shelves ({shelves.length})</Text>
          {shelves.map((shelf: ShelfWithCounts) => (
            <TouchableOpacity
              key={shelf.id}
              onPress={() => setSelectedShelfId(shelf.id === selectedShelfId ? null : shelf.id)}
              style={[
                styles.listRow,
                shelf.id === selectedShelfId && styles.listRowSelected,
              ]}
            >
              <View style={styles.rowContent}>
                <Text variant="body">{shelf.name}</Text>
                <Text variant="caption" style={styles.mutedText}>
                  {shelf._count.items} items · pos {shelf.position}
                </Text>
              </View>
              <Button
                onPress={() => {
                  if (selectedShelfId === shelf.id) setSelectedShelfId(null);
                  removeShelf(shelf.id);
                }}
                variant="destructive"
                style={styles.inlineBtn}
              >
                Delete
              </Button>
            </TouchableOpacity>
          ))}
          {shelves.length === 0 && (
            <Text variant="caption" style={styles.emptyText}>No shelves yet.</Text>
          )}
          <Button onPress={handleCreateShelf} variant="outline" style={styles.createBtn}>
            + Create Shelf
          </Button>
        </Card>
      )}

      {/* ── D. Items (visible when cabinet selected) ──────────────────── */}
      {selectedCabinetId && (
        <Card style={styles.sectionCard}>
          <Text variant="h3" style={styles.sectionTitle}>
            Items ({items.length}){selectedShelfId ? " (shelf filter active)" : ""}
          </Text>
          {items.map((item: Item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.rowContent}>
                <Text variant="body">{item.name}</Text>
                <Text variant="caption" style={styles.mutedText}>qty: {item.quantity}</Text>
              </View>
              <Button
                onPress={() => removeItem(item.id)}
                variant="destructive"
                style={styles.inlineBtn}
              >
                Delete
              </Button>
            </View>
          ))}
          {items.length === 0 && (
            <Text variant="caption" style={styles.emptyText}>No items yet.</Text>
          )}
          <Button onPress={handleCreateItem} variant="outline" style={styles.createBtn}>
            + Create Item
          </Button>
        </Card>
      )}

      {/* ── E. Search ─────────────────────────────────────────────────── */}
      <Card style={styles.sectionCard}>
        <Text variant="h3" style={styles.sectionTitle}>Search</Text>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Type 2+ chars to search items…"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((result) => (
              <View key={result.id} style={styles.searchRow}>
                <Text variant="body">{result.name}</Text>
                <Text variant="caption" style={styles.mutedText}>{result.cabinetName}</Text>
              </View>
            ))}
          </View>
        )}
        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <Text variant="caption" style={styles.emptyText}>No results.</Text>
        )}
      </Card>

      {/* ── F. Pending Ops ────────────────────────────────────────────── */}
      <Card style={styles.sectionCard}>
        <View style={styles.row}>
          <Text variant="h3" style={styles.sectionTitle}>Pending Ops ({pendingOps.length})</Text>
          <Button
            onPress={() => setPendingOpsRefreshKey((k) => k + 1)}
            variant="ghost"
            style={styles.refreshBtn}
          >
            Refresh
          </Button>
        </View>
        {pendingOps.length === 0 && (
          <Text variant="caption" style={styles.emptyText}>No pending ops.</Text>
        )}
        {pendingOps.map((op, index) => (
          <View key={op.id} style={styles.opRow}>
            <Text variant="caption" style={styles.opIndex}>#{index + 1}</Text>
            <Text variant="caption" style={styles.opType}>{op.type}</Text>
            <Text variant="caption" style={styles.mutedText}>seq {op.seq}</Text>
          </View>
        ))}
      </Card>

      {/* Bottom spacer */}
      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.mutedForeground,
  },
  spinner: {
    marginVertical: 8,
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    color: COLORS.foreground,
  },
  locationCard: {
    marginBottom: 10,
  },
  mutedText: {
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.mutedForeground,
    fontStyle: "italic",
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statusBadge: {
    fontWeight: "700",
    fontSize: 13,
  },
  errorText: {
    color: COLORS.primary,
    marginTop: 4,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted,
  },
  listRowSelected: {
    backgroundColor: `${COLORS.muted}33`,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  rowContent: {
    flex: 1,
  },
  inlineBtn: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 60,
  },
  createBtn: {
    marginTop: 10,
  },
  searchResults: {
    marginTop: 8,
  },
  searchRow: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted,
  },
  opRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted,
  },
  opIndex: {
    width: 28,
    color: COLORS.mutedForeground,
  },
  opType: {
    flex: 1,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  refreshBtn: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  syncButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  syncButton: {
    flex: 1,
  },
});
