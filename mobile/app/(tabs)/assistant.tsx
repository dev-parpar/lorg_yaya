import { useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, SendHorizontal, RotateCcw } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { useState } from "react";

import { Screen } from "@/components/ui/screen";
import { PageHeader } from "@/components/ui/page-header";
import { Text } from "@/components/ui/text";
import { inventoryApi } from "@/lib/api/inventory";
import { useAiChat } from "@/lib/hooks/useAiChat";
import type { ChatMessage, FlatInventoryItem } from "@/types";

// ── Markdown stylesheet ───────────────────────────────────────────────────────

const markdownStyles = StyleSheet.create({
  body: { fontSize: 14, color: "#0F172A", lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  table: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  thead: { backgroundColor: "#F8FAFC" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    flex: 1,
    padding: 8,
    fontWeight: "700",
    fontSize: 12,
    color: "#475569",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  td: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: "#0F172A",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  code_inline: {
    backgroundColor: "#F1F5F9",
    color: "#7C3AED",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  fence: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
  },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
});

// ── Example prompts shown on the empty state ──────────────────────────────────

const EXAMPLE_PROMPTS = [
  "Can I hang a painting?",
  "What food do I have?",
  "Where are my tools?",
  "Do I have any first aid supplies?",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <View style={{ alignSelf: "flex-end", maxWidth: "82%", marginBottom: 12 }}>
      <View
        style={{
          backgroundColor: "#2563EB",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderTopRightRadius: 4,
        }}
      >
        <RNText style={{ fontSize: 14, color: "#FFFFFF", lineHeight: 21 }}>
          {content}
        </RNText>
      </View>
    </View>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const isEmpty = message.isStreaming && message.content === "";

  return (
    <View style={{ width: "92%", marginBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#EFF6FF",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} color="#2563EB" />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            borderTopLeftRadius: 4,
          }}
        >
          {isEmpty ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#94A3B8" />
              <RNText style={{ fontSize: 14, color: "#94A3B8" }}>
                Thinking…
              </RNText>
            </View>
          ) : message.isStreaming ? (
            <RNText style={{ fontSize: 14, color: "#0F172A", lineHeight: 21 }}>
              {message.content + "▌"}
            </RNText>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )}
        </View>
      </View>
    </View>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6 pb-12">
      <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-5">
        <Sparkles size={38} color="#2563EB" />
      </View>
      <Text variant="h2" className="text-center mb-2">
        Hi, I'm Lorgy
      </Text>
      <Text variant="body" className="text-muted-foreground text-center mb-8">
        Ask me anything about your inventory. I can find items, check if you
        have what you need, and tell you exactly where everything is stored.
      </Text>

      <View className="w-full gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onPrompt(prompt)}
            className="border border-border rounded-xl px-4 py-3 bg-white"
            activeOpacity={0.7}
          >
            <Text className="text-foreground text-sm">{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AssistantScreen() {
  const [input, setInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const { messages, isStreaming, sendMessage, clearMessages } = useAiChat();
  const insets = useSafeAreaInsets();
  // On Android the keyboard height reported by the OS includes the gesture
  // navigation bar, but our KeyboardAvoidingView sits above the tab bar.
  // Adding the bottom inset to the offset compensates for that difference.
  const kbOffset = Platform.OS === "ios" ? 0 : 56 + insets.bottom;

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<
    FlatInventoryItem[]
  >({
    queryKey: ["inventory", "full"],
    queryFn: () => inventoryApi.getFull(),
    staleTime: 1000 * 60 * 5,
  });

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || isStreaming) return;
      setInput("");
      await sendMessage(message, inventory);
    },
    [input, isStreaming, inventory, sendMessage],
  );

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const ClearButton = (
    <TouchableOpacity
      onPress={clearMessages}
      disabled={messages.length === 0}
      className="rounded-full bg-muted p-2"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <RotateCcw
        size={18}
        color={messages.length === 0 ? "#CBD5E1" : "#64748B"}
      />
    </TouchableOpacity>
  );

  return (
    <Screen scroll={false}>
      <PageHeader
        title="Lorgy"
        subtitle={
          inventoryLoading
            ? "Loading inventory…"
            : `${inventory.length} item${inventory.length !== 1 ? "s" : ""} in scope`
        }
        rightElement={ClearButton}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={kbOffset}
      >
        {messages.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <EmptyState onPrompt={(text) => void handleSend(text)} />
          </ScrollView>
        ) : (
          // Plain ScrollView + map instead of FlatList — avoids all FlatList
          // item-caching issues when content updates rapidly during streaming.
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={scrollToBottom}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} content={msg.content} />
              ) : (
                <AssistantBubble key={msg.id} message={msg} />
              ),
            )}
          </ScrollView>
        )}

        {/* Input bar */}
        <View className="flex-row items-end gap-2 pt-3 pb-2 border-t border-border mt-1">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your inventory…"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            editable={!isStreaming}
            onSubmitEditing={() => void handleSend()}
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-sm text-foreground"
            style={{ maxHeight: 120 }}
          />
          <TouchableOpacity
            onPress={() => void handleSend()}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
            style={{ opacity: !input.trim() || isStreaming ? 0.4 : 1 }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <SendHorizontal size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
