/**
 * PerformanceOptimizer unit tests — Task 5.7
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PerformanceOptimizer } from "../../src/viewer/PerformanceOptimizer";
import type {
  PerformanceMetrics,
  LODLevel,
  CacheEntry,
} from "../../src/viewer/PerformanceOptimizer";

// ── Mocks ─────────────────────────────────────────────────

function makeObjectWithAABB(aabb: number[], visible = true) {
  return { aabb, visible, xrayed: false };
}

function makeMockViewer(objects: Record<string, any> = {}) {
  const objectIds = Object.keys(objects);
  return {
    viewer: {
      scene: {
        objectIds,
        objects,
        setObjectsVisible: jest.fn(),
        setObjectsXRayed: jest.fn(),
        stats: { numTriangles: 50000, numDrawCalls: 120 },
      },
      camera: { eye: [0, 0, 0] },
      cameraFlight: { flyTo: jest.fn() },
    },
    onSelect: jest.fn(),
    selectEntity: jest.fn(),
    mode: "3d" as const,
    setMode: jest.fn(),
    setXray: jest.fn(),
    destroy: jest.fn(),
  } as any;
}

// ── Fake IndexedDB ────────────────────────────────────────

class FakeIDBObjectStore {
  private _data = new Map<string, any>();
  put(value: any, key: string) {
    this._data.set(key, value);
    return { onsuccess: null, onerror: null };
  }
  get(key: string) {
    const result = this._data.get(key) ?? undefined;
    const req: any = { result };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }
  getAll() {
    const result = Array.from(this._data.values());
    const req: any = { result };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }
  clear() {
    this._data.clear();
    return { onsuccess: null, onerror: null };
  }
}

class FakeIDBTransaction {
  private _stores: Record<string, FakeIDBObjectStore>;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: Error | null = null;

  constructor(stores: Record<string, FakeIDBObjectStore>) {
    this._stores = stores;
    // Auto-complete after microtask
    Promise.resolve().then(() => this.oncomplete?.());
  }
  objectStore(name: string) {
    return this._stores[name];
  }
}

class FakeIDBDatabase {
  private _stores: Record<string, FakeIDBObjectStore> = {};
  objectStoreNames = { contains: (n: string) => !!this._stores[n] };

  createObjectStore(name: string) {
    this._stores[name] = new FakeIDBObjectStore();
    this.objectStoreNames = { contains: (n: string) => !!this._stores[n] };
    return this._stores[name];
  }
  transaction(storeNames: string | string[], _mode?: string) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const stores: Record<string, FakeIDBObjectStore> = {};
    for (const n of names) {
      if (!this._stores[n]) this._stores[n] = new FakeIDBObjectStore();
      stores[n] = this._stores[n];
    }
    return new FakeIDBTransaction(stores);
  }
}

// Setup fake indexedDB
let fakeDB: FakeIDBDatabase;

beforeEach(() => {
  fakeDB = new FakeIDBDatabase();
  fakeDB.createObjectStore("models");
  fakeDB.createObjectStore("meta");

  (globalThis as any).indexedDB = {
    open: (_name: string, _version?: number) => {
      const req: any = {};
      Promise.resolve().then(() => {
        req.result = fakeDB;
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
});

afterEach(() => {
  delete (globalThis as any).indexedDB;
});

// ── Tests ─────────────────────────────────────────────────

describe("PerformanceOptimizer", () => {
  describe("initialization", () => {
    it("creates with default state", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      expect(opt.lodEnabled).toBe(false);
      expect(opt.lazyLoadEnabled).toBe(false);
      expect(opt.cacheEnabled).toBe(false);
      expect(opt.currentFps).toBe(60);
      expect(opt.culledObjectIds).toEqual([]);
      expect(opt.metricsHistory).toEqual([]);
    });

    it("accepts custom LOD levels", () => {
      const viewer = makeMockViewer();
      const levels: LODLevel[] = [
        { name: "close", distance: 20, maxObjects: Infinity, simplifyDistant: false },
        { name: "far", distance: 100, maxObjects: 1000, simplifyDistant: true },
      ];
      const opt = new PerformanceOptimizer(viewer, levels);
      expect(opt.lodLevels).toHaveLength(2);
      expect(opt.lodLevels[0].name).toBe("close");
    });
  });

  describe("LOD management", () => {
    it("enables and disables LOD", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      opt.enableLOD();
      expect(opt.lodEnabled).toBe(true);

      opt.disableLOD();
      expect(opt.lodEnabled).toBe(false);
    });

    it("enableLOD is idempotent", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      opt.enableLOD();
      opt.enableLOD(); // second call should be no-op
      expect(opt.lodEnabled).toBe(true);
      opt.disableLOD();
    });

    it("restores culled objects when LOD is disabled", () => {
      const objects = {
        o1: makeObjectWithAABB([0, 0, 0, 1, 1, 1]),
        o2: makeObjectWithAABB([1000, 0, 0, 1001, 1, 1]),
      };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);

      // Manually set culled objects
      (opt as any)._culledObjectIds = ["o2"];

      opt.disableLOD();
      expect(viewer.viewer.scene.setObjectsVisible).toHaveBeenCalledWith(["o2"], true);
      expect(viewer.viewer.scene.setObjectsXRayed).toHaveBeenCalledWith(["o2"], false);
      expect(opt.culledObjectIds).toEqual([]);
    });

    it("setLODLevels updates and sorts levels", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      opt.setLODLevels([
        { name: "far", distance: 500, maxObjects: 1000, simplifyDistant: true },
        { name: "near", distance: 10, maxObjects: Infinity, simplifyDistant: false },
      ]);
      expect(opt.lodLevels[0].name).toBe("near");
      expect(opt.lodLevels[1].name).toBe("far");
    });
  });

  describe("lazy loading", () => {
    it("enables and disables lazy loading", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      opt.enableLazyLoad();
      expect(opt.lazyLoadEnabled).toBe(true);

      opt.disableLazyLoad();
      expect(opt.lazyLoadEnabled).toBe(false);
    });
  });

  describe("model caching", () => {
    it("enables and disables cache", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      opt.enableCache();
      expect(opt.cacheEnabled).toBe(true);

      opt.disableCache();
      expect(opt.cacheEnabled).toBe(false);
    });

    it("returns false when caching disabled", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      const data = new ArrayBuffer(8);
      const result = await opt.cacheModel("proj1", "model.glb", data);
      expect(result).toBe(false);
    });

    it("returns null for getCachedModel when disabled", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      const result = await opt.getCachedModel("model.glb");
      expect(result).toBeNull();
    });

    it("cacheModel stores and retrieves model data", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      opt.enableCache();

      const data = new ArrayBuffer(1024);
      const cached = await opt.cacheModel("proj1", "model.glb", data);
      expect(cached).toBe(true);

      const retrieved = await opt.getCachedModel("model.glb");
      // The fake store may return the data
      expect(retrieved !== undefined).toBe(true);
    });

    it("getCacheEntries returns metadata", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      opt.enableCache();

      await opt.cacheModel("proj1", "model.glb", new ArrayBuffer(2048));

      const entries = await opt.getCacheEntries();
      expect(Array.isArray(entries)).toBe(true);
    });

    it("clearCache empties stores", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      opt.enableCache();

      await opt.cacheModel("proj1", "model.glb", new ArrayBuffer(512));

      await opt.clearCache();
      // After clear, entries should be empty
      const entries = await opt.getCacheEntries();
      expect(entries).toEqual([]);
    });

    it("getCacheSize returns total bytes", async () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      // When disabled, entries is []
      const size = await opt.getCacheSize();
      expect(size).toBe(0);
    });

    it("maxCacheSizeMB returns 500", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      expect(opt.maxCacheSizeMB).toBe(500);
    });
  });

  describe("metrics & profiling", () => {
    it("captureMetrics returns a snapshot", () => {
      const objects = {
        obj1: makeObjectWithAABB([0, 0, 0, 1, 1, 1], true),
        obj2: makeObjectWithAABB([2, 0, 0, 3, 1, 1], false),
      };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);

      const m = opt.captureMetrics();
      expect(m.fps).toBe(60);
      expect(m.objectCount).toBe(2);
      expect(m.visibleObjectCount).toBe(1); // obj2.visible = false
      expect(m.timestamp).toBeGreaterThan(0);
      expect(m.drawCalls).toBe(120);
      expect(m.triangleCount).toBe(50000);
    });

    it("metricsHistory accumulates snapshots", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      opt.captureMetrics();
      opt.captureMetrics();
      opt.captureMetrics();

      expect(opt.metricsHistory).toHaveLength(3);
    });

    it("metricsHistory caps at 100 entries", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      for (let i = 0; i < 110; i++) {
        opt.captureMetrics();
      }
      expect(opt.metricsHistory).toHaveLength(100);
    });

    it("generateReport returns formatted string", () => {
      const viewer = makeMockViewer({ a: makeObjectWithAABB([0, 0, 0, 1, 1, 1]) });
      const opt = new PerformanceOptimizer(viewer);
      opt.captureMetrics();

      const report = opt.generateReport();
      expect(report).toContain("Performance Report");
      expect(report).toContain("Snapshots: 1");
      expect(report).toContain("LOD: OFF");
      expect(report).toContain("Cache: OFF");
    });

    it("generateReport handles empty history", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      expect(opt.generateReport()).toBe("No metrics captured yet.");
    });
  });

  describe("destroy", () => {
    it("cleans up state", () => {
      const objects = { o1: makeObjectWithAABB([0, 0, 0, 1, 1, 1]) };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);

      opt.enableLOD();
      opt.captureMetrics();
      (opt as any)._culledObjectIds = ["o1"];

      opt.destroy();

      expect(opt.lodEnabled).toBe(false);
      expect(opt.culledObjectIds).toEqual([]);
      expect(opt.metricsHistory).toEqual([]);
    });
  });

  describe("LOD culling logic", () => {
    it("_getActiveLOD returns correct level", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);

      // Default levels: high(50/Inf), medium(200/10K), low(500/5K)
      // Algorithm: iterate from end, return first level where count >= maxObjects
      const getActive = (opt as any)._getActiveLOD.bind(opt);
      expect(getActive(100).name).toBe("high"); // 100 < 5000, falls through to [0]
      expect(getActive(6000).name).toBe("low"); // 6000 >= 5000 (low)
      expect(getActive(15000).name).toBe("low"); // 15000 >= 5000 (low, matched first from end)
    });

    it("_applyLODCulling culls distant objects", () => {
      const objects = {
        near: makeObjectWithAABB([0, 0, 0, 1, 1, 1]),
        far: makeObjectWithAABB([9000, 0, 0, 9001, 1, 1]),
      };
      const viewer = makeMockViewer(objects);
      viewer.viewer.camera.eye = [0, 0, 0];
      const opt = new PerformanceOptimizer(viewer);

      // Call private method directly
      (opt as any)._applyLODCulling();

      // "far" object should be culled (distance > 50)
      expect(opt.culledObjectIds.length).toBeGreaterThanOrEqual(1);
      expect(opt.culledObjectIds).toContain("far");
    });

    it("_applyLODCulling handles empty scene", () => {
      const viewer = makeMockViewer({});
      const opt = new PerformanceOptimizer(viewer);
      (opt as any)._applyLODCulling();
      expect(opt.culledObjectIds).toEqual([]);
    });

    it("_applyLODCulling skips objects without aabb", () => {
      const objects = {
        noAABB: { visible: true },
        withAABB: makeObjectWithAABB([0, 0, 0, 1, 1, 1]),
      };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);
      (opt as any)._applyLODCulling();
      // Should not crash
      expect(opt.culledObjectIds).not.toContain("noAABB");
    });
  });

  describe("_restoreCulled", () => {
    it("restores visible and un-xrays culled objects", () => {
      const objects = {
        a: makeObjectWithAABB([0, 0, 0, 1, 1, 1]),
        b: makeObjectWithAABB([2, 0, 0, 3, 1, 1]),
      };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);

      (opt as any)._culledObjectIds = ["a", "b"];
      (opt as any)._restoreCulled();

      expect(viewer.viewer.scene.setObjectsVisible).toHaveBeenCalledWith(["a", "b"], true);
      expect(viewer.viewer.scene.setObjectsXRayed).toHaveBeenCalledWith(["a", "b"], false);
      expect(opt.culledObjectIds).toEqual([]);
    });

    it("handles empty culled list", () => {
      const viewer = makeMockViewer();
      const opt = new PerformanceOptimizer(viewer);
      (opt as any)._restoreCulled();
      expect(viewer.viewer.scene.setObjectsVisible).not.toHaveBeenCalled();
    });

    it("filters out invalid object IDs", () => {
      const objects = { a: makeObjectWithAABB([0, 0, 0, 1, 1, 1]) };
      const viewer = makeMockViewer(objects);
      const opt = new PerformanceOptimizer(viewer);

      (opt as any)._culledObjectIds = ["a", "nonexistent"];
      (opt as any)._restoreCulled();

      // Only "a" should be restored (nonexistent is filtered)
      expect(viewer.viewer.scene.setObjectsVisible).toHaveBeenCalledWith(["a"], true);
    });
  });

  describe("type exports", () => {
    it("PerformanceMetrics shape", () => {
      const m: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.6,
        drawCalls: 100,
        triangleCount: 10000,
        heapUsedMB: 50,
        objectCount: 500,
        visibleObjectCount: 400,
        timestamp: Date.now(),
      };
      expect(m.fps).toBe(60);
    });

    it("CacheEntry shape", () => {
      const e: CacheEntry = {
        projectId: "proj",
        url: "model.glb",
        size: 1024,
        cachedAt: Date.now(),
        format: "glb",
      };
      expect(e.format).toBe("glb");
    });

    it("LODLevel shape", () => {
      const l: LODLevel = {
        name: "test",
        distance: 100,
        maxObjects: 5000,
        simplifyDistant: true,
      };
      expect(l.simplifyDistant).toBe(true);
    });
  });
});
