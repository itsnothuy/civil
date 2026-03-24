/**
 * PluginAPI.ts
 *
 * Defines the plugin interface, lifecycle hooks, manifest format,
 * and the sandboxed context provided to plugins.
 *
 * Plugins interact with the viewer exclusively through the
 * `PluginContext` interface — they never get direct access to
 * ViewerCore or any internal module.
 *
 * Phase 6, Task 6.4
 */

// ── Manifest ───────────────────────────────────────────────

/** JSON manifest that every plugin must provide */
export interface PluginManifest {
  /** Unique plugin identifier (reverse-domain recommended) */
  id: string;
  /** Human-readable name */
  name: string;
  /** SemVer version string */
  version: string;
  /** Short description shown in the plugin manager UI */
  description: string;
  /** Minimum viewer version required (SemVer range) */
  viewerVersion?: string;
  /** Author name or organisation */
  author?: string;
  /** Entry point — path relative to the manifest file */
  main: string;
  /** Permissions the plugin requests */
  permissions?: PluginPermission[];
}

/** Permissions a plugin can request */
export type PluginPermission =
  | "ui:panel" // Can add a sidebar panel
  | "ui:toolbar" // Can add toolbar buttons
  | "viewer:selection" // Can listen to selection events
  | "viewer:camera" // Can listen to / control camera
  | "viewer:objects" // Can show/hide/highlight objects
  | "annotations:read" // Can read annotations
  | "annotations:write" // Can create/update annotations
  | "network:fetch"; // Can make fetch requests

// ── Lifecycle ──────────────────────────────────────────────

/** Every plugin module must default-export an object matching this shape */
export interface PluginModule {
  /** Called once when the plugin is first loaded */
  init?(ctx: PluginContext): void | Promise<void>;
  /** Called when the user activates the plugin */
  activate?(ctx: PluginContext): void | Promise<void>;
  /** Called when the user deactivates the plugin */
  deactivate?(ctx: PluginContext): void | Promise<void>;
  /** Called when the plugin is about to be unloaded */
  destroy?(ctx: PluginContext): void | Promise<void>;
}

// ── Sandboxed context ──────────────────────────────────────

/**
 * The PluginContext is the ONLY interface a plugin receives.
 * It is a restricted proxy that does not expose internals.
 */
export interface PluginContext {
  /** The plugin's own manifest */
  readonly manifest: Readonly<PluginManifest>;

  // ── UI ────────────────────────────────────────────────

  /**
   * Add a panel to the sidebar. Returns a wrapper element the
   * plugin may render into. Requires permission "ui:panel".
   */
  addPanel(title: string): HTMLElement;

  /**
   * Add a button to the toolbar. Returns the button element.
   * Requires permission "ui:toolbar".
   */
  addToolbarButton(options: {
    label: string;
    icon?: string;
    onClick: () => void;
  }): HTMLButtonElement;

  // ── Viewer events ─────────────────────────────────────

  /**
   * Subscribe to a viewer event. Returns an unsubscribe function.
   * Available events depend on granted permissions:
   *   "selection-changed" → requires "viewer:selection"
   *   "camera-moved"      → requires "viewer:camera"
   *   "object-picked"     → requires "viewer:selection"
   */
  on(event: string, callback: (...args: unknown[]) => void): () => void;

  // ── Object manipulation ───────────────────────────────

  /**
   * Set highlight state for objects. Requires "viewer:objects".
   */
  setObjectsHighlighted(ids: string[], highlighted: boolean): void;

  /**
   * Set visibility for objects. Requires "viewer:objects".
   */
  setObjectsVisible(ids: string[], visible: boolean): void;

  // ── Camera ────────────────────────────────────────────

  /**
   * Fly the camera to look at specific objects. Requires "viewer:camera".
   */
  flyTo(objectIds: string[]): void;

  // ── Annotations ───────────────────────────────────────

  /**
   * Read all annotations. Requires "annotations:read".
   */
  getAnnotations(): ReadonlyArray<Record<string, unknown>>;

  // ── Logging ───────────────────────────────────────────

  /** Plugin-scoped logger (prefixed with plugin id) */
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}

// ── Plugin registration record ─────────────────────────────

export type PluginState =
  | "registered"
  | "initializing"
  | "active"
  | "inactive"
  | "error"
  | "destroyed";

export interface PluginRecord {
  manifest: PluginManifest;
  module: PluginModule;
  state: PluginState;
  error?: string;
}
