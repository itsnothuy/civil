/**
 * VisionProUI.test.ts — Unit tests for Phase 6 Task 6.1
 */

// Mock xeokit before imports
jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsVisible: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["obj1", "obj2"],
      objects: {
        obj1: { id: "obj1", highlighted: false, selected: false, aabb: [0, 0, 0, 1, 1, 1] },
        obj2: { id: "obj2", highlighted: false, selected: false, aabb: [2, 2, 2, 3, 3, 3] },
      },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, 0, 0, 10, 10, 10]),
      xrayMaterial: {
        fill: true,
        fillAlpha: 0.1,
        fillColor: [0, 0, 0],
        edgeAlpha: 0.3,
        edgeColor: [0, 0, 0],
      },
      highlightMaterial: { fill: true, edges: true, fillAlpha: 0.3, edgeColor: [1, 1, 0] },
      models: {},
      canvas: { canvas: document.createElement("canvas") },
      pick: jest.fn(() => null),
    },
    camera: { projection: "perspective", eye: [0, 0, 10], look: [0, 0, 0], up: [0, 1, 0] },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: { metaObjects: {} },
    destroy: jest.fn(),
  })),
  SectionPlanesPlugin: jest.fn().mockImplementation(() => ({
    createSectionPlane: jest.fn(() => ({ id: "sp-1" })),
    sectionPlanes: {},
    showControl: jest.fn(),
    hideControl: jest.fn(),
    destroySectionPlane: jest.fn(),
    clear: jest.fn(),
  })),
  NavCubePlugin: jest.fn(),
}));

import { VisionProUI, detectHeadsetDevice } from "../../src/xr/VisionProUI";
import { ViewerCore } from "../../src/viewer/ViewerCore";

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("VisionProUI", () => {
  let viewer: ViewerCore;
  let visionUI: VisionProUI;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="viewer-canvas"></canvas>
      <canvas id="nav-cube-canvas"></canvas>
      <div id="toolbar">
        <button id="btn-xray" aria-pressed="false">X-Ray</button>
        <button id="btn-measure">Measure</button>
        <button id="btn-annotate">Annotate</button>
      </div>
    `;
    viewer = new ViewerCore("viewer-canvas");
    visionUI = new VisionProUI(viewer, { autoDetect: false });
  });

  afterEach(() => {
    visionUI.destroy();
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("starts inactive", () => {
      expect(visionUI.isActive).toBe(false);
    });

    it("config has correct defaults", () => {
      const defaultUI = new VisionProUI(viewer);
      expect(defaultUI.config.gazeEnabled).toBe(true);
      expect(defaultUI.config.pinchEnabled).toBe(true);
      expect(defaultUI.config.touchTargetSize).toBe(64);
      expect(defaultUI.config.autoDetect).toBe(true);
      defaultUI.destroy();
    });

    it("accepts custom config", () => {
      const custom = new VisionProUI(viewer, {
        gazeEnabled: false,
        touchTargetSize: 80,
      });
      expect(custom.config.gazeEnabled).toBe(false);
      expect(custom.config.touchTargetSize).toBe(80);
      custom.destroy();
    });
  });

  describe("activation", () => {
    it("adds headset-mode class to body", () => {
      visionUI.activate();
      expect(document.body.classList.contains("headset-mode")).toBe(true);
    });

    it("sets isActive to true", () => {
      visionUI.activate();
      expect(visionUI.isActive).toBe(true);
    });

    it("creates HUD element", () => {
      visionUI.activate();
      expect(visionUI.hud).not.toBeNull();
      expect(document.getElementById("vision-hud")).not.toBeNull();
    });

    it("HUD has correct role and label", () => {
      visionUI.activate();
      const hud = document.getElementById("vision-hud");
      expect(hud?.getAttribute("role")).toBe("toolbar");
      expect(hud?.getAttribute("aria-label")).toBe("Headset controls");
    });

    it("creates HUD buttons with large targets", () => {
      visionUI.activate();
      const buttons = document.querySelectorAll(".hud-btn");
      expect(buttons.length).toBeGreaterThanOrEqual(4);
      buttons.forEach((btn) => {
        expect(btn.getAttribute("aria-label")).toBeTruthy();
      });
    });

    it("does not double-activate", () => {
      visionUI.activate();
      const hud1 = visionUI.hud;
      visionUI.activate();
      expect(visionUI.hud).toBe(hud1);
    });
  });

  describe("deactivation", () => {
    it("removes headset-mode class from body", () => {
      visionUI.activate();
      visionUI.deactivate();
      expect(document.body.classList.contains("headset-mode")).toBe(false);
    });

    it("sets isActive to false", () => {
      visionUI.activate();
      visionUI.deactivate();
      expect(visionUI.isActive).toBe(false);
    });

    it("removes HUD element", () => {
      visionUI.activate();
      visionUI.deactivate();
      expect(visionUI.hud).toBeNull();
      expect(document.getElementById("vision-hud")).toBeNull();
    });

    it("removes radial menu element", () => {
      visionUI.activate();
      visionUI.deactivate();
      expect(visionUI.radialMenuElement).toBeNull();
    });

    it("is safe to call when inactive", () => {
      expect(() => visionUI.deactivate()).not.toThrow();
    });
  });

  describe("radial menu", () => {
    beforeEach(() => {
      visionUI.init();
      visionUI.activate();
    });

    it("creates radial menu element", () => {
      expect(visionUI.radialMenuElement).not.toBeNull();
    });

    it("radial menu has role=menu", () => {
      const menu = document.getElementById("radial-menu");
      expect(menu?.getAttribute("role")).toBe("menu");
    });

    it("radial menu is hidden by default", () => {
      const menu = document.getElementById("radial-menu");
      expect(menu?.getAttribute("aria-hidden")).toBe("true");
      expect(menu?.classList.contains("visible")).toBe(false);
    });

    it("showRadialMenu makes visible", () => {
      visionUI.showRadialMenu(100, 200);
      const menu = document.getElementById("radial-menu");
      expect(menu?.classList.contains("visible")).toBe(true);
      expect(menu?.getAttribute("aria-hidden")).toBe("false");
    });

    it("hideRadialMenu hides", () => {
      visionUI.showRadialMenu(100, 200);
      visionUI.hideRadialMenu();
      const menu = document.getElementById("radial-menu");
      expect(menu?.classList.contains("visible")).toBe(false);
    });

    it("positions at given coordinates", () => {
      visionUI.showRadialMenu(150, 300);
      const menu = document.getElementById("radial-menu");
      expect(menu?.style.left).toBe("150px");
      expect(menu?.style.top).toBe("300px");
    });

    it("contains default actions", () => {
      const buttons = document.querySelectorAll(".radial-btn");
      expect(buttons.length).toBeGreaterThanOrEqual(5);
    });

    it("radial buttons have menuitem role", () => {
      const buttons = document.querySelectorAll(".radial-btn");
      buttons.forEach((btn) => {
        expect(btn.getAttribute("role")).toBe("menuitem");
      });
    });
  });

  describe("custom radial actions", () => {
    beforeEach(() => {
      visionUI.init();
      visionUI.activate();
    });

    it("addRadialAction adds a new button", () => {
      const beforeCount = document.querySelectorAll(".radial-btn").length;
      visionUI.addRadialAction({
        id: "test-action",
        label: "Test",
        icon: "🧪",
        onActivate: jest.fn(),
      });
      const afterCount = document.querySelectorAll(".radial-btn").length;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it("removeRadialAction removes a button", () => {
      visionUI.addRadialAction({
        id: "temp-action",
        label: "Temp",
        icon: "⏳",
        onActivate: jest.fn(),
      });
      const beforeCount = document.querySelectorAll(".radial-btn").length;
      visionUI.removeRadialAction("temp-action");
      const afterCount = document.querySelectorAll(".radial-btn").length;
      expect(afterCount).toBe(beforeCount - 1);
    });

    it("clicking radial button calls onActivate", () => {
      const callback = jest.fn();
      visionUI.addRadialAction({
        id: "click-test",
        label: "Click",
        icon: "👆",
        onActivate: callback,
      });
      visionUI.showRadialMenu(100, 100);

      const btn = document.querySelector('[aria-label="Click"]') as HTMLButtonElement;
      btn?.click();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("detectHeadsetDevice", () => {
    it("returns standard device for normal browser", () => {
      const result = detectHeadsetDevice();
      expect(result.isHeadset).toBe(false);
      expect(result.deviceName).toBe("standard");
    });

    it("returns isHeadset=false for standard desktops", () => {
      const result = detectHeadsetDevice();
      expect(result.isHeadset).toBe(false);
      expect(result.confidence).toBe("high");
    });
  });

  describe("destroy", () => {
    it("cleans up everything", () => {
      visionUI.init();
      visionUI.activate();
      visionUI.destroy();
      expect(visionUI.isActive).toBe(false);
      expect(document.getElementById("vision-hud")).toBeNull();
      expect(document.getElementById("radial-menu")).toBeNull();
      expect(document.body.classList.contains("headset-mode")).toBe(false);
    });
  });

  describe("HUD button actions", () => {
    beforeEach(() => {
      visionUI.activate();
    });

    it("3D View button calls setMode(3d)", () => {
      const spy = jest.spyOn(viewer, "setMode");
      const btn = document.getElementById("hud-3d");
      btn?.click();
      expect(spy).toHaveBeenCalledWith("3d");
    });

    it("2D Plan button calls setMode(2d)", () => {
      const spy = jest.spyOn(viewer, "setMode");
      const btn = document.getElementById("hud-2d");
      btn?.click();
      expect(spy).toHaveBeenCalledWith("2d");
    });

    it("Section button calls addSectionPlane", () => {
      const spy = jest.spyOn(viewer, "addSectionPlane");
      const btn = document.getElementById("hud-section");
      btn?.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("init with autoDetect", () => {
    it("does not activate on standard device", () => {
      const ui = new VisionProUI(viewer, { autoDetect: true });
      ui.init();
      expect(ui.isActive).toBe(false);
      ui.destroy();
    });
  });
});
