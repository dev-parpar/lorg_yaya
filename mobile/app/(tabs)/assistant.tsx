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
import { ActionCard } from "@/components/ui/action-card";
import { Text } from "@/components/ui/text";
import { NeuView } from "@/components/ui/neu-view";
import { locationsApi } from "@/lib/api/locations";
import { useLocalInventory } from "@/lib/hooks/useLocalInventory";
import { useLocalDbStore } from "@/lib/store/local-db-store";
import { useAiChat } from "@/lib/hooks/useAiChat";
import type { ChatMessage } from "@/types";
import { COLORS, RADII, NEU, FONTS } from "@/lib/theme/tokens";

// ── Markdown stylesheet ──────────────────────────────────────────────────────

const markdownStyles = StyleSheet.create({
  body: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.foreground, lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  table: {
    borderWidth: 1,
    borderColor: NEU.insetBorderDark,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  thead: { backgroundColor: COLORS.mutedSurface },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: NEU.insetBorderDark,
  },
  th: {
    flex: 1,
    padding: 8,
    fontWeight: "700",
    fontSize: 12,
    color: COLORS.mutedForeground,
    borderRightWidth: 1,
    borderRightColor: NEU.insetBorderDark,
  },
  td: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: COLORS.foreground,
    borderRightWidth: 1,
    borderRightColor: NEU.insetBorderDark,
  },
  code_inline: {
    backgroundColor: COLORS.mutedSurface,
    color: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  fence: {
    backgroundColor: COLORS.mutedSurface,
    borderRadius: 12,
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
    <View style={styles.userBubbleOuter}>
      <NeuView variant="raisedSmall" radius={RADII.button} innerStyle={{ backgroundColor: COLORS.primary }}>
        <View style={styles.userBubbleInner}>
          <RNText style={styles.userBubbleText}>
            {content}
          </RNText>
        </View>
      </NeuView>
    </View>
  );
}

function AssistantBubble({
  message,
  onConfirm,
  onReject,
}: {
  message: ChatMessage;
  onConfirm?: () => Promise<void>;
  onReject?: () => void;
}) {
  const isEmpty = message.isStreaming && message.content === "";
  const hasActions = message.actions && message.actions.length > 0;

  return (
    <View style={styles.assistantBubbleOuter}>
      <View style={styles.assistantRow}>
        {/* Icon well — drilled into the surface */}
        <NeuView variant="inset" radius={14} style={styles.iconWellOuter}>
          <View style={styles.iconWell}>
            <Sparkles size={15} color={COLORS.primary} />
          </View>
        </NeuView>

        <View style={{ flex: 1 }}>
          <NeuView variant="raised" radius={RADII.button}>
            <View style={styles.assistantBubbleInner}>
              {isEmpty ? (
                <View style={styles.thinkingRow}>
                  <ActivityIndicator size="small" color={COLORS.muted} />
                  <RNText style={styles.thinkingText}>
                    Thinking…
                  </RNText>
                </View>
              ) : message.isStreaming ? (
                <RNText style={styles.streamingText}>
                  {message.content + "▌"}
                </RNText>
              ) : (
                <Markdown style={markdownStyles}>{message.content}</Markdown>
              )}
            </View>
          </NeuView>

          {/* Action card below the text bubble */}
          {hasActions && onConfirm && onReject && (
            <ActionCard
              actions={message.actions!}
              status={message.actionStatus ?? "pending"}
              onConfirm={onConfirm}
              onReject={onReject}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function ChatEmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <View style={styles.emptyContainer}>
      {/* Raised icon plaque */}
      <NeuView variant="raised" radius={40}>
        <View style={styles.emptyIconWell}>
          <Sparkles size={38} color={COLORS.primary} />
        </View>
      </NeuView>

      <Text variant="h2" style={styles.emptyTitle}>
        Hi, I'm Lorgy
      </Text>
      <Text variant="muted" style={styles.emptyDesc}>
        Ask me anything about your inventory. I can find items, check if you
        have what you need, and tell you exactly where everything is stored.
      </Text>

      <View style={styles.promptsContainer}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => onPrompt(prompt)}
            activeOpacity={0.75}
          >
            <NeuView variant="raisedSmall" radius={RADII.button}>
              <View style={styles.promptCard}>
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            </NeuView>
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
  const { messages, isStreaming, sendMessage, confirmActions, rejectActions, clearMessages } = useAiChat();
  const insets = useSafeAreaInsets();
  const lastViewedLocationId = useLocalDbStore((s) => s.lastViewedLocationId);
  const kbOffset = Platform.OS === "ios" ? 0 : 56 + insets.bottom;

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
    staleTime: 1000 * 60 * 5,
  });
  const locationMeta = locations.map((l) => ({ id: l.id, name: l.name, type: l.type }));
  const { inventory, structure, isLoading: inventoryLoading } = useLocalInventory(locationMeta);

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || isStreaming) return;
      setInput("");
      await sendMessage(message, inventory, structure, lastViewedLocationId);
    },
    [input, isStreaming, inventory, structure, lastViewedLocationId, sendMessage],
  );

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const ClearButton = (
    <TouchableOpacity
      onPress={clearMessages}
      disabled={messages.length === 0}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <NeuView
        variant="inset"
        radius={15}
        style={{ opacity: messages.length === 0 ? 0.4 : 1 }}
      >
        <View style={styles.clearBtnInner}>
          <RotateCcw size={16} color={COLORS.foreground} />
        </View>
      </NeuView>
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
            <ChatEmptyState onPrompt={(text) => void handleSend(text)} />
          </ScrollView>
        ) : (
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
                <AssistantBubble
                  key={msg.id}
                  message={msg}
                  onConfirm={() => confirmActions(msg.id)}
                  onReject={() => rejectActions(msg.id)}
                />
              ),
            )}
          </ScrollView>
        )}

        {/* Input bar — inset well + raised send button */}
        <View style={styles.inputBar}>
          <NeuView variant="inset" radius={RADII.button} style={{ flex: 1 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your inventory…"
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              maxLength={2000}
              editable={!isStreaming}
              onSubmitEditing={() => void handleSend()}
              style={styles.inputField}
            />
          </NeuView>

          <TouchableOpacity
            onPress={() => void handleSend()}
            disabled={!input.trim() || isStreaming}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <NeuView
              variant="raisedSmall"
              radius={20}
              innerStyle={{
                backgroundColor: COLORS.primary,
                opacity: !input.trim() || isStreaming ? 0.4 : 1,
              }}
            >
              <View style={styles.sendBtn}>
                <SendHorizontal size={18} color="#fff" />
              </View>
            </NeuView>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── User bubble ────────────────────────────────────────────────────
  userBubbleOuter: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    marginBottom: 12,
  },
  userBubbleInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.button,
  },
  userBubbleText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.primaryForeground,
    lineHeight: 21,
  },

  // ── Assistant bubble ───────────────────────────────────────────────
  assistantBubbleOuter: {
    width: "92%",
    marginBottom: 12,
  },
  assistantRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  iconWellOuter: {
    marginTop: 2,
    flexShrink: 0,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantBubbleInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.button,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thinkingText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  streamingText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 21,
  },

  // ── Empty state ────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  emptyIconWell: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
    color: COLORS.foreground,
  },
  emptyDesc: {
    textAlign: "center",
    marginBottom: 32,
    color: COLORS.mutedForeground,
  },
  promptsContainer: {
    width: "100%",
    gap: 8,
  },
  promptCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.button,
  },
  promptText: {
    fontFamily: FONTS.body,
    color: COLORS.foreground,
    fontSize: 14,
  },

  // ── Input bar ──────────────────────────────────────────────────────
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 4,
  },
  inputField: {
    fontFamily: FONTS.body,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
    maxHeight: 120,
    borderRadius: RADII.button,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
