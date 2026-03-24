/**
 * PluginSystem.test.ts — Unit tests for Plugin API + PluginLoader
 * Phase 6, Task 6.4
 */

import { PluginLoader, type PluginHostViewer } from "../../src/plugins/PluginLoader";
import type {
  PluginManifest,
  PluginModule,
  PluginContext,
  PluginPermission,
} from "../../src/plugins/PluginAPI";

// ── Mock viewer ────────────────────────────────────────────

function createMockViewer(): PluginHostViewer & {
  _cbs: Map<string, Set<(...args: unknown[]) => void>>;
} {
  const cbs = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    _cbs: cbs,
    on(event: string, cb: (...args: unknown[]) => void): () => void {
      if (!cbs.has(event)) cbs.set(event, new Set());
      cbs.get(event)!.add(cb);
      return () => cbs.get(event)?.delete(cb);
    },
    setObjectsHighlighted: jest.fn(),
    setObjectsVisible: jest.fn(),
    flyTo: jest.fn(),
    getAnnotations: jest.fn(() => [{ id: "a1", comment: "Test" }]),
  };
}

// ── Helpers ────────────────────────────────────────────────

function validManifest(overrides?: Partial<PluginManifest>): PluginManifest {
  return {
    id: "com.test.sample",
    name: "Test Plugin",
    version: "1.0.0",
    description: "A test plugin",
    main: "index.ts",
    permissions: [
      "ui:panel",
      "ui:toolbar",
      "viewer:selection",
      "viewer:objects",
      "viewer:camera",
      "annotations:read",
    ],
    ...overrides,
  };
}

function noopModule(overrides?: Partial<PluginModule>): PluginModule {
  return {
    init: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("PluginLoader", () => {
  let viewer: ReturnType<typeof createMockViewer>;
  let sidebar: HTMLElement;
  let toolbar: HTMLElement;
  let loader: PluginLoader;

  beforeEach(() => {
    viewer = createMockViewer();
    sidebar = document.createElement("div");
    sidebar.id = "plugin-sidebar";
    toolbar = document.createElement("div");
    toolbar.id = "plugin-toolbar";
    document.body.appendChild(sidebar);
    document.body.appendChild(toolbar);
    loader = new PluginLoader(viewer, {
      sidebarContainer: sidebar,
      toolbarContainer: toolbar,
    });
  });

  afterEach(async () => {
    await loader.destroyAll();
    document.body.innerHTML = "";
  });

  // ── Registration ──────────────────────────────────────

  describe("register", () => {
    it("registers a valid plugin", () => {
      const result = loader.register(validManifest(), noopModule());
      expect(result).toBe(true);
      expect(loader.getPlugin("com.test.sample")).toBeDefined();
      expect(loader.getPlugin("com.test.sample")!.state).toBe("registered");
    });

    it("rejects duplicate registration", () => {
      loader.register(validManifest(), noopModule());
      const result = loader.register(validManifest(), noopModule());
      expect(result).toBe(false);
    });

    it("rejects manifest with missing id", () => {
      const result = loader.register(validManifest({ id: "" }), noopModule());
      expect(result).toBe(false);
    });

    it("rejects manifest with missing name", () => {
      const result = loader.register(validManifest({ name: "" }), noopModule());
      expect(result).toBe(false);
    });

    it("rejects manifest with missing version", () => {
      const result = loader.register(validManifest({ version: "" }), noopModule());
      expect(result).toBe(false);
    });

    it("rejects manifest with missing main", () => {
      const result = loader.register(validManifest({ main: "" }), noopModule());
      expect(result).toBe(false);
    });

    it("rejects manifest with overly long id", () => {
      const result = loader.register(validManifest({ id: "x".repeat(200) }), noopModule());
      expect(result).toBe(false);
    });

    it("emits registered event", () => {
      const cb = jest.fn();
      loader.on("registered", cb);
      loader.register(validManifest(), noopModule());
      expect(cb).toHaveBeenCalledWith("com.test.sample");
    });
  });

  // ── Activation ────────────────────────────────────────

  describe("activatePlugin", () => {
    it("calls init then activate", async () => {
      const mod = noopModule();
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      expect(mod.init).toHaveBeenCalled();
      expect(mod.activate).toHaveBeenCalled();
    });

    it("sets state to active", async () => {
      loader.register(validManifest(), noopModule());
      await loader.activatePlugin("com.test.sample");
      expect(loader.getPlugin("com.test.sample")!.state).toBe("active");
    });

    it("returns false for unknown plugin", async () => {
      const result = await loader.activatePlugin("nonexistent");
      expect(result).toBe(false);
    });

    it("returns true if already active", async () => {
      loader.register(validManifest(), noopModule());
      await loader.activatePlugin("com.test.sample");
      const result = await loader.activatePlugin("com.test.sample");
      expect(result).toBe(true);
    });

    it("emits activated event", async () => {
      const cb = jest.fn();
      loader.on("activated", cb);
      loader.register(validManifest(), noopModule());
      await loader.activatePlugin("com.test.sample");
      expect(cb).toHaveBeenCalledWith("com.test.sample");
    });

    it("catches errors in plugin init and sets error state", async () => {
      const bad = noopModule({
        init: jest.fn(() => {
          throw new Error("boom");
        }),
      });
      loader.register(validManifest(), bad);
      const result = await loader.activatePlugin("com.test.sample");
      expect(result).toBe(false);
      expect(loader.getPlugin("com.test.sample")!.state).toBe("error");
      expect(loader.getPlugin("com.test.sample")!.error).toBe("boom");
    });
  });

  // ── Deactivation ──────────────────────────────────────

  describe("deactivatePlugin", () => {
    it("calls deactivate hook", async () => {
      const mod = noopModule();
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      await loader.deactivatePlugin("com.test.sample");
      expect(mod.deactivate).toHaveBeenCalled();
      expect(loader.getPlugin("com.test.sample")!.state).toBe("inactive");
    });

    it("returns false if not active", async () => {
      loader.register(validManifest(), noopModule());
      const result = await loader.deactivatePlugin("com.test.sample");
      expect(result).toBe(false);
    });

    it("emits deactivated event", async () => {
      const cb = jest.fn();
      loader.on("deactivated", cb);
      loader.register(validManifest(), noopModule());
      await loader.activatePlugin("com.test.sample");
      await loader.deactivatePlugin("com.test.sample");
      expect(cb).toHaveBeenCalledWith("com.test.sample");
    });
  });

  // ── Unregister ────────────────────────────────────────

  describe("unregister", () => {
    it("removes plugin from registry", async () => {
      loader.register(validManifest(), noopModule());
      await loader.unregister("com.test.sample");
      expect(loader.getPlugin("com.test.sample")).toBeUndefined();
    });

    it("calls destroy hook", async () => {
      const mod = noopModule();
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      await loader.unregister("com.test.sample");
      expect(mod.destroy).toHaveBeenCalled();
    });

    it("emits unregistered event", async () => {
      const cb = jest.fn();
      loader.on("unregistered", cb);
      loader.register(validManifest(), noopModule());
      await loader.unregister("com.test.sample");
      expect(cb).toHaveBeenCalledWith("com.test.sample");
    });

    it("returns false for unknown plugin", async () => {
      expect(await loader.unregister("nope")).toBe(false);
    });
  });

  // ── destroyAll ────────────────────────────────────────

  describe("destroyAll", () => {
    it("removes all plugins", async () => {
      loader.register(validManifest({ id: "p1" }), noopModule());
      loader.register(validManifest({ id: "p2" }), noopModule());
      await loader.destroyAll();
      expect(loader.plugins.size).toBe(0);
    });
  });

  // ── Sandboxed context ─────────────────────────────────

  describe("PluginContext (sandbox)", () => {
    it("provides frozen manifest", async () => {
      let capturedCtx: PluginContext | null = null;
      const mod = noopModule({
        activate(ctx: PluginContext) {
          capturedCtx = ctx;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      expect(capturedCtx).not.toBeNull();
      expect(Object.isFrozen(capturedCtx!.manifest)).toBe(true);
    });

    it("addPanel creates a panel in the sidebar", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const content = ctx!.addPanel("My Panel");
      expect(content).toBeInstanceOf(HTMLElement);
      expect(sidebar.querySelector(".plugin-panel")).not.toBeNull();
      expect(sidebar.querySelector(".plugin-panel h3")!.textContent).toBe("My Panel");
    });

    it("addToolbarButton creates a button in the toolbar", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const onClick = jest.fn();
      const btn = ctx!.addToolbarButton({
        label: "Test",
        icon: "🔧",
        onClick,
      });
      expect(btn).toBeInstanceOf(HTMLButtonElement);
      expect(toolbar.querySelector(".plugin-toolbar-btn")).not.toBeNull();
      btn.click();
      expect(onClick).toHaveBeenCalled();
    });

    it("on subscribes to viewer events", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const cb = jest.fn();
      const unsub = ctx!.on("selection-changed", cb);
      // Simulate event
      const listeners = viewer._cbs.get("selection-changed");
      expect(listeners).toBeDefined();
      expect(listeners!.size).toBe(1);
      unsub();
      expect(listeners!.size).toBe(0);
    });

    it("setObjectsHighlighted delegates to viewer", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      ctx!.setObjectsHighlighted(["obj-1"], true);
      expect(viewer.setObjectsHighlighted).toHaveBeenCalledWith(["obj-1"], true);
    });

    it("setObjectsVisible delegates to viewer", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      ctx!.setObjectsVisible(["obj-1"], false);
      expect(viewer.setObjectsVisible).toHaveBeenCalledWith(["obj-1"], false);
    });

    it("flyTo delegates to viewer", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      ctx!.flyTo(["obj-1"]);
      expect(viewer.flyTo).toHaveBeenCalledWith(["obj-1"]);
    });

    it("getAnnotations returns annotations from viewer", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const anns = ctx!.getAnnotations();
      expect(anns).toEqual([{ id: "a1", comment: "Test" }]);
    });

    it("log methods are scoped to plugin id", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const infoSpy = jest.spyOn(console, "info").mockImplementation();
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      ctx!.log.info("hello");
      ctx!.log.warn("caution");
      ctx!.log.error("fail");
      expect(infoSpy).toHaveBeenCalledWith("[Plugin:com.test.sample] hello");
      expect(warnSpy).toHaveBeenCalledWith("[Plugin:com.test.sample] caution");
      expect(errorSpy).toHaveBeenCalledWith("[Plugin:com.test.sample] fail");
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ── Permission enforcement ────────────────────────────

  describe("permission enforcement", () => {
    async function activateWithPerms(perms: PluginPermission[]): Promise<PluginContext> {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      const id = `perm-test-${Date.now()}-${Math.random()}`;
      loader.register(validManifest({ id, permissions: perms }), mod);
      await loader.activatePlugin(id);
      return ctx!;
    }

    it("blocks addPanel without ui:panel", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.addPanel("X")).toThrow(/lacks permission.*ui:panel/);
    });

    it("blocks addToolbarButton without ui:toolbar", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.addToolbarButton({ label: "X", onClick: () => {} })).toThrow(
        /lacks permission.*ui:toolbar/,
      );
    });

    it("blocks on('selection-changed') without viewer:selection", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.on("selection-changed", () => {})).toThrow(
        /lacks permission.*viewer:selection/,
      );
    });

    it("blocks on('camera-moved') without viewer:camera", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.on("camera-moved", () => {})).toThrow(/lacks permission.*viewer:camera/);
    });

    it("blocks setObjectsHighlighted without viewer:objects", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.setObjectsHighlighted(["a"], true)).toThrow(
        /lacks permission.*viewer:objects/,
      );
    });

    it("blocks setObjectsVisible without viewer:objects", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.setObjectsVisible(["a"], true)).toThrow(/lacks permission.*viewer:objects/);
    });

    it("blocks flyTo without viewer:camera", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.flyTo(["a"])).toThrow(/lacks permission.*viewer:camera/);
    });

    it("blocks getAnnotations without annotations:read", async () => {
      const ctx = await activateWithPerms([]);
      expect(() => ctx.getAnnotations()).toThrow(/lacks permission.*annotations:read/);
    });

    it("allows operations with correct permissions", async () => {
      const ctx = await activateWithPerms([
        "ui:panel",
        "ui:toolbar",
        "viewer:selection",
        "viewer:camera",
        "viewer:objects",
        "annotations:read",
      ]);
      expect(() => ctx.addPanel("OK")).not.toThrow();
      expect(() => ctx.addToolbarButton({ label: "OK", onClick: () => {} })).not.toThrow();
      expect(() => ctx.on("selection-changed", () => {})).not.toThrow();
      expect(() => ctx.setObjectsHighlighted(["a"], true)).not.toThrow();
      expect(() => ctx.flyTo(["a"])).not.toThrow();
      expect(() => ctx.getAnnotations()).not.toThrow();
    });
  });

  // ── Error containment ─────────────────────────────────

  describe("error containment", () => {
    it("bad plugin init does not crash loader", async () => {
      const bad = noopModule({
        init() {
          throw new Error("crash");
        },
      });
      loader.register(validManifest({ id: "bad-plugin" }), bad);
      const result = await loader.activatePlugin("bad-plugin");
      expect(result).toBe(false);
      expect(loader.getPlugin("bad-plugin")!.state).toBe("error");
      // Loader is still functional
      loader.register(validManifest({ id: "good-plugin" }), noopModule());
      const r2 = await loader.activatePlugin("good-plugin");
      expect(r2).toBe(true);
    });

    it("bad toolbar click handler is caught", async () => {
      let ctx: PluginContext | null = null;
      const mod = noopModule({
        activate(c: PluginContext) {
          ctx = c;
        },
      });
      loader.register(validManifest(), mod);
      await loader.activatePlugin("com.test.sample");
      const errSpy = jest.spyOn(console, "error").mockImplementation();
      const btn = ctx!.addToolbarButton({
        label: "Crash",
        onClick() {
          throw new Error("badclick");
        },
      });
      expect(() => btn.click()).not.toThrow();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  // ── Sample IoT plugin integration ─────────────────────

  describe("sample IoT plugin", () => {
    it("can be registered and activated", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const manifest: PluginManifest = {
        id: "com.example.iot-sensor-overlay",
        name: "IoT Sensor Overlay",
        version: "1.0.0",
        description: "Displays real-time IoT sensor data.",
        main: "index.ts",
        permissions: [
          "ui:panel",
          "ui:toolbar",
          "viewer:selection",
          "viewer:objects",
          "viewer:camera",
        ],
      };
      // Import the sample plugin module
      const { default: iotModule } = await import("../../plugins/sample-iot/index");
      loader.register(manifest, iotModule);
      const result = await loader.activatePlugin(manifest.id);
      expect(result).toBe(true);
      expect(loader.getPlugin(manifest.id)!.state).toBe("active");
      // Should have added a panel
      expect(
        sidebar.querySelector('.plugin-panel[data-plugin-id="com.example.iot-sensor-overlay"]'),
      ).not.toBeNull();
      // Should have added a toolbar button
      expect(
        toolbar.querySelector(
          '.plugin-toolbar-btn[data-plugin-id="com.example.iot-sensor-overlay"]',
        ),
      ).not.toBeNull();
    });
  });
});
