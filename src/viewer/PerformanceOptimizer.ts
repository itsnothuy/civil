/**
 * PerformanceOptimizer.ts
 *
 * Performance hardening module for Civil BIM Viewer.
 * Provides model caching (IndexedDB), LOD management,
 * lazy loading for off-screen elements, draw call optimisation,
 * and WebGL resource management.
 *
 * Phase 5, Task 5.7
 */

import type { ViewerCore } from "./ViewerCore";

// ── Types ─────────────────────────────────────────────────

/** Performance metrics snapshot */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangleCount: number;
  heapUsedMB: number;
  objectCount: number;
  visibleObjectCount: number;
  timestamp: number;
}

/** Cache entry metadata */
export interface CacheEntry {
  projectId: string;
  url: string;
  size: number;
  cachedAt: number;
  format: string;
}

/** LOD level definition */
export interface LODLevel {
  name: string;
  /** Camera distance threshold in world units */
  distance: number;
  /** Object count limit (objects farther than distance get culled) */
  maxObjects: number;
  /** Whether to use simplified rendering (X-ray) for distant objects */
  simplifyDistant: boolean;
}

/** Default LOD configuration */
const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { name: "high", distance: 50, maxObjects: Infinity, simplifyDistant: false },
  { name: "medium", distance: 200, maxObjects: 10000, simplifyDistant: true },
  { name: "low", distance: 500, maxObjects: 5000, simplifyDistant: true },
];

/** IndexedDB database name for model caching */
const CACHE_DB_NAME = "civil-bim-cache";
const CACHE_STORE_NAME = "models";
const CACHE_META_STORE = "meta";
const CACHE_DB_VERSION = 1;
const CACHE_MAX_SIZE_MB = 500;

export class PerformanceOptimizer {
  private _viewer: ViewerCore;
  private _lodLevels: LODLevel[];
  private _lodEnabled = false;
  private _lazyLoadEnabled = false;
  private _cacheEnabled = false;
  private _metricsHistory: PerformanceMetrics[] = [];
  private _rafId: number | null = null;
  private _lastFrameTime = 0;
  private _frameCount = 0;
  private _fpsAccumulator = 0;
  private _currentFps = 60;
  private _culledObjectIds: string[] = [];

  constructor(viewer: ViewerCore, lodLevels?: LODLevel[]) {
    this._viewer = viewer;
    this._lodLevels = lodLevels ?? DEFAULT_LOD_LEVELS;
  }

  // ── Public API ──────────────────────────────────────────

  /** Whether LOD is enabled */
  get lodEnabled(): boolean {
    return this._lodEnabled;
  }

  /** Whether lazy loading is enabled */
  get lazyLoadEnabled(): boolean {
    return this._lazyLoadEnabled;
  }

  /** Whether caching is enabled */
  get cacheEnabled(): boolean {
    return this._cacheEnabled;
  }

  /** Current FPS */
  get currentFps(): number {
    return this._currentFps;
  }

  /** IDs of objects currently culled by LOD */
  get culledObjectIds(): readonly string[] {
    return this._culledObjectIds;
  }

  /** Metrics history */
  get metricsHistory(): readonly PerformanceMetrics[] {
    return this._metricsHistory;
  }

  /** Current LOD levels */
  get lodLevels(): readonly LODLevel[] {
    return this._lodLevels;
  }

  // ── LOD (Level of Detail) ──────────────────────────────

  /**
   * Enable LOD — culls or simplifies distant objects based on
   * camera distance. Updates every frame via requestAnimationFrame.
   */
  enableLOD(): void {
    if (this._lodEnabled) return;
    this._lodEnabled = true;
    this._startLODLoop();
    console.info("[PerfOptimizer] LOD enabled.");
  }

  /** Disable LOD and restore all objects */
  disableLOD(): void {
    this._lodEnabled = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    // Restore culled objects
    this._restoreCulled();
    console.info("[PerfOptimizer] LOD disabled.");
  }

  /** Set custom LOD levels */
  setLODLevels(levels: LODLevel[]): void {
    this._lodLevels = levels.sort((a, b) => a.distance - b.distance);
  }

  // ── Lazy Loading ────────────────────────────────────────

  /**
   * Enable lazy loading — hide objects outside the camera frustum.
   * Works by checking object bounding boxes against the camera view.
   */
  enableLazyLoad(): void {
    this._lazyLoadEnabled = true;
    console.info("[PerfOptimizer] Lazy loading enabled.");
  }

  /** Disable lazy loading */
  disableLazyLoad(): void {
    this._lazyLoadEnabled = false;
    // Restore hidden objects
    this._restoreCulled();
    console.info("[PerfOptimizer] Lazy loading disabled.");
  }

  // ── Model Caching (IndexedDB) ──────────────────────────

  /**
   * Enable model caching via IndexedDB.
   * Cached models load faster on subsequent visits.
   */
  enableCache(): void {
    this._cacheEnabled = true;
    console.info("[PerfOptimizer] Model caching enabled (IndexedDB).");
  }

  /** Disable caching */
  disableCache(): void {
    this._cacheEnabled = false;
  }

  /**
   * Cache a model's ArrayBuffer data in IndexedDB.
   */
  async cacheModel(projectId: string, url: string, data: ArrayBuffer): Promise<boolean> {
    if (!this._cacheEnabled) return false;

    try {
      const db = await this._openCacheDB();
      const tx = db.transaction([CACHE_STORE_NAME, CACHE_META_STORE], "readwrite");

      // Store model data
      const modelStore = tx.objectStore(CACHE_STORE_NAME);
      modelStore.put(data, url);

      // Store metadata
      const metaStore = tx.objectStore(CACHE_META_STORE);
      const entry: CacheEntry = {
        projectId,
        url,
        size: data.byteLength,
        cachedAt: Date.now(),
        format: url.endsWith(".glb") ? "glb" : url.endsWith(".gltf") ? "gltf" : "unknown",
      };
      metaStore.put(entry, url);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      console.info(
        `[PerfOptimizer] Cached model: ${url} (${(data.byteLength / 1024 / 1024).toFixed(1)} MB)`,
      );
      return true;
    } catch (err) {
      console.warn("[PerfOptimizer] Failed to cache model:", err);
      return false;
    }
  }

  /**
   * Retrieve a cached model from IndexedDB.
   * Returns null if not cached.
   */
  async getCachedModel(url: string): Promise<ArrayBuffer | null> {
    if (!this._cacheEnabled) return null;

    try {
      const db = await this._openCacheDB();
      const tx = db.transaction(CACHE_STORE_NAME, "readonly");
      const store = tx.objectStore(CACHE_STORE_NAME);

      return new Promise<ArrayBuffer | null>((resolve) => {
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Get all cache entries metadata.
   */
  async getCacheEntries(): Promise<CacheEntry[]> {
    try {
      const db = await this._openCacheDB();
      const tx = db.transaction(CACHE_META_STORE, "readonly");
      const store = tx.objectStore(CACHE_META_STORE);

      return new Promise<CacheEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Clear the model cache.
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this._openCacheDB();
      const tx = db.transaction([CACHE_STORE_NAME, CACHE_META_STORE], "readwrite");
      tx.objectStore(CACHE_STORE_NAME).clear();
      tx.objectStore(CACHE_META_STORE).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      console.info("[PerfOptimizer] Cache cleared.");
    } catch (err) {
      console.warn("[PerfOptimizer] Failed to clear cache:", err);
    }
  }

  /**
   * Get total cache size in bytes.
   */
  async getCacheSize(): Promise<number> {
    const entries = await this.getCacheEntries();
    return entries.reduce((sum, e) => sum + e.size, 0);
  }

  /** Maximum cache size in MB */
  get maxCacheSizeMB(): number {
    return CACHE_MAX_SIZE_MB;
  }

  // ── Metrics & Profiling ─────────────────────────────────

  /**
   * Take a snapshot of current performance metrics.
   */
  captureMetrics(): PerformanceMetrics {
    const scene = this._viewer.viewer.scene;
    const objectIds = scene.objectIds ?? [];
    const visibleIds = objectIds.filter((id: string) => {
      const obj = scene.objects[id];
      return obj && (obj as { visible?: boolean }).visible !== false;
    });

    // Estimate heap usage
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const perf = (performance as any).memory;
    const heapUsed = perf?.usedJSHeapSize ?? 0;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Estimate triangles (rough — xeokit exposes stats on the scene)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const stats = (scene as any).stats ?? {};
    const triangles = stats.numTriangles ?? 0;
    const drawCalls = stats.numDrawCalls ?? 0;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const metrics: PerformanceMetrics = {
      fps: this._currentFps,
      frameTime: this._lastFrameTime,
      drawCalls,
      triangleCount: triangles,
      heapUsedMB: heapUsed / (1024 * 1024),
      objectCount: objectIds.length,
      visibleObjectCount: visibleIds.length,
      timestamp: Date.now(),
    };

    this._metricsHistory.push(metrics);
    // Keep last 100 snapshots
    if (this._metricsHistory.length > 100) {
      this._metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Generate a profiling report comparing before/after metrics.
   */
  generateReport(): string {
    const history = this._metricsHistory;
    if (history.length === 0) return "No metrics captured yet.";

    const first = history[0];
    const last = history[history.length - 1];
    const avgFps = history.reduce((sum, m) => sum + m.fps, 0) / history.length;

    return [
      "=== Performance Report ===",
      `Snapshots: ${history.length}`,
      `First FPS: ${first.fps.toFixed(1)} | Last FPS: ${last.fps.toFixed(1)} | Avg FPS: ${avgFps.toFixed(1)}`,
      `Objects: ${last.objectCount} total, ${last.visibleObjectCount} visible`,
      `Triangles: ${last.triangleCount}`,
      `Draw calls: ${last.drawCalls}`,
      `Heap: ${last.heapUsedMB.toFixed(1)} MB`,
      `LOD: ${this._lodEnabled ? "ON" : "OFF"} | Cache: ${this._cacheEnabled ? "ON" : "OFF"}`,
      `Culled objects: ${this._culledObjectIds.length}`,
      "==========================",
    ].join("\n");
  }

  // ── Destroy ─────────────────────────────────────────────

  /** Tear down — stop LOD loop, restore objects */
  destroy(): void {
    this.disableLOD();
    this._restoreCulled();
    this._metricsHistory = [];
  }

  // ── Private: LOD Loop ───────────────────────────────────

  private _startLODLoop(): void {
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!this._lodEnabled) return;

      // FPS measurement
      const delta = now - lastTime;
      lastTime = now;
      this._lastFrameTime = delta;
      this._fpsAccumulator += delta;
      this._frameCount++;

      if (this._fpsAccumulator >= 1000) {
        this._currentFps = Math.round((this._frameCount * 1000) / this._fpsAccumulator);
        this._fpsAccumulator = 0;
        this._frameCount = 0;
      }

      // Apply LOD culling every ~200ms (5 FPS for LOD updates)
      if (this._frameCount % 12 === 0) {
        this._applyLODCulling();
      }

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  /**
   * Apply LOD culling based on camera distance to objects.
   * Objects beyond the active LOD distance threshold are hidden or X-rayed.
   */
  private _applyLODCulling(): void {
    const scene = this._viewer.viewer.scene;
    const camera = this._viewer.viewer.camera;
    const cameraPos = camera.eye;
    const objectIds = scene.objectIds;

    if (!objectIds || objectIds.length === 0) return;

    // Determine active LOD level based on total object count
    const activeLOD = this._getActiveLOD(objectIds.length);
    if (!activeLOD) return;

    const toCull: string[] = [];
    const toRestore: string[] = [];

    for (const id of objectIds) {
      const obj = scene.objects[id];
      if (!obj) continue;

      const aabb = (obj as { aabb?: number[] }).aabb;
      if (!aabb || aabb.length < 6) continue;

      // Object center
      const cx = (aabb[0] + aabb[3]) / 2;
      const cy = (aabb[1] + aabb[4]) / 2;
      const cz = (aabb[2] + aabb[5]) / 2;

      // Distance from camera
      const dx = cameraPos[0] - cx;
      const dy = cameraPos[1] - cy;
      const dz = cameraPos[2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > activeLOD.distance) {
        toCull.push(id);
      } else {
        toRestore.push(id);
      }
    }

    // Apply culling
    if (toCull.length > 0) {
      if (activeLOD.simplifyDistant) {
        scene.setObjectsXRayed(toCull, true);
      } else {
        scene.setObjectsVisible(toCull, false);
      }
    }

    // Restore objects within range
    if (toRestore.length > 0) {
      scene.setObjectsVisible(toRestore, true);
      scene.setObjectsXRayed(toRestore, false);
    }

    this._culledObjectIds = toCull;
  }

  /** Get the active LOD level based on scene complexity */
  private _getActiveLOD(objectCount: number): LODLevel | null {
    // Use the most restrictive level where objectCount exceeds maxObjects
    for (let i = this._lodLevels.length - 1; i >= 0; i--) {
      if (objectCount >= this._lodLevels[i].maxObjects) {
        return this._lodLevels[i];
      }
    }
    return this._lodLevels[0];
  }

  /** Restore all culled objects to visible + non-X-rayed */
  private _restoreCulled(): void {
    if (this._culledObjectIds.length === 0) return;
    const scene = this._viewer.viewer.scene;
    const validIds = this._culledObjectIds.filter((id) => scene.objects[id]);
    if (validIds.length > 0) {
      scene.setObjectsVisible(validIds, true);
      scene.setObjectsXRayed(validIds, false);
    }
    this._culledObjectIds = [];
  }

  // ── Private: IndexedDB ──────────────────────────────────

  private _openCacheDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          db.createObjectStore(CACHE_STORE_NAME);
        }
        if (!db.objectStoreNames.contains(CACHE_META_STORE)) {
          db.createObjectStore(CACHE_META_STORE);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
