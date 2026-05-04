const MAX_SPEECH_LENGTH = 480;

/**
 * Converts markdown-formatted text to clean speech suitable for
 * voice assistants. Strips tables, bold, headers, links, and
 * code blocks, then truncates to a voice-friendly length.
 */
export function markdownToVoice(text: string): string {
  let cleaned = text;

  // Remove markdown tables — replace with a brief description
  cleaned = cleaned.replace(
    /\|[^\n]+\|\n\|[-| :]+\|\n(\|[^\n]+\|\n?)*/g,
    "(see your Lorgy app for the full list) ",
  );

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove bold / italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Remove links — keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove bullet markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");

  // Collapse multiple newlines / whitespace
  cleaned = cleaned.replace(/\n{2,}/g, ". ");
  cleaned = cleaned.replace(/\n/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // Trim and truncate
  cleaned = cleaned.trim();
  if (cleaned.length > MAX_SPEECH_LENGTH) {
    // Cut at the last sentence boundary within the limit
    const truncated = cleaned.slice(0, MAX_SPEECH_LENGTH);
    const lastPeriod = truncated.lastIndexOf(".");
    cleaned = lastPeriod > MAX_SPEECH_LENGTH * 0.5
      ? truncated.slice(0, lastPeriod + 1)
      : truncated + "…";
  }

  return cleaned;
}

/**
 * Wraps text in SSML `<speak>` tags for voice assistant rendering.
 */
export function wrapSSML(text: string): string {
  // Escape XML special chars
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<speak>${escaped}</speak>`;
}
