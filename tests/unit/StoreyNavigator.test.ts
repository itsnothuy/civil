/**
 * StoreyNavigator.test.ts — Unit tests for StoreyNavigator
 * Phase 5, Task 5.1
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsVisible: jest.fn(),
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["storey1", "wall1", "slab1", "col1", "wall2"],
      objects: {
        storey1: { id: "storey1", aabb: [0, 0, 0, 10, 3, 10] },
        wall1: { id: "wall1", aabb: [0, 0, 0, 5, 3, 5] },
        slab1: { id: "slab1", aabb: [0, 3, 0, 10, 3.3, 10] },
        col1: { id: "col1", aabb: [0, 0, 0, 1, 6, 1] },
        wall2: { id: "wall2", aabb: [0, 3, 0, 5, 6, 5] },
      },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn((ids?: string[]) => {
        if (!ids || ids.length === 0) return [0, 0, 0, 10, 10, 10];
        return [0, 0, 0, 10, 6, 10];
      }),
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
    },
    camera: { projection: "perspective", eye: [0, 0, 10], look: [0, 0, 0], up: [0, 1, 0] },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: {
      metaObjects: {
        storey1: {
          id: "storey1",
          name: "Ground Floor",
          type: "IfcBuildingStorey",
          propertySets: [
            {
              properties: [{ name: "Elevation", value: 0 }],
            },
          ],
          children: [
            {
              id: "wall1",
              name: "Wall 1",
              type: "IfcWall",
              children: [],
            },
            {
              id: "slab1",
              name: "Slab 1",
              type: "IfcSlab",
              children: [],
            },
          ],
        },
        storey2: {
          id: "storey2",
          name: "First Floor (+3.000)",
          type: "IfcBuildingStorey",
          propertySets: [],
          children: [
            {
              id: "wall2",
              name: "Wall 2",
              type: "IfcWall",
              children: [],
            },
            {
              id: "col1",
              name: "Column 1",
              type: "IfcColumn",
              children: [],
            },
          ],
        },
        wall1: { id: "wall1", name: "Wall 1", type: "IfcWall" },
        slab1: { id: "slab1", name: "Slab 1", type: "IfcSlab" },
        wall2: { id: "wall2", name: "Wall 2", type: "IfcWall" },
        col1: { id: "col1", name: "Column 1", type: "IfcColumn" },
      },
    },
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

import { StoreyNavigator } from "../../src/ui/StoreyNavigator";
import { ViewerCore } from "../../src/viewer/ViewerCore";

describe("StoreyNavigator", () => {
  let viewer: ViewerCore;
  let navigator: StoreyNavigator;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="storey-panel"></div>
      <canvas id="viewer-canvas"></canvas>
    `;
    container = document.getElementById("storey-panel")!;
    viewer = new ViewerCore("viewer-canvas");
    navigator = new StoreyNavigator(viewer, "storey-panel");
    navigator.init();
  });

  describe("init", () => {
    it("extracts storeys from metadata", () => {
      expect(navigator.storeys.length).toBe(2);
    });

    it("sorts storeys by elevation", () => {
      expect(navigator.storeys[0].name).toBe("Ground Floor");
      expect(navigator.storeys[0].elevation).toBe(0);
      expect(navigator.storeys[1].name).toBe("First Floor (+3.000)");
      expect(navigator.storeys[1].elevation).toBe(3);
    });

    it("collects child object IDs for each storey", () => {
      const ground = navigator.storeys[0];
      expect(ground.objectIds).toContain("storey1");
      expect(ground.objectIds).toContain("wall1");
      expect(ground.objectIds).toContain("slab1");
    });

    it("renders storey selector UI", () => {
      expect(container.querySelector("#storey-select")).not.toBeNull();
      expect(container.querySelector("#storey-up")).not.toBeNull();
      expect(container.querySelector("#storey-down")).not.toBeNull();
    });

    it("renders all storey options plus 'All Storeys'", () => {
      const options = container.querySelectorAll("#storey-select option");
      expect(options.length).toBe(3); // All + 2 storeys
      expect(options[0].textContent).toContain("All Storeys");
    });
  });

  describe("goToStorey", () => {
    it("sets the active storey", () => {
      const storeyId = navigator.storeys[0].id;
      navigator.goToStorey(storeyId);
      expect(navigator.activeStoreyId).toBe(storeyId);
      expect(navigator.showAllMode).toBe(false);
    });

    it("hides objects not in the storey", () => {
      const scene = viewer.viewer.scene;
      navigator.goToStorey(navigator.storeys[0].id);
      expect(scene.setObjectsVisible).toHaveBeenCalled();
    });

    it("sets camera to planView mode", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      expect(viewer.viewer.cameraControl.navMode).toBe("planView");
    });

    it("flies camera to storey", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      expect(viewer.viewer.cameraFlight.flyTo).toHaveBeenCalled();
    });

    it("warns if storey not found", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation();
      navigator.goToStorey("nonexistent");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("not found"));
      spy.mockRestore();
    });
  });

  describe("showAll", () => {
    it("resets to showing all storeys", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      navigator.showAll();
      expect(navigator.activeStoreyId).toBeNull();
      expect(navigator.showAllMode).toBe(true);
    });

    it("makes all objects visible", () => {
      const scene = viewer.viewer.scene;
      navigator.showAll();
      expect(scene.setObjectsVisible).toHaveBeenCalledWith(scene.objectIds, true);
    });
  });

  describe("goToNextStorey / goToPreviousStorey", () => {
    it("navigates to the next storey", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      navigator.goToNextStorey();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[1].id);
    });

    it("wraps around to first storey from last", () => {
      navigator.goToStorey(navigator.storeys[1].id);
      navigator.goToNextStorey();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[0].id);
    });

    it("navigates to the previous storey", () => {
      navigator.goToStorey(navigator.storeys[1].id);
      navigator.goToPreviousStorey();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[0].id);
    });

    it("wraps around to last storey from first", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      navigator.goToPreviousStorey();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[1].id);
    });
  });

  describe("focusObject", () => {
    it("navigates to the storey containing the object", () => {
      navigator.focusObject("wall2");
      expect(navigator.activeStoreyId).toBe(navigator.storeys[1].id);
    });

    it("does nothing for non-existent object", () => {
      navigator.focusObject("nonexistent");
      expect(navigator.activeStoreyId).toBeNull();
    });
  });

  describe("UI interaction", () => {
    it("storey select triggers goToStorey", () => {
      const select = container.querySelector("#storey-select") as HTMLSelectElement;
      select.value = navigator.storeys[0].id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      expect(navigator.activeStoreyId).toBe(navigator.storeys[0].id);
    });

    it("selecting All Storeys triggers showAll", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      const select = container.querySelector("#storey-select") as HTMLSelectElement;
      select.value = "__all__";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      expect(navigator.showAllMode).toBe(true);
    });

    it("Up button triggers goToNextStorey", () => {
      navigator.goToStorey(navigator.storeys[0].id);
      const btn = container.querySelector("#storey-up") as HTMLButtonElement;
      btn.click();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[1].id);
    });

    it("Down button triggers goToPreviousStorey", () => {
      navigator.goToStorey(navigator.storeys[1].id);
      const btn = container.querySelector("#storey-down") as HTMLButtonElement;
      btn.click();
      expect(navigator.activeStoreyId).toBe(navigator.storeys[0].id);
    });
  });

  describe("graceful fallback", () => {
    it("shows empty message when no storeys found", () => {
      // Create a viewer with no IfcBuildingStorey in metadata
      const emptyMetaScene = {
        metaObjects: {
          wall1: { id: "wall1", name: "Wall", type: "IfcWall" },
        },
      };
      (viewer.viewer as any).metaScene = emptyMetaScene;
      const nav = new StoreyNavigator(viewer, "storey-panel");
      nav.init();
      expect(nav.storeys.length).toBe(0);
      expect(container.textContent).toContain("No storeys found");
    });
  });

  describe("destroy", () => {
    it("clears the container and state", () => {
      navigator.destroy();
      expect(container.innerHTML).toBe("");
      expect(navigator.storeys.length).toBe(0);
      expect(navigator.activeStoreyId).toBeNull();
    });
  });
});
