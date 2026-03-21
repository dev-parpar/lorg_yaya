import { useState, useCallback } from "react";
import { supabase } from "@/lib/auth/supabase";
import { API_BASE_URL } from "@/lib/constants";
import type { ChatMessage, FlatInventoryItem } from "@/types";

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

interface UseAiChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (text: string, inventory: FlatInventoryItem[]) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Manages the AI chat conversation state and handles streaming responses.
 *
 * The full inventory is passed per-message (sourced from TanStack Query cache)
 * so the backend never needs to hit the database — it just validates the JWT
 * and pipes the request to Claude.
 *
 * Conversation history is kept in local state and sent with each message,
 * making the backend completely stateless.
 */
export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (text: string, inventory: FlatInventoryItem[]) => {
      if (isStreaming) return;

      // Snapshot current history before adding new messages
      const historySnapshot = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const userMsgId = generateId();
      const aiMsgId = generateId();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: text },
        { id: aiMsgId, role: "assistant", content: "", isStreaming: true },
      ]);

      setIsStreaming(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            inventory,
            history: historySnapshot,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Streaming is not supported in this environment");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred.";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: `Sorry, I ran into an error: ${errorMessage}`,
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsStreaming(false);
      }
    },
    [isStreaming, messages],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
