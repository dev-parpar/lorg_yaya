import { useState, useEffect } from "react";
import { FlatList, View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Package2 } from "lucide-react-native";
import { itemsApi } from "@/lib/api/items";
import { COLORS } from "@/lib/theme/tokens";
import type { ItemWithLocation } from "@/types";
import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function SearchResultCard({ item }: { item: ItemWithLocation }) {
  const breadcrumb = [
    item.cabinet.location.name,
    item.cabinet.name,
    item.shelf?.name,
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <Card className="mb-3">
      <View className="flex-row items-start gap-3">
        <View className="rounded-xl bg-muted p-2.5 mt-0.5">
          <Package2 size={18} color={COLORS.mutedForeground} />
        </View>
        <View className="flex-1">
          <Text variant="h3">{item.name}</Text>
          <Text variant="caption" className="mt-1">{breadcrumb}</Text>
          <Text variant="caption" className="mt-0.5">Qty: {item.quantity}</Text>
          {item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <View key={tag} className="bg-primary/10 rounded-full px-2 py-0.5">
                  <Text variant="caption" className="text-primary">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => itemsApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const showResults = debouncedQuery.trim().length >= 2;

  return (
    <Screen scroll={false}>
      <PageHeader title="Search" rightElement={<NotificationBell />} />
      <View className="mb-4">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Find any item…"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading && showResults && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {!isLoading && showResults && (
        <FlatList
          data={results ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SearchResultCard item={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={SearchIcon}
              title="No results"
              description={`Nothing matched "${debouncedQuery}". Try a different term.`}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        />
      )}

      {!showResults && (
        <View className="flex-1 items-center justify-center">
          <SearchIcon size={48} color={COLORS.muted} />
          <Text variant="muted" className="mt-4 text-center">
            Type at least 2 characters to search
          </Text>
        </View>
      )}
    </Screen>
  );
}
