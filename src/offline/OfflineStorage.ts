/**
 * OfflineStorage.ts
 *
 * IndexedDB wrapper for offline data persistence.
 * Stores annotations, model metadata, and cached resources
 * for use when the network is unavailable.
 *
 * Features:
 * - Typed IndexedDB operations (CRUD)
 * - Storage budget tracking and cleanup
 * - Background sync queue for pending changes
 *
 * Phase 6, Task 6.5
 */

// ── Types ──────────────────────────────────────────────────

export interface StorageBudget {
  /** Estimated total quota in bytes */
  quota: number;
  /** Currently used storage in bytes */
  usage: number;
  /** Percentage of quota used (0–100) */
  percentUsed: number;
}

export interface PendingSyncItem {
  id: string;
  type: "annotation-create" | "annotation-update" | "annotation-delete";
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}

export interface OfflineStorageOptions {
  /** Database name (default: "civil-bim-offline") */
  dbName?: string;
  /** Database version (default: 1) */
  dbVersion?: number;
  /** Maximum storage budget in bytes (default: 100MB) */
  maxBudget?: number;
}

// ── Constants ──────────────────────────────────────────────

const DEFAULT_DB_NAME = "civil-bim-offline";
const DEFAULT_DB_VERSION = 1;
const DEFAULT_MAX_BUDGET = 100 * 1024 * 1024; // 100 MB

const STORE_ANNOTATIONS = "annotations";
const STORE_SYNC_QUEUE = "sync-queue";
const STORE_CACHE_META = "cache-meta";

// ── Class ──────────────────────────────────────────────────

export class OfflineStorage {
  private _dbName: string;
  private _dbVersion: number;
  private _maxBudget: number;
  private _db: IDBDatabase | null = null;
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(options?: OfflineStorageOptions) {
    this._dbName = options?.dbName ?? DEFAULT_DB_NAME;
    this._dbVersion = options?.dbVersion ?? DEFAULT_DB_VERSION;
    this._maxBudget = options?.maxBudget ?? DEFAULT_MAX_BUDGET;
  }

  // ── Public API ────────────────────────────────────────

  get isOpen(): boolean {
    return this._db !== null;
  }

  /** Open the IndexedDB database (creates stores if needed) */
  async open(): Promise<boolean> {
    if (this._db) return true;
    return new Promise<boolean>((resolve) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_ANNOTATIONS)) {
          const store = db.createObjectStore(STORE_ANNOTATIONS, {
            keyPath: "id",
          });
          store.createIndex("projectId", "projectId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_CACHE_META)) {
          db.createObjectStore(STORE_CACHE_META, { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        this._db = (event.target as IDBOpenDBRequest).result;
        this._emit("opened");
        resolve(true);
      };

      request.onerror = () => {
        console.error("[OfflineStorage] Failed to open IndexedDB.");
        this._emit("error", "Failed to open IndexedDB");
        resolve(false);
      };
    });
  }

  /** Close the database */
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._emit("closed");
    }
  }

  // ── Annotations ───────────────────────────────────────

  /**
   * Save an annotation to IndexedDB (upsert).
   */
  async saveAnnotation(annotation: Record<string, unknown>): Promise<boolean> {
    return this._put(STORE_ANNOTATIONS, annotation);
  }

  /**
   * Get an annotation by ID.
   */
  async getAnnotation(id: string): Promise<Record<string, unknown> | null> {
    return this._get(STORE_ANNOTATIONS, id);
  }

  /**
   * Get all annotations for a project.
   */
  async getAnnotationsByProject(projectId: string): Promise<Record<string, unknown>[]> {
    if (!this._db) return [];
    return new Promise((resolve) => {
      const tx = this._db!.transaction(STORE_ANNOTATIONS, "readonly");
      const store = tx.objectStore(STORE_ANNOTATIONS);
      const index = store.index("projectId");
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Delete an annotation by ID.
   */
  async deleteAnnotation(id: string): Promise<boolean> {
    return this._delete(STORE_ANNOTATIONS, id);
  }

  /**
   * Delete all annotations for a project.
   */
  async clearProjectAnnotations(projectId: string): Promise<number> {
    const annotations = await this.getAnnotationsByProject(projectId);
    let count = 0;
    for (const ann of annotations) {
      if (await this._delete(STORE_ANNOTATIONS, ann.id as string)) {
        count++;
      }
    }
    return count;
  }

  // ── Sync queue ────────────────────────────────────────

  /**
   * Add a change to the background sync queue.
   */
  async queueSync(item: PendingSyncItem): Promise<boolean> {
    return this._put(STORE_SYNC_QUEUE, item as unknown as Record<string, unknown>);
  }

  /**
   * Get all pending sync items.
   */
  async getPendingSyncs(): Promise<PendingSyncItem[]> {
    return this._getAll(STORE_SYNC_QUEUE) as unknown as Promise<PendingSyncItem[]>;
  }

  /**
   * Remove a sync item after successful sync.
   */
  async removeSyncItem(id: string): Promise<boolean> {
    return this._delete(STORE_SYNC_QUEUE, id);
  }

  /**
   * Clear the entire sync queue.
   */
  async clearSyncQueue(): Promise<boolean> {
    return this._clear(STORE_SYNC_QUEUE);
  }

  // ── Storage budget ────────────────────────────────────

  /**
   * Get the current storage budget information.
   * Uses the StorageManager API when available, falls back to estimation.
   */
  async getStorageBudget(): Promise<StorageBudget> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota ?? this._maxBudget;
      const usage = estimate.usage ?? 0;
      return {
        quota,
        usage,
        percentUsed: quota > 0 ? Math.round((usage / quota) * 100) : 0,
      };
    }
    // Fallback: report max budget with unknown usage
    return {
      quota: this._maxBudget,
      usage: 0,
      percentUsed: 0,
    };
  }

  /**
   * Check if storage is within budget. Returns true if OK.
   */
  async isWithinBudget(): Promise<boolean> {
    const budget = await this.getStorageBudget();
    return budget.usage < this._maxBudget;
  }

  /**
   * Clean up old data when storage budget is exceeded.
   * Removes oldest sync queue items first, then oldest annotations.
   * Returns the number of items removed.
   */
  async cleanupIfOverBudget(): Promise<number> {
    const withinBudget = await this.isWithinBudget();
    if (withinBudget) return 0;

    let removed = 0;

    // 1. Clear completed sync items
    const syncs = await this.getPendingSyncs();
    for (const item of syncs) {
      if (item.retryCount > 3) {
        await this.removeSyncItem(item.id);
        removed++;
      }
    }

    // 2. If still over budget, clear cache metadata
    if (!(await this.isWithinBudget())) {
      await this._clear(STORE_CACHE_META);
      removed++;
    }

    this._emit("cleanup", removed);
    return removed;
  }

  // ── Event emitter ─────────────────────────────────────

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  // ── Private: Generic IDB operations ───────────────────

  private async _put(storeName: string, value: Record<string, unknown>): Promise<boolean> {
    if (!this._db) return false;
    return new Promise((resolve) => {
      const tx = this._db!.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  private async _get(storeName: string, key: string): Promise<Record<string, unknown> | null> {
    if (!this._db) return null;
    return new Promise((resolve) => {
      const tx = this._db!.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  private async _getAll(storeName: string): Promise<Record<string, unknown>[]> {
    if (!this._db) return [];
    return new Promise((resolve) => {
      const tx = this._db!.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => resolve([]);
    });
  }

  private async _delete(storeName: string, key: string): Promise<boolean> {
    if (!this._db) return false;
    return new Promise((resolve) => {
      const tx = this._db!.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  private async _clear(storeName: string): Promise<boolean> {
    if (!this._db) return false;
    return new Promise((resolve) => {
      const tx = this._db!.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  // ── Private: Events ───────────────────────────────────

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const fn of listeners) {
        fn(...args);
      }
    }
  }
}
