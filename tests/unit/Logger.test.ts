/**
 * Logger.test.ts — Unit tests for structured logging
 *
 * Phase 7, Task 7.2
 */

import { Logger } from "../../src/monitoring/Logger";
import type { LogTransport, LogEntry } from "../../src/monitoring/Logger";

describe("Logger", () => {
  beforeEach(() => {
    Logger.resetInstance();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "debug").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Logger.resetInstance();
  });

  describe("singleton", () => {
    it("returns the same instance on repeated calls", () => {
      const a = Logger.getInstance();
      const b = Logger.getInstance();
      expect(a).toBe(b);
    });

    it("creates a new instance after resetInstance()", () => {
      const a = Logger.getInstance();
      Logger.resetInstance();
      const b = Logger.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe("log levels", () => {
    it("logs error messages to console.error", () => {
      const logger = Logger.getInstance({ minLevel: "error" });
      logger.error("TestSource", "Something failed");
      expect(console.error).toHaveBeenCalled();
    });

    it("logs warn messages to console.warn", () => {
      const logger = Logger.getInstance({ minLevel: "warn" });
      logger.warn("TestSource", "Something concerning");
      expect(console.warn).toHaveBeenCalled();
    });

    it("logs info messages to console.info", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("TestSource", "Something happened");
      expect(console.info).toHaveBeenCalled();
    });

    it("logs debug messages to console.debug", () => {
      const logger = Logger.getInstance({ minLevel: "debug" });
      logger.debug("TestSource", "Debug detail");
      expect(console.debug).toHaveBeenCalled();
    });

    it("filters messages below minimum level", () => {
      const logger = Logger.getInstance({ minLevel: "warn" });
      logger.info("TestSource", "Should not appear");
      logger.debug("TestSource", "Should not appear");
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    it("error level shows only errors", () => {
      const logger = Logger.getInstance({ minLevel: "error" });
      logger.warn("Test", "no");
      logger.info("Test", "no");
      logger.debug("Test", "no");
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe("structured output", () => {
    it("includes source in log prefix", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("ViewerCore", "Initialized");
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[ViewerCore]"),
        expect.anything(),
      );
    });

    it("includes data in log output", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("ModelLoader", "Loaded", { projectId: "sample" });
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[ModelLoader]"),
        expect.objectContaining({ projectId: "sample" }),
      );
    });

    it("includes error object in error logs", () => {
      const logger = Logger.getInstance({ minLevel: "error" });
      const err = new Error("test error");
      logger.error("Test", "Failed", {}, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[Test]"),
        expect.anything(),
        expect.objectContaining({ name: "Error", message: "test error" }),
      );
    });
  });

  describe("history", () => {
    it("stores log entries in history", () => {
      const logger = Logger.getInstance({ minLevel: "debug" });
      logger.info("A", "msg1");
      logger.warn("B", "msg2");
      const history = logger.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].source).toBe("A");
      expect(history[1].source).toBe("B");
    });

    it("getHistory(n) returns last n entries", () => {
      const logger = Logger.getInstance({ minLevel: "debug" });
      logger.info("A", "m1");
      logger.info("B", "m2");
      logger.info("C", "m3");
      const last2 = logger.getHistory(2);
      expect(last2).toHaveLength(2);
      expect(last2[0].source).toBe("B");
      expect(last2[1].source).toBe("C");
    });

    it("clearHistory() empties the log", () => {
      const logger = Logger.getInstance({ minLevel: "debug" });
      logger.info("A", "msg");
      logger.clearHistory();
      expect(logger.getHistory()).toHaveLength(0);
    });

    it("history entries have timestamps", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Test", "msg");
      const entry = logger.getHistory()[0];
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("history entries have correct level", () => {
      const logger = Logger.getInstance({ minLevel: "debug" });
      logger.error("X", "e");
      logger.warn("X", "w");
      logger.info("X", "i");
      logger.debug("X", "d");
      const levels = logger.getHistory().map((e) => e.level);
      expect(levels).toEqual(["error", "warn", "info", "debug"]);
    });
  });

  describe("redaction", () => {
    it("redacts Bearer tokens in messages", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Auth", "Token: Bearer abc123.xyz.000");
      const entry = logger.getHistory()[0];
      expect(entry.message).not.toContain("abc123");
      expect(entry.message).toContain("[REDACTED]");
    });

    it("redacts token fields in data objects", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Auth", "Login", { accessToken: "secret123", user: "john" });
      const entry = logger.getHistory()[0];
      expect(entry.data?.accessToken).toBe("[REDACTED]");
      expect(entry.data?.user).toBe("john");
    });

    it("redacts password fields in data objects", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Auth", "Attempt", { password: "hunter2" });
      const entry = logger.getHistory()[0];
      expect(entry.data?.password).toBe("[REDACTED]");
    });

    it("redacts secret fields in data objects", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Config", "Loaded", { clientSecret: "s3cr3t" });
      const entry = logger.getHistory()[0];
      expect(entry.data?.clientSecret).toBe("[REDACTED]");
    });

    it("redacts nested objects", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("Config", "Deep", {
        config: { apiToken: "xyz", name: "test" },
      });
      const entry = logger.getHistory()[0];
      const config = entry.data?.config as Record<string, unknown>;
      expect(config.apiToken).toBe("[REDACTED]");
      expect(config.name).toBe("test");
    });

    it("redacts authorization fields", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.info("HTTP", "Headers", { authorization: "Bearer abc123" });
      const entry = logger.getHistory()[0];
      expect(entry.data?.authorization).toBe("[REDACTED]");
    });
  });

  describe("transports", () => {
    it("sends log entries to custom transports", () => {
      const entries: LogEntry[] = [];
      const mockTransport: LogTransport = {
        name: "test",
        log: (entry) => entries.push(entry),
      };

      const logger = Logger.getInstance({
        minLevel: "info",
        transports: [mockTransport],
      });

      logger.info("Test", "Hello transport");
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe("Hello transport");
    });

    it("continues logging if transport throws", () => {
      const badTransport: LogTransport = {
        name: "bad",
        log: () => {
          throw new Error("transport crash");
        },
      };

      const logger = Logger.getInstance({
        minLevel: "info",
        transports: [badTransport],
      });

      // Should not throw
      expect(() => logger.info("Test", "msg")).not.toThrow();
      expect(logger.getHistory()).toHaveLength(1);
    });

    it("addTransport() adds to existing list", () => {
      const entries: LogEntry[] = [];
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.addTransport({ name: "added", log: (e) => entries.push(e) });
      logger.info("Test", "After add");
      expect(entries).toHaveLength(1);
    });
  });

  describe("configure", () => {
    it("updates minimum log level", () => {
      const logger = Logger.getInstance({ minLevel: "info" });
      logger.configure({ minLevel: "debug" });
      logger.debug("Test", "Now visible");
      expect(console.debug).toHaveBeenCalled();
    });

    it("can disable stack traces", () => {
      const logger = Logger.getInstance({ minLevel: "error", includeStackTraces: true });
      logger.configure({ includeStackTraces: false });
      const err = new Error("test");
      logger.error("X", "err", {}, err);
      const entry = logger.getHistory()[0];
      expect(entry.error?.stack).toBeUndefined();
    });
  });
});
