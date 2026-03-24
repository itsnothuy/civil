/**
 * PluginLoader.ts
 *
 * Manages plugin registration, lifecycle, sandboxed context creation,
 * permission checking, and error containment.
 *
 * Phase 6, Task 6.4
 */

import type {
  PluginManifest,
  PluginModule,
  PluginContext,
  PluginPermission,
  PluginRecord,
  PluginState,
} from "./PluginAPI";

// ── Types for viewer interaction ────────────────────────────

/** Minimal interface the PluginLoader needs from the host viewer */
export interface PluginHostViewer {
  /** Subscribe to viewer events */
  on(event: string, cb: (...args: unknown[]) => void): () => void;
  /** Set objects highlighted */
  setObjectsHighlighted?(ids: string[], state: boolean): void;
  /** Set objects visible */
  setObjectsVisible?(ids: string[], state: boolean): void;
  /** Fly camera to objects */
  flyTo?(objectIds: string[]): void;
  /** Get annotations */
  getAnnotations?(): ReadonlyArray<Record<string, unknown>>;
}

// ── PluginLoader class ──────────────────────────────────────

export class PluginLoader {
  private _plugins: Map<string, PluginRecord> = new Map();
  private _viewer: PluginHostViewer;
  private _sidebarContainer: HTMLElement | null;
  private _toolbarContainer: HTMLElement | null;
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(
    viewer: PluginHostViewer,
    options?: {
      sidebarContainer?: HTMLElement;
      toolbarContainer?: HTMLElement;
    },
  ) {
    this._viewer = viewer;
    this._sidebarContainer = options?.sidebarContainer ?? null;
    this._toolbarContainer = options?.toolbarContainer ?? null;
  }

  // ── Public API ────────────────────────────────────────

  /** All registered plugins */
  get plugins(): ReadonlyMap<string, PluginRecord> {
    return this._plugins;
  }

  /** Get a specific plugin record */
  getPlugin(id: string): PluginRecord | undefined {
    return this._plugins.get(id);
  }

  /**
   * Register a plugin from a manifest + module.
   * Does NOT activate — call `activatePlugin(id)` separately.
   */
  register(manifest: PluginManifest, module: PluginModule): boolean {
    if (!this._validateManifest(manifest)) {
      return false;
    }
    if (this._plugins.has(manifest.id)) {
      console.warn(`[PluginLoader] Plugin "${manifest.id}" already registered.`);
      return false;
    }
    this._plugins.set(manifest.id, {
      manifest,
      module,
      state: "registered",
    });
    this._emit("registered", manifest.id);
    return true;
  }

  /**
   * Initialise and activate a plugin. Creates a sandboxed context
   * and calls init() then activate() lifecycle hooks.
   */
  async activatePlugin(id: string): Promise<boolean> {
    const record = this._plugins.get(id);
    if (!record) {
      console.warn(`[PluginLoader] Plugin "${id}" not found.`);
      return false;
    }
    if (record.state === "active") {
      return true; // Already active
    }
    const ctx = this._createContext(record.manifest);
    try {
      this._setPluginState(id, "initializing");
      if (record.module.init) {
        await record.module.init(ctx);
      }
      if (record.module.activate) {
        await record.module.activate(ctx);
      }
      this._setPluginState(id, "active");
      this._emit("activated", id);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[PluginLoader] Plugin "${id}" activation failed: ${msg}`);
      record.error = msg;
      this._setPluginState(id, "error");
      return false;
    }
  }

  /** Deactivate a plugin (but keep it registered) */
  async deactivatePlugin(id: string): Promise<boolean> {
    const record = this._plugins.get(id);
    if (!record) return false;
    if (record.state !== "active") return false;
    const ctx = this._createContext(record.manifest);
    try {
      if (record.module.deactivate) {
        await record.module.deactivate(ctx);
      }
      this._setPluginState(id, "inactive");
      this._emit("deactivated", id);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[PluginLoader] Plugin "${id}" deactivation failed: ${msg}`);
      record.error = msg;
      this._setPluginState(id, "error");
      return false;
    }
  }

  /** Destroy and unregister a plugin completely */
  async unregister(id: string): Promise<boolean> {
    const record = this._plugins.get(id);
    if (!record) return false;
    const ctx = this._createContext(record.manifest);
    try {
      if (record.state === "active" && record.module.deactivate) {
        await record.module.deactivate(ctx);
      }
      if (record.module.destroy) {
        await record.module.destroy(ctx);
      }
    } catch {
      // Best-effort cleanup
    }
    this._setPluginState(id, "destroyed");
    this._plugins.delete(id);
    this._emit("unregistered", id);
    return true;
  }

  /** Listen to loader events */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  /** Tear down all plugins */
  async destroyAll(): Promise<void> {
    const ids = Array.from(this._plugins.keys());
    for (const id of ids) {
      await this.unregister(id);
    }
  }

  // ── Private: Sandboxed context factory ────────────────

  private _createContext(manifest: PluginManifest): PluginContext {
    const perms = new Set(manifest.permissions ?? []);
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

    const requirePerm = (perm: PluginPermission, action: string) => {
      if (!perms.has(perm)) {
        throw new Error(`Plugin "${manifest.id}" lacks permission "${perm}" for ${action}.`);
      }
    };

    return {
      manifest: Object.freeze({ ...manifest }),

      addPanel(title: string): HTMLElement {
        requirePerm("ui:panel", "addPanel");
        const panel = document.createElement("div");
        panel.className = "plugin-panel";
        panel.setAttribute("data-plugin-id", manifest.id);
        const heading = document.createElement("h3");
        heading.textContent = title;
        panel.appendChild(heading);
        const content = document.createElement("div");
        content.className = "plugin-panel-content";
        panel.appendChild(content);
        if (self._sidebarContainer) {
          self._sidebarContainer.appendChild(panel);
        }
        return content;
      },

      addToolbarButton(opts: {
        label: string;
        icon?: string;
        onClick: () => void;
      }): HTMLButtonElement {
        requirePerm("ui:toolbar", "addToolbarButton");
        const btn = document.createElement("button");
        btn.className = "plugin-toolbar-btn";
        btn.setAttribute("data-plugin-id", manifest.id);
        btn.textContent = opts.icon ? `${opts.icon} ${opts.label}` : opts.label;
        btn.title = opts.label;
        btn.addEventListener("click", () => {
          try {
            opts.onClick();
          } catch (e) {
            console.error(`[Plugin:${manifest.id}] Toolbar click error:`, e);
          }
        });
        if (self._toolbarContainer) {
          self._toolbarContainer.appendChild(btn);
        }
        return btn;
      },

      on(event: string, callback: (...args: unknown[]) => void): () => void {
        // Check permission based on event type
        if (event === "selection-changed" || event === "object-picked") {
          requirePerm("viewer:selection", `on("${event}")`);
        }
        if (event === "camera-moved") {
          requirePerm("viewer:camera", `on("${event}")`);
        }
        return self._viewer.on(event, callback);
      },

      setObjectsHighlighted(ids: string[], highlighted: boolean): void {
        requirePerm("viewer:objects", "setObjectsHighlighted");
        self._viewer.setObjectsHighlighted?.(ids, highlighted);
      },

      setObjectsVisible(ids: string[], visible: boolean): void {
        requirePerm("viewer:objects", "setObjectsVisible");
        self._viewer.setObjectsVisible?.(ids, visible);
      },

      flyTo(objectIds: string[]): void {
        requirePerm("viewer:camera", "flyTo");
        self._viewer.flyTo?.(objectIds);
      },

      getAnnotations(): ReadonlyArray<Record<string, unknown>> {
        requirePerm("annotations:read", "getAnnotations");
        return self._viewer.getAnnotations?.() ?? [];
      },

      log: {
        info(msg: string) {
          console.info(`[Plugin:${manifest.id}] ${msg}`);
        },
        warn(msg: string) {
          console.warn(`[Plugin:${manifest.id}] ${msg}`);
        },
        error(msg: string) {
          console.error(`[Plugin:${manifest.id}] ${msg}`);
        },
      },
    };
  }

  // ── Private: Validation ───────────────────────────────

  private _validateManifest(manifest: PluginManifest): boolean {
    if (!manifest.id || typeof manifest.id !== "string" || manifest.id.length > 128) {
      console.error("[PluginLoader] Invalid manifest: bad id.");
      return false;
    }
    if (!manifest.name || typeof manifest.name !== "string") {
      console.error("[PluginLoader] Invalid manifest: bad name.");
      return false;
    }
    if (!manifest.version || typeof manifest.version !== "string") {
      console.error("[PluginLoader] Invalid manifest: bad version.");
      return false;
    }
    if (!manifest.main || typeof manifest.main !== "string") {
      console.error("[PluginLoader] Invalid manifest: bad main entry.");
      return false;
    }
    return true;
  }

  // ── Private: State management ─────────────────────────

  private _setPluginState(id: string, newState: PluginState): void {
    const record = this._plugins.get(id);
    if (record) {
      record.state = newState;
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
}
