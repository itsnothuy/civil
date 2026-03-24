/**
 * ServerPipeline.test.ts — Unit tests for Server-Assisted Conversion Pipeline
 * Phase 6, Task 6.6
 */

// Polyfill TextEncoder/TextDecoder for jsdom
import { TextEncoder, TextDecoder } from "util";

if (typeof globalThis.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextDecoder = TextDecoder;
}

import {
  createDefaultConfig,
  validateExtension,
  validateMimeType,
  validateContent,
  validateUpload,
  type UploadConfig,
  type UploadRequest,
} from "../../server/pipeline/UploadEndpoint";

import { ConversionQueue, type ConversionJob } from "../../server/pipeline/ConversionQueue";

import {
  InMemoryStorage,
  createDefaultCDNConfig,
  buildCDNUrl,
} from "../../server/pipeline/ModelStorage";

// ── Helpers ────────────────────────────────────────────────

function makeIFCContent(): Uint8Array {
  return new TextEncoder().encode("ISO-10303-21;\nHEADER;...");
}

function makeUploadRequest(overrides?: Partial<UploadRequest>): UploadRequest {
  return {
    fileName: overrides?.fileName ?? "model.ifc",
    mimeType: overrides?.mimeType ?? "application/x-step",
    fileSize: overrides?.fileSize ?? 1024,
    content: overrides?.content ?? makeIFCContent(),
  };
}

// ── UploadEndpoint tests ───────────────────────────────────

describe("UploadEndpoint", () => {
  let config: UploadConfig;

  beforeEach(() => {
    config = createDefaultConfig();
  });

  describe("createDefaultConfig", () => {
    it("returns default values", () => {
      expect(config.maxFileSize).toBe(200 * 1024 * 1024);
      expect(config.allowedExtensions).toEqual([".ifc"]);
      expect(config.uploadDir).toBe("uploads/");
    });

    it("accepts overrides", () => {
      const custom = createDefaultConfig({ maxFileSize: 50 * 1024 * 1024 });
      expect(custom.maxFileSize).toBe(50 * 1024 * 1024);
    });
  });

  describe("validateExtension", () => {
    it("accepts .ifc", () => {
      expect(validateExtension("model.ifc", config)).toBe(true);
    });

    it("rejects .dwg", () => {
      expect(validateExtension("model.dwg", config)).toBe(false);
    });

    it("rejects no extension", () => {
      expect(validateExtension("model", config)).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(validateExtension("model.IFC", config)).toBe(true);
    });
  });

  describe("validateMimeType", () => {
    it("accepts application/x-step", () => {
      expect(validateMimeType("application/x-step", config)).toBe(true);
    });

    it("accepts application/octet-stream", () => {
      expect(validateMimeType("application/octet-stream", config)).toBe(true);
    });

    it("rejects text/plain", () => {
      expect(validateMimeType("text/plain", config)).toBe(false);
    });
  });

  describe("validateContent", () => {
    it("accepts valid IFC header", () => {
      expect(validateContent(makeIFCContent())).toBe(true);
    });

    it("rejects non-IFC content", () => {
      const bad = new TextEncoder().encode("NOT-AN-IFC-FILE");
      expect(validateContent(bad)).toBe(false);
    });

    it("rejects empty content", () => {
      expect(validateContent(new Uint8Array(0))).toBe(false);
    });

    it("rejects short content", () => {
      expect(validateContent(new Uint8Array(5))).toBe(false);
    });
  });

  describe("validateUpload (full pipeline)", () => {
    it("accepts valid upload", () => {
      const result = validateUpload(makeUploadRequest(), config);
      expect(result.success).toBe(true);
      expect(result.fileName).toBe("model.ifc");
    });

    it("rejects missing file", () => {
      const result = validateUpload(makeUploadRequest({ fileName: "", fileSize: 0 }), config);
      expect(result.success).toBe(false);
      expect(result.code).toBe("NO_FILE");
    });

    it("rejects oversized file", () => {
      const result = validateUpload(makeUploadRequest({ fileSize: 300 * 1024 * 1024 }), config);
      expect(result.success).toBe(false);
      expect(result.code).toBe("FILE_TOO_LARGE");
    });

    it("rejects bad extension", () => {
      const result = validateUpload(makeUploadRequest({ fileName: "model.dwg" }), config);
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_EXTENSION");
    });

    it("rejects bad MIME type", () => {
      const result = validateUpload(makeUploadRequest({ mimeType: "text/plain" }), config);
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_TYPE");
    });

    it("rejects corrupt content", () => {
      const result = validateUpload(
        makeUploadRequest({ content: new TextEncoder().encode("CORRUPT") }),
        config,
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe("VALIDATION_FAILED");
    });

    it("enforces configurable size limit", () => {
      const small = createDefaultConfig({ maxFileSize: 512 });
      const result = validateUpload(makeUploadRequest({ fileSize: 1024 }), small);
      expect(result.success).toBe(false);
      expect(result.code).toBe("FILE_TOO_LARGE");
    });
  });
});

// ── ConversionQueue tests ──────────────────────────────────

describe("ConversionQueue", () => {
  let queue: ConversionQueue;

  beforeEach(() => {
    queue = new ConversionQueue({ concurrency: 2, maxRetries: 2 });
  });

  afterEach(() => {
    queue.destroy();
  });

  describe("enqueue", () => {
    it("creates a job with pending status", () => {
      // Don't set a worker, so the job stays pending
      const id = queue.enqueue("/uploads/input.ifc", "/output/model.xkt");
      const job = queue.getJob(id);
      expect(job).toBeDefined();
      expect(job!.status).toBe("pending");
      expect(job!.inputPath).toBe("/uploads/input.ifc");
    });

    it("increments size", () => {
      queue.enqueue("/a.ifc", "/a.xkt");
      queue.enqueue("/b.ifc", "/b.xkt");
      expect(queue.size).toBe(2);
    });

    it("emits job-added event", () => {
      const cb = jest.fn();
      queue.on("job-added", cb);
      queue.enqueue("/a.ifc", "/a.xkt");
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("worker + processing", () => {
    it("processes jobs through worker", async () => {
      const worker = jest.fn(async (_job: ConversionJob, report: (p: number) => void) => {
        report(50);
        report(100);
      });
      queue.setWorker(worker);

      const id = queue.enqueue("/a.ifc", "/a.xkt");

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 50));

      const job = queue.getJob(id);
      expect(job!.status).toBe("completed");
      expect(job!.progress).toBe(100);
      expect(worker).toHaveBeenCalled();
    });

    it("emits progress events", async () => {
      const progressValues: number[] = [];
      queue.on("job-progress", (_j: unknown, p: unknown) => progressValues.push(p as number));
      queue.setWorker(async (_job, report) => {
        report(25);
        report(75);
      });
      queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 50));
      expect(progressValues).toContain(25);
      expect(progressValues).toContain(75);
    });

    it("retries failed jobs", async () => {
      let attempts = 0;
      queue.setWorker(async () => {
        attempts++;
        if (attempts <= 2) throw new Error("Temporary failure");
      });
      queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 200));
      // maxRetries = 2, so 1 initial + 2 retries = 3 attempts
      expect(attempts).toBe(3);
    });

    it("marks job as failed after max retries", async () => {
      queue.setWorker(async () => {
        throw new Error("Permanent failure");
      });
      const id = queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 200));
      const job = queue.getJob(id);
      expect(job!.status).toBe("failed");
      expect(job!.error).toBe("Permanent failure");
    });

    it("emits job-completed event", async () => {
      const cb = jest.fn();
      queue.on("job-completed", cb);
      queue.setWorker(async () => {
        /* noop */
      });
      queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 50));
      expect(cb).toHaveBeenCalled();
    });

    it("emits job-failed event", async () => {
      const cb = jest.fn();
      const q = new ConversionQueue({ concurrency: 1, maxRetries: 0 });
      q.on("job-failed", cb);
      q.setWorker(async () => {
        throw new Error("Fail");
      });
      q.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 50));
      expect(cb).toHaveBeenCalled();
      q.destroy();
    });

    it("respects concurrency limit", async () => {
      let running = 0;
      let maxRunning = 0;
      queue.setWorker(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
      });
      queue.enqueue("/a.ifc", "/a.xkt");
      queue.enqueue("/b.ifc", "/b.xkt");
      queue.enqueue("/c.ifc", "/c.xkt");
      await new Promise((r) => setTimeout(r, 300));
      expect(maxRunning).toBeLessThanOrEqual(2);
    });
  });

  describe("cancel", () => {
    it("cancels a pending job", () => {
      // No worker, so job stays pending
      const id = queue.enqueue("/a.ifc", "/a.xkt");
      expect(queue.cancel(id)).toBe(true);
      expect(queue.getJob(id)!.status).toBe("cancelled");
    });

    it("returns false for non-existent job", () => {
      expect(queue.cancel("nope")).toBe(false);
    });

    it("returns false for already completed job", async () => {
      queue.setWorker(async () => {
        /* noop */
      });
      const id = queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 50));
      expect(queue.cancel(id)).toBe(false);
    });
  });

  describe("pause / resume", () => {
    it("pauses and resumes processing", async () => {
      const processed: string[] = [];
      queue.setWorker(async (job) => {
        processed.push(job.id);
      });

      queue.pause();
      expect(queue.isPaused).toBe(true);

      const id = queue.enqueue("/a.ifc", "/a.xkt");
      await new Promise((r) => setTimeout(r, 50));
      expect(queue.getJob(id)!.status).toBe("pending");

      queue.resume();
      expect(queue.isPaused).toBe(false);

      await new Promise((r) => setTimeout(r, 50));
      expect(queue.getJob(id)!.status).toBe("completed");
    });
  });

  describe("prune", () => {
    it("removes completed/failed/cancelled jobs", async () => {
      queue.setWorker(async () => {
        /* noop */
      });
      queue.enqueue("/a.ifc", "/a.xkt");
      queue.enqueue("/b.ifc", "/b.xkt");
      await new Promise((r) => setTimeout(r, 50));
      const removed = queue.prune();
      expect(removed).toBe(2);
      expect(queue.size).toBe(0);
    });
  });

  describe("getAllJobs", () => {
    it("returns all jobs", () => {
      queue.enqueue("/a.ifc", "/a.xkt");
      queue.enqueue("/b.ifc", "/b.xkt");
      expect(queue.getAllJobs()).toHaveLength(2);
    });
  });

  describe("destroy", () => {
    it("cancels all pending jobs", () => {
      queue.enqueue("/a.ifc", "/a.xkt");
      queue.enqueue("/b.ifc", "/b.xkt");
      queue.destroy();
      const jobs = queue.getAllJobs();
      for (const j of jobs) {
        expect(j.status).toBe("cancelled");
      }
    });
  });
});

// ── ModelStorage tests ─────────────────────────────────────

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage("/models");
  });

  it("stores and retrieves a file", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const url = await storage.store("model.xkt", data, "application/octet-stream");
    expect(url).toBe("/models/model.xkt");
    const retrieved = await storage.retrieve("model.xkt");
    expect(retrieved).toEqual(data);
  });

  it("returns null for non-existent key", async () => {
    expect(await storage.retrieve("nope")).toBeNull();
  });

  it("checks existence", async () => {
    expect(await storage.exists("model.xkt")).toBe(false);
    await storage.store("model.xkt", new Uint8Array([1]), "app/bin");
    expect(await storage.exists("model.xkt")).toBe(true);
  });

  it("deletes a file", async () => {
    await storage.store("model.xkt", new Uint8Array([1]), "app/bin");
    expect(await storage.delete("model.xkt")).toBe(true);
    expect(await storage.exists("model.xkt")).toBe(false);
  });

  it("returns false when deleting non-existent", async () => {
    expect(await storage.delete("nope")).toBe(false);
  });

  it("lists files by prefix", async () => {
    await storage.store("proj/a.xkt", new Uint8Array([1]), "app/bin");
    await storage.store("proj/b.xkt", new Uint8Array([2]), "app/bin");
    await storage.store("other/c.xkt", new Uint8Array([3]), "app/bin");
    const keys = await storage.list("proj/");
    expect(keys).toHaveLength(2);
    expect(keys).toContain("proj/a.xkt");
  });

  it("reports fileCount", async () => {
    expect(storage.fileCount).toBe(0);
    await storage.store("a", new Uint8Array([1]), "bin");
    expect(storage.fileCount).toBe(1);
  });

  it("clears all files", async () => {
    await storage.store("a", new Uint8Array([1]), "bin");
    storage.clear();
    expect(storage.fileCount).toBe(0);
  });
});

// ── CDN Config tests ───────────────────────────────────────

describe("CDN Configuration", () => {
  it("creates default config", () => {
    const cdn = createDefaultCDNConfig();
    expect(cdn.baseUrl).toBe("/cdn/models");
    expect(cdn.cacheControl).toContain("max-age");
    expect(cdn.useContentHash).toBe(true);
  });

  it("builds CDN URL without hash", () => {
    const cdn = createDefaultCDNConfig({ useContentHash: false });
    expect(buildCDNUrl(cdn, "model.xkt")).toBe("/cdn/models/model.xkt");
  });

  it("builds CDN URL with hash", () => {
    const cdn = createDefaultCDNConfig();
    expect(buildCDNUrl(cdn, "model.xkt", "abc123")).toBe("/cdn/models/model.xkt?h=abc123");
  });

  it("handles trailing slash in baseUrl", () => {
    const cdn = createDefaultCDNConfig({ baseUrl: "/cdn/models/" });
    expect(buildCDNUrl(cdn, "model.xkt")).toBe("/cdn/models/model.xkt");
  });
});
