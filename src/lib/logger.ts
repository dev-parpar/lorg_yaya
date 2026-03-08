type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function formatEntry(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  // Human-readable in development, structured JSON in production
  if (process.env.NODE_ENV === "development") {
    return entry;
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatEntry("debug", message, context));
    }
  },

  info(message: string, context?: LogContext) {
    console.info(formatEntry("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatEntry("warn", message, context));
  },

  error(message: string, context?: LogContext) {
    console.error(formatEntry("error", message, context));
  },
};
