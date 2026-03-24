/**
 * Logger.ts — Structured logging for the Civil BIM Viewer
 *
 * Provides a centralized, structured logging service that:
 * - Outputs JSON-formatted logs with timestamp, level, source, and message
 * - Supports log levels: error, warn, info, debug
 * - Filters by configurable minimum log level
 * - Optionally integrates with external services (Sentry, etc.)
 * - Prevents sensitive data from being logged (token patterns, etc.)
 *
 * Phase 7, Task 7.2
 */

// ── Types ──────────────────────────────────────────────────

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogTransport {
  /** Name of the transport (e.g., "console", "sentry") */
  name: string;
  /** Called for each log entry that passes the level filter */
  log(entry: LogEntry): void;
}

export interface LoggerConfig {
  /** Minimum log level to emit (default: "info") */
  minLevel?: LogLevel;
  /** Additional transports beyond console (e.g., Sentry) */
  transports?: LogTransport[];
  /** Whether to include stack traces in error logs (default: true) */
  includeStackTraces?: boolean;
  /** Patterns to redact from log output (default: token, password, secret patterns) */
  redactPatterns?: RegExp[];
}

// ── Constants ──────────────────────────────────────────────

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const DEFAULT_REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /token[=:]\s*["']?[A-Za-z0-9._-]+["']?/gi,
  /password[=:]\s*["']?[^\s"']+["']?/gi,
  /secret[=:]\s*["']?[^\s"']+["']?/gi,
  /[A-Za-z0-9+/]{40,}/g, // Long base64-like strings (potential tokens)
];

// ── Logger Class ──────────────────────────────────────────

/**
 * Structured logger for the Civil BIM Viewer.
 *
 * Usage:
 * ```typescript
 * const logger = Logger.getInstance();
 * logger.info("ViewerCore", "Viewer initialized", { canvasId: "viewer-canvas" });
 * logger.error("ModelLoader", "Failed to load model", { projectId }, err);
 * ```
 */
export class Logger {
  private static _instance: Logger | null = null;

  private _minLevel: LogLevel;
  private _transports: LogTransport[];
  private _includeStackTraces: boolean;
  private _redactPatterns: RegExp[];
  private _history: LogEntry[] = [];
  private _maxHistorySize = 500;

  private constructor(config: LoggerConfig = {}) {
    this._minLevel = config.minLevel ?? "info";
    this._transports = config.transports ?? [];
    this._includeStackTraces = config.includeStackTraces ?? true;
    this._redactPatterns = config.redactPatterns ?? [...DEFAULT_REDACT_PATTERNS];
  }

  /** Get the singleton Logger instance. */
  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(config);
    }
    return Logger._instance;
  }

  /** Reset the singleton (for testing). */
  static resetInstance(): void {
    Logger._instance = null;
  }

  /** Update logger configuration. */
  configure(config: LoggerConfig): void {
    if (config.minLevel !== undefined) this._minLevel = config.minLevel;
    if (config.transports !== undefined) this._transports = config.transports;
    if (config.includeStackTraces !== undefined)
      this._includeStackTraces = config.includeStackTraces;
    if (config.redactPatterns !== undefined) this._redactPatterns = config.redactPatterns;
  }

  /** Add a transport (e.g., Sentry). */
  addTransport(transport: LogTransport): void {
    this._transports.push(transport);
  }

  /** Get recent log history. */
  getHistory(count?: number): LogEntry[] {
    return count ? this._history.slice(-count) : [...this._history];
  }

  /** Clear log history. */
  clearHistory(): void {
    this._history = [];
  }

  // ── Log Methods ───────────────────────────────────────

  /** Log an error-level message. */
  error(source: string, message: string, data?: Record<string, unknown>, err?: Error): void {
    this._log("error", source, message, data, err);
  }

  /** Log a warning-level message. */
  warn(source: string, message: string, data?: Record<string, unknown>): void {
    this._log("warn", source, message, data);
  }

  /** Log an info-level message. */
  info(source: string, message: string, data?: Record<string, unknown>): void {
    this._log("info", source, message, data);
  }

  /** Log a debug-level message. */
  debug(source: string, message: string, data?: Record<string, unknown>): void {
    this._log("debug", source, message, data);
  }

  // ── Internal ──────────────────────────────────────────

  private _log(
    level: LogLevel,
    source: string,
    message: string,
    data?: Record<string, unknown>,
    err?: Error,
  ): void {
    if (LOG_LEVEL_ORDER[level] > LOG_LEVEL_ORDER[this._minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message: this._redact(message),
    };

    if (data) {
      entry.data = this._redactObject(data);
    }

    if (err) {
      entry.error = {
        name: err.name,
        message: this._redact(err.message),
        stack: this._includeStackTraces ? err.stack : undefined,
      };
    }

    // Store in history (ring buffer)
    this._history.push(entry);
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }

    // Console output
    this._consoleOutput(entry);

    // External transports
    for (const transport of this._transports) {
      try {
        transport.log(entry);
      } catch {
        // Silently ignore transport errors to prevent cascading failures
      }
    }
  }

  private _consoleOutput(entry: LogEntry): void {
    const prefix = `[${entry.source}]`;
    const logMsg = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "error":
        if (entry.error) {
          console.error(logMsg, entry.data ?? "", entry.error);
        } else {
          console.error(logMsg, entry.data ?? "");
        }
        break;
      case "warn":
        console.warn(logMsg, entry.data ?? "");
        break;
      case "info":
        console.info(logMsg, entry.data ?? "");
        break;
      case "debug":
        console.debug(logMsg, entry.data ?? "");
        break;
    }
  }

  private _redact(text: string): string {
    let result = text;
    for (const pattern of this._redactPatterns) {
      result = result.replace(pattern, "[REDACTED]");
    }
    return result;
  }

  private _redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("authorization")
      ) {
        redacted[key] = "[REDACTED]";
      } else if (typeof value === "string") {
        redacted[key] = this._redact(value);
      } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        redacted[key] = this._redactObject(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }
}
