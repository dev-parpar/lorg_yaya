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
import { COLORS, FONTS, SHADOWS } from "@/lib/theme/tokens";

// ── Markdown stylesheet (themed for cork-board ink-on-paper feel) ─────────────

const markdownStyles = StyleSheet.create({
  body: { fontSize: 14, color: COLORS.foreground, lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  thead: { backgroundColor: COLORS.mutedSurface },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  th: {
    flex: 1,
    padding: 8,
    fontWeight: "700",
    fontSize: 12,
    color: COLORS.mutedForeground,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  td: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: COLORS.foreground,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  code_inline: {
    backgroundColor: COLORS.mutedSurface,
    color: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  fence: {
    backgroundColor: COLORS.mutedSurface,
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
          backgroundColor: COLORS.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderTopRightRadius: 4,
          ...SHADOWS.button,
        }}
      >
        <RNText style={{ fontSize: 14, color: COLORS.primaryForeground, lineHeight: 21 }}>
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
            backgroundColor: "rgba(185, 28, 28, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} color={COLORS.primary} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            borderTopLeftRadius: 4,
            ...SHADOWS.card,
          }}
        >
          {isEmpty ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={COLORS.muted} />
              <RNText style={{ fontSize: 14, color: COLORS.mutedForeground }}>
                Thinking…
              </RNText>
            </View>
          ) : message.isStreaming ? (
            <RNText style={{ fontSize: 14, color: COLORS.foreground, lineHeight: 21 }}>
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
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 48 }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: "rgba(185, 28, 28, 0.12)",
        alignItems: "center", justifyContent: "center", marginBottom: 20,
        ...SHADOWS.card,
      }}>
        <Sparkles size={38} color={COLORS.primary} />
      </View>
      <Text variant="h2" style={{ textAlign: "center", marginBottom: 8, color: COLORS.card }}>
        Hi, I'm Lorgy
      </Text>
      <Text variant="body" style={{ color: COLORS.mutedSurface, textAlign: "center", marginBottom: 32 }}>
        Ask me anything about your inventory. I can find items, check if you
        have what you need, and tell you exactly where everything is stored.
      </Text>

      <View style={{ width: "100%", gap: 8 }}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onPrompt(prompt)}
            activeOpacity={0.75}
            style={[{
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }, SHADOWS.card]}
          >
            <Text style={{ color: COLORS.foreground, fontSize: 14 }}>{prompt}</Text>
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
      style={{
        borderRadius: 15, padding: 8,
        backgroundColor: "rgba(200, 167, 125, 0.35)",
        opacity: messages.length === 0 ? 0.4 : 1,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <RotateCcw
        size={18}
        color={COLORS.foreground}
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

        {/* Input bar — cream paper feel */}
        <View style={{
          flexDirection: "row", alignItems: "flex-end", gap: 8,
          paddingTop: 12, paddingBottom: 8,
          borderTopWidth: 1.5, borderTopColor: COLORS.border,
          marginTop: 4,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your inventory…"
            placeholderTextColor={COLORS.mutedForeground}
            multiline
            maxLength={2000}
            editable={!isStreaming}
            onSubmitEditing={() => void handleSend()}
            style={{
              flex: 1,
              backgroundColor: COLORS.card,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: COLORS.border,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              color: COLORS.foreground,
              maxHeight: 120,
              ...SHADOWS.input,
            }}
          />
          <TouchableOpacity
            onPress={() => void handleSend()}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 40, height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.primary,
              alignItems: "center", justifyContent: "center",
              opacity: !input.trim() || isStreaming ? 0.4 : 1,
              ...SHADOWS.button,
            }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <SendHorizontal size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
