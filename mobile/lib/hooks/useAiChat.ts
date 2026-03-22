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

export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (text: string, inventory: FlatInventoryItem[]) => {
      if (isStreaming) return;

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

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_BASE_URL}/api/ai/chat`);
          xhr.setRequestHeader("Content-Type", "application/json");
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.timeout = 60_000;

          // Tracks how many bytes of xhr.responseText we have already consumed
          // so each onprogress call only appends the new delta.
          let consumed = 0;

          xhr.onprogress = () => {
            const chunk = xhr.responseText.slice(consumed);
            consumed = xhr.responseText.length;
            if (!chunk) return;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          };

          xhr.onload = () => {
            if (xhr.status >= 400) {
              let errorMsg = `Request failed with status ${xhr.status}`;
              try {
                const parsed = JSON.parse(xhr.responseText) as {
                  error?: string;
                };
                if (parsed.error) errorMsg = parsed.error;
              } catch {
                // non-JSON error body — keep the default message
              }
              reject(new Error(errorMsg));
              return;
            }

            // Final flush — drain any bytes that onprogress may have missed
            const remaining = xhr.responseText.slice(consumed);
            if (remaining) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: m.content + remaining }
                    : m,
                ),
              );
            }
            resolve();
          };

          xhr.onerror = () =>
            reject(
              new Error("Network error — please check your connection."),
            );
          xhr.ontimeout = () => reject(new Error("Request timed out."));

          xhr.send(
            JSON.stringify({
              message: text,
              inventory,
              history: historySnapshot,
            }),
          );
        });
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
