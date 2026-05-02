import { useState, useCallback } from "react";
import { supabase } from "@/lib/auth/supabase";
import { API_BASE_URL } from "@/lib/constants";
import { executeInventoryActions } from "@/lib/ai/execute-actions";
import type {
  ChatMessage,
  FlatInventoryItem,
  ActionResponse,
  InventoryAction,
} from "@/types";

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

interface UseAiChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (
    text: string,
    inventory: FlatInventoryItem[],
    activeLocationId?: string | null,
  ) => Promise<void>;
  confirmActions: (messageId: string) => Promise<void>;
  rejectActions: (messageId: string) => void;
  clearMessages: () => void;
}

export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (
      text: string,
      inventory: FlatInventoryItem[],
      activeLocationId?: string | null,
    ) => {
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
            // Only stream for text/plain responses — JSON arrives all at once
            const contentType = xhr.getResponseHeader("Content-Type") ?? "";
            if (contentType.includes("application/json")) return;

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

            const contentType = xhr.getResponseHeader("Content-Type") ?? "";

            if (contentType.includes("application/json")) {
              // Action response — Claude invoked the manage_inventory tool
              try {
                const actionResponse = JSON.parse(
                  xhr.responseText,
                ) as ActionResponse;

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          content: actionResponse.text,
                          actions: actionResponse.actions,
                          actionStatus: "pending" as const,
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
              } catch {
                // Fallback: treat as plain text if JSON parsing fails
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: xhr.responseText, isStreaming: false }
                      : m,
                  ),
                );
              }
            } else {
              // Text response — drain any remaining bytes
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
              activeLocationId: activeLocationId ?? undefined,
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

  const confirmActions = useCallback(async (messageId: string) => {
    // Find the message and its actions
    let actions: InventoryAction[] | undefined;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.actionStatus === "pending") {
          actions = m.actions;
          return { ...m, actionStatus: "confirmed" as const };
        }
        return m;
      }),
    );

    if (!actions || actions.length === 0) return;

    try {
      const results = await executeInventoryActions(actions);
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        const errorSummary = failures
          .map((f) => f.error ?? "Unknown error")
          .join(", ");

        // Add a follow-up message about partial failures
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: `Some actions failed: ${errorSummary}`,
          },
        ]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute actions";

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: `Failed to execute actions: ${errorMessage}`,
        },
      ]);
    }
  }, []);

  const rejectActions = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.actionStatus === "pending"
          ? { ...m, actionStatus: "rejected" as const }
          : m,
      ),
    );
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    isStreaming,
    sendMessage,
    confirmActions,
    rejectActions,
    clearMessages,
  };
}
