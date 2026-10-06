import "server-only";

import { getServerEnv } from "@/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|api[_-]?key|authorization|cookie|session|credential)/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(String(index), item));
  }

  if (value && typeof value === "object") {
    return sanitizeContext(value as LogContext);
  }

  return value;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeValue(key, value);
  }

  return sanitized;
}

function shouldLog(level: LogLevel): boolean {
  const configured = getServerEnv().LOG_LEVEL;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[configured];
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(sanitizeContext(context) ?? {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "debug":
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
};
