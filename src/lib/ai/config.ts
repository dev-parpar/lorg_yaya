function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Set it in your .env file and redeploy.`,
    );
  }
  return value;
}

/**
 * Centralised AI configuration driven entirely by environment variables.
 * To switch models or providers, update .env — no code changes required.
 */
export const aiConfig = {
  get provider(): "anthropic" | "openai" {
    return (process.env.AI_PROVIDER ?? "anthropic") as "anthropic" | "openai";
  },

  get model(): string {
    return process.env.AI_MODEL ?? "claude-3-5-sonnet-20241022";
  },

  get maxTokens(): number {
    return parseInt(process.env.AI_MAX_TOKENS ?? "1024", 10);
  },

  get anthropicApiKey(): string {
    return requireEnv("ANTHROPIC_API_KEY");
  },
} as const;
