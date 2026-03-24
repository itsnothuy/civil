/**
 * ServiceWorkerManager.ts
 *
 * Manages Service Worker registration, app shell caching strategy,
 * background sync coordination, and cache versioning.
 *
 * This module runs in the MAIN thread and communicates with the
 * actual Service Worker via postMessage. The SW file itself would
 * be generated at build time (e.g. via vite-plugin-pwa or Workbox).
 *
 * Phase 6, Task 6.5
 */

// ── Types ──────────────────────────────────────────────────

export interface SWManagerOptions {
  /** Path to the service worker script (default: "/sw.js") */
  swPath?: string;
  /** Cache version identifier (default: "v1") */
  cacheVersion?: string;
  /** Enable/disable SW registration (for dev mode) */
  enabled?: boolean;
}

export type SWState =
  | "unsupported"
  | "registering"
  | "installed"
  | "activated"
  | "error"
  | "unregistered";

export interface CacheStats {
  /** Number of cached URLs */
  cachedUrls: number;
  /** Cache version */
  version: string;
  /** Whether the SW is controlling the page */
  isControlling: boolean;
}

// ── Class ──────────────────────────────────────────────────

export class ServiceWorkerManager {
  private _swPath: string;
  private _cacheVersion: string;
  private _enabled: boolean;
  private _state: SWState = "unsupported";
  private _registration: ServiceWorkerRegistration | null = null;
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(options?: SWManagerOptions) {
    this._swPath = options?.swPath ?? "/sw.js";
    this._cacheVersion = options?.cacheVersion ?? "v1";
    this._enabled = options?.enabled ?? true;

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      this._state = "unregistered";
    }
  }

  // ── Public API ────────────────────────────────────────

  get state(): SWState {
    return this._state;
  }

  get isSupported(): boolean {
    return this._state !== "unsupported";
  }

  get isActive(): boolean {
    return this._state === "activated";
  }

  get cacheVersion(): string {
    return this._cacheVersion;
  }

  get registration(): ServiceWorkerRegistration | null {
    return this._registration;
  }

  /**
   * Register the Service Worker and set up lifecycle handlers.
   * Returns true if registration succeeds.
   */
  async register(): Promise<boolean> {
    if (!this._enabled || this._state === "unsupported") {
      return false;
    }

    try {
      this._setState("registering");
      const reg = await navigator.serviceWorker.register(this._swPath, {
        scope: "/",
      });
      this._registration = reg;

      // Listen for lifecycle events
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              this._setState("installed");
              this._emit("installed");
              if (navigator.serviceWorker.controller) {
                // New version available
                this._emit("update-available");
              }
            }
            if (newWorker.state === "activated") {
              this._setState("activated");
              this._emit("activated");
            }
          });
        }
      });

      // Check if already active
      if (reg.active) {
        this._setState("activated");
        this._emit("activated");
      } else if (reg.installing || reg.waiting) {
        this._setState("installed");
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SW] Registration failed: ${msg}`);
      this._setState("error");
      this._emit("error", msg);
      return false;
    }
  }

  /**
   * Unregister the Service Worker.
   */
  async unregister(): Promise<boolean> {
    if (!this._registration) return false;
    try {
      const result = await this._registration.unregister();
      if (result) {
        this._registration = null;
        this._setState("unregistered");
        this._emit("unregistered");
      }
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Force the waiting worker to become active.
   * Use after user confirms an update prompt.
   */
  skipWaiting(): void {
    if (this._registration?.waiting) {
      this._registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }

  /**
   * Request a background sync by tag name.
   * The SW will fire a "sync" event with this tag when connectivity returns.
   */
  async requestBackgroundSync(tag: string): Promise<boolean> {
    if (!this._registration) return false;
    try {
      // Background Sync API
      if ("sync" in this._registration) {
        await (
          this._registration as ServiceWorkerRegistration & {
            sync: { register(tag: string): Promise<void> };
          }
        ).sync.register(tag);
        this._emit("sync-requested", tag);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics.
   */
  async getCacheStats(): Promise<CacheStats> {
    const cachedUrls = await this._countCachedUrls();
    return {
      cachedUrls,
      version: this._cacheVersion,
      isControlling: !!navigator.serviceWorker?.controller,
    };
  }

  /**
   * Send a message to the active Service Worker.
   */
  postMessage(message: Record<string, unknown>): boolean {
    const sw = this._registration?.active ?? navigator.serviceWorker?.controller;
    if (!sw) return false;
    sw.postMessage(message);
    return true;
  }

  // ── Event emitter ─────────────────────────────────────

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  // ── Private ───────────────────────────────────────────

  private _setState(state: SWState): void {
    const prev = this._state;
    this._state = state;
    if (prev !== state) {
      this._emit("state-change", state, prev);
    }
  }

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const fn of listeners) {
        fn(...args);
      }
    }
  }

  private async _countCachedUrls(): Promise<number> {
    if (typeof caches === "undefined") return 0;
    try {
      const keys = await caches.keys();
      let count = 0;
      for (const key of keys) {
        const cache = await caches.open(key);
        const entries = await cache.keys();
        count += entries.length;
      }
      return count;
    } catch {
      return 0;
    }
  }
}
