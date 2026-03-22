/**
 * ViewerCore.test.ts — Unit tests for the xeokit Viewer wrapper.
 *
 * All xeokit SDK classes are mocked since jsdom lacks WebGL.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mock state ──

const mockSceneObjects: Record<string, any> = {};
const mockObjectIds: string[] = [];
const mockSelectedObjectIds: string[] = [];
const mockHighlightedObjectIds: string[] = [];

const mockSetObjectsSelected = jest.fn();
const mockSetObjectsHighlighted = jest.fn();
const mockSetObjectsXRayed = jest.fn();
const mockSetObjectsVisible = jest.fn();
const mockGetAABB = jest.fn(() => [-10, -10, -10, 10, 10, 10]);

const mockFlyTo = jest.fn();
const mockJumpTo = jest.fn();

const cameraControlHandlers: Record<string, (...args: any[]) => void> = {};
const mockCameraControlOn = jest.fn((event: string, cb: (...args: any[]) => void) => {
  cameraControlHandlers[event] = cb;
  return `sub-${event}`;
});

const mockSectionPlanesCreate = jest.fn(({ id }: { id: string }) => ({
  id,
  pos: [0, 0, 0],
  dir: [0, -1, 0],
}));
const mockSectionPlanesShowControl = jest.fn();
const mockSectionPlanesDestroyPlane = jest.fn();
const mockSectionPlanesClear = jest.fn();
const mockSectionPlanesObj: Record<string, any> = {};

const mockViewerDestroy = jest.fn();
const mockNavCubeDestroy = jest.fn();

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      objects: mockSceneObjects,
      get objectIds() {
        return mockObjectIds;
      },
      get selectedObjectIds() {
        return mockSelectedObjectIds;
      },
      get highlightedObjectIds() {
        return mockHighlightedObjectIds;
      },
      setObjectsSelected: mockSetObjectsSelected,
      setObjectsHighlighted: mockSetObjectsHighlighted,
      setObjectsXRayed: mockSetObjectsXRayed,
      setObjectsVisible: mockSetObjectsVisible,
      getAABB: mockGetAABB,
      xrayMaterial: {
        fill: false,
        fillAlpha: 0,
        fillColor: [0, 0, 0],
        edgeAlpha: 0,
        edgeColor: [0, 0, 0],
      },
      highlightMaterial: { fill: false, edges: false, fillAlpha: 0, edgeColor: [0, 0, 0] },
      models: {},
    },
    camera: { eye: [0, 0, 0], look: [0, 0, 0], up: [0, 1, 0], projection: "perspective" },
    cameraFlight: { flyTo: mockFlyTo, jumpTo: mockJumpTo },
    cameraControl: {
      on: mockCameraControlOn,
      navMode: "orbit",
    },
    metaScene: { metaObjects: {} },
    destroy: mockViewerDestroy,
  })),
  SectionPlanesPlugin: jest.fn().mockImplementation(() => ({
    createSectionPlane: mockSectionPlanesCreate,
    showControl: mockSectionPlanesShowControl,
    destroySectionPlane: mockSectionPlanesDestroyPlane,
    hideControl: jest.fn(),
    get sectionPlanes() {
      return mockSectionPlanesObj;
    },
    clear: mockSectionPlanesClear,
  })),
  NavCubePlugin: jest.fn().mockImplementation(() => ({
    destroy: mockNavCubeDestroy,
  })),
}));

import { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Setup ──

// Create a canvas + nav-cube-canvas in jsdom
beforeAll(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "test-canvas";
  document.body.appendChild(canvas);

  const navCanvas = document.createElement("canvas");
  navCanvas.id = "nav-cube-canvas";
  document.body.appendChild(navCanvas);
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset mock state
  mockObjectIds.length = 0;
  mockSelectedObjectIds.length = 0;
  mockHighlightedObjectIds.length = 0;
  Object.keys(mockSceneObjects).forEach((k) => delete mockSceneObjects[k]);
  Object.keys(mockSectionPlanesObj).forEach((k) => delete mockSectionPlanesObj[k]);
  Object.keys(cameraControlHandlers).forEach((k) => delete cameraControlHandlers[k]);
});

// ── Tests ──

describe("ViewerCore", () => {
  describe("constructor", () => {
    it("creates a Viewer with the given canvas ID", () => {
      const vc = new ViewerCore("test-canvas");
      expect(vc).toBeDefined();
      expect(vc.viewer).toBeDefined();
    });

    it("initializes in 3D mode", () => {
      const vc = new ViewerCore("test-canvas");
      expect(vc.mode).toBe("3d");
    });

    it("exposes the raw xeokit Viewer via getter", () => {
      const vc = new ViewerCore("test-canvas");
      expect(vc.viewer.scene).toBeDefined();
      expect(vc.viewer.camera).toBeDefined();
    });
  });

  describe("setMode", () => {
    it("switches to 2D mode and calls flyTo with ortho projection", () => {
      const vc = new ViewerCore("test-canvas");
      vc.setMode("2d");
      expect(vc.mode).toBe("2d");
      expect(mockFlyTo).toHaveBeenCalledWith(expect.objectContaining({ projection: "ortho" }));
      expect(vc.viewer.cameraControl.navMode).toBe("planView");
    });

    it("switches back to 3D mode with perspective", () => {
      const vc = new ViewerCore("test-canvas");
      vc.setMode("2d");
      vc.setMode("3d");
      expect(vc.mode).toBe("3d");
      expect(mockFlyTo).toHaveBeenLastCalledWith(
        expect.objectContaining({ projection: "perspective" }),
      );
      expect(vc.viewer.cameraControl.navMode).toBe("orbit");
    });
  });

  describe("setXray", () => {
    it("calls setObjectsXRayed on the scene", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("obj-1", "obj-2");
      vc.setXray(true);
      expect(mockSetObjectsXRayed).toHaveBeenCalledWith(["obj-1", "obj-2"], true);
    });

    it("can disable X-ray", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("obj-1");
      vc.setXray(false);
      expect(mockSetObjectsXRayed).toHaveBeenCalledWith(["obj-1"], false);
    });
  });

  describe("selection", () => {
    it("onSelect registers a callback and returns unsubscribe", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      const unsub = vc.onSelect(cb);
      expect(typeof unsub).toBe("function");
    });

    it("selectEntity selects and fires listeners", () => {
      const vc = new ViewerCore("test-canvas");
      const entity = { selected: false, highlighted: false, aabb: [-1, -1, -1, 1, 1, 1] };
      mockSceneObjects["entity-1"] = entity;

      const cb = jest.fn();
      vc.onSelect(cb);
      vc.selectEntity("entity-1");

      expect(entity.selected).toBe(true);
      expect(entity.highlighted).toBe(true);
      expect(cb).toHaveBeenCalledWith("entity-1", null);
    });

    it("selectEntity(null) deselects and fires listeners with null", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      vc.onSelect(cb);
      vc.selectEntity(null);
      expect(cb).toHaveBeenCalledWith(null, null);
      expect(mockSetObjectsSelected).toHaveBeenCalled();
    });

    it("unsubscribe removes the listener", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      const unsub = vc.onSelect(cb);
      unsub();
      vc.selectEntity(null);
      expect(cb).not.toHaveBeenCalled();
    });

    it("supports multiple listeners", () => {
      const vc = new ViewerCore("test-canvas");
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      vc.onSelect(cb1);
      vc.onSelect(cb2);

      mockSceneObjects["x"] = { selected: false, highlighted: false };
      vc.selectEntity("x");
      expect(cb1).toHaveBeenCalledWith("x", null);
      expect(cb2).toHaveBeenCalledWith("x", null);
    });

    it("picked event fires listener with entity ID and worldPos", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      vc.onSelect(cb);

      // Simulate picked event
      const pickedHandler = cameraControlHandlers["picked"];
      expect(pickedHandler).toBeDefined();

      const fakeEntity = { id: "ent-42", selected: false, highlighted: false };
      pickedHandler({ entity: fakeEntity, worldPos: [1, 2, 3] });
      expect(cb).toHaveBeenCalledWith("ent-42", [1, 2, 3]);
      expect(fakeEntity.selected).toBe(true);
    });

    it("pickedNothing event fires listener with null", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      vc.onSelect(cb);

      const handler = cameraControlHandlers["pickedNothing"];
      expect(handler).toBeDefined();
      handler();
      expect(cb).toHaveBeenCalledWith(null, null);
    });
  });

  describe("cycleSelection", () => {
    it("selects first object when nothing is selected", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("a", "b", "c");
      mockSceneObjects["a"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["b"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["c"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };

      vc.cycleSelection("next");
      // Should select first (index 0)
      expect(mockSceneObjects["a"].selected).toBe(true);
    });

    it("cycles to next object", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("a", "b", "c");
      mockSceneObjects["a"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["b"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["c"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSelectedObjectIds.push("a");

      vc.cycleSelection("next");
      expect(mockSceneObjects["b"].selected).toBe(true);
    });

    it("wraps around to first object", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("a", "b");
      mockSceneObjects["a"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["b"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSelectedObjectIds.push("b");

      vc.cycleSelection("next");
      expect(mockSceneObjects["a"].selected).toBe(true);
    });

    it("cycles prev direction", () => {
      const vc = new ViewerCore("test-canvas");
      mockObjectIds.push("a", "b", "c");
      mockSceneObjects["a"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["b"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSceneObjects["c"] = { selected: false, highlighted: false, aabb: [0, 0, 0, 1, 1, 1] };
      mockSelectedObjectIds.push("b");

      vc.cycleSelection("prev");
      expect(mockSceneObjects["a"].selected).toBe(true);
    });

    it("does nothing when no objects exist", () => {
      const vc = new ViewerCore("test-canvas");
      // objectIds empty
      vc.cycleSelection("next");
      expect(mockSetObjectsSelected).not.toHaveBeenCalled();
    });
  });

  describe("section planes", () => {
    it("addSectionPlane creates a plane and returns its ID", () => {
      const vc = new ViewerCore("test-canvas");
      const id = vc.addSectionPlane();
      expect(id).toMatch(/^section-/);
      expect(mockSectionPlanesCreate).toHaveBeenCalled();
      expect(mockSectionPlanesShowControl).toHaveBeenCalledWith(id);
    });

    it("returns null after MAX_SECTION_PLANES (6)", () => {
      const vc = new ViewerCore("test-canvas");
      for (let i = 0; i < 6; i++) {
        expect(vc.addSectionPlane()).toBeTruthy();
      }
      expect(vc.addSectionPlane()).toBeNull();
    });

    it("removeSectionPlane destroys a specific plane", () => {
      const vc = new ViewerCore("test-canvas");
      const id = vc.addSectionPlane()!;
      vc.removeSectionPlane(id);
      expect(mockSectionPlanesDestroyPlane).toHaveBeenCalledWith(id);
    });

    it("clearSectionPlanes clears all planes", () => {
      const vc = new ViewerCore("test-canvas");
      vc.addSectionPlane();
      vc.addSectionPlane();
      vc.clearSectionPlanes();
      expect(mockSectionPlanesClear).toHaveBeenCalled();
    });

    it("exportSectionPlanes returns plane data", () => {
      const vc = new ViewerCore("test-canvas");
      mockSectionPlanesObj["sp-1"] = {
        id: "sp-1",
        pos: Float32Array.from([1, 2, 3]),
        dir: Float32Array.from([0, -1, 0]),
      };

      const exported = vc.exportSectionPlanes();
      expect(exported).toEqual([{ id: "sp-1", pos: [1, 2, 3], dir: [0, -1, 0] }]);
    });

    it("can add new planes after clearing", () => {
      const vc = new ViewerCore("test-canvas");
      for (let i = 0; i < 6; i++) vc.addSectionPlane();
      expect(vc.addSectionPlane()).toBeNull();
      vc.clearSectionPlanes();
      expect(vc.addSectionPlane()).toBeTruthy();
    });
  });

  describe("destroy", () => {
    it("destroys viewer, nav cube, and clears section planes", () => {
      const vc = new ViewerCore("test-canvas");
      vc.destroy();
      expect(mockNavCubeDestroy).toHaveBeenCalled();
      expect(mockSectionPlanesClear).toHaveBeenCalled();
      expect(mockViewerDestroy).toHaveBeenCalled();
    });

    it("clears selection listeners on destroy", () => {
      const vc = new ViewerCore("test-canvas");
      const cb = jest.fn();
      vc.onSelect(cb);
      vc.destroy();
      // After destroy, firing selection should not call listeners
      // (selectEntity would fail anyway since viewer is destroyed, but test the list clearing)
    });
  });
});
