/**
 * UtilitiesPanel.test.ts — Unit tests for Utilities & Underground Context
 * Phase 5, Task 5.4
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsVisible: jest.fn(),
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["pipe-1", "duct-1", "footing-1", "beam-1", "underground-cable"],
      objects: {
        "pipe-1": { id: "pipe-1", aabb: [0, -5, 0, 2, -1, 2] },
        "duct-1": { id: "duct-1", aabb: [5, 2, 0, 8, 5, 3] },
        "footing-1": { id: "footing-1", aabb: [0, -10, 0, 3, -6, 3] },
        "beam-1": { id: "beam-1", aabb: [0, 3, 0, 10, 4, 5] },
        "underground-cable": { id: "underground-cable", aabb: [0, -8, 0, 1, -4, 1] },
      },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, -10, 0, 10, 10, 10]),
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
    camera: {
      projection: "perspective",
      eye: [-10, 10, -10],
      look: [0, 0, 0],
      up: [0, 1, 0],
    },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: {
      metaObjects: {
        "pipe-1": {
          type: "IfcPipeSegment",
          name: "Water Main 200mm",
          propertySets: [
            {
              name: "Pset_PipeCommon",
              properties: [
                { name: "NominalDiameter", value: "200mm" },
                { name: "Material", value: "PVC" },
                { name: "NominalLength", value: "12.5m" },
              ],
            },
          ],
        },
        "duct-1": {
          type: "IfcDuctSegment",
          name: "HVAC Supply Duct",
          propertySets: [
            {
              name: "Pset_DuctCommon",
              properties: [
                { name: "Diameter", value: "450mm" },
                { name: "Material", value: "Galvanized Steel" },
              ],
            },
          ],
        },
        "footing-1": {
          type: "IfcFooting",
          name: "Foundation F-01",
          propertySets: [],
        },
        "beam-1": {
          type: "IfcBeam",
          name: "Floor Beam B-12",
          propertySets: [],
        },
        "underground-cable": {
          type: "IfcCableSegment",
          name: "HV Cable Run",
          propertySets: [
            {
              name: "Pset_CableCommon",
              properties: [{ name: "Material", value: "Copper" }],
            },
          ],
        },
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

import { UtilitiesPanel } from "../../src/ui/UtilitiesPanel";
import { ViewerCore } from "../../src/viewer/ViewerCore";

describe("UtilitiesPanel", () => {
  let viewer: ViewerCore;
  let panel: UtilitiesPanel;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="viewer-canvas" width="200" height="200"></canvas>
      <div id="properties-panel"></div>
      <section id="utilities-panel"></section>
    `;
    viewer = new ViewerCore("viewer-canvas");
    panel = new UtilitiesPanel(viewer, "utilities-panel");
    panel.init();
  });

  describe("initialization", () => {
    it("scans and finds utility objects", () => {
      // pipe-1, duct-1, underground-cable are utility types
      expect(panel.utilities.size).toBe(3);
      expect(panel.utilities.has("pipe-1")).toBe(true);
      expect(panel.utilities.has("duct-1")).toBe(true);
      expect(panel.utilities.has("underground-cable")).toBe(true);
    });

    it("does NOT include non-utility objects", () => {
      expect(panel.utilities.has("beam-1")).toBe(false);
    });

    it("identifies underground elements by IFC type", () => {
      // pipe-1 (IfcPipeSegment), footing-1 (IfcFooting), underground-cable (IfcCableSegment)
      expect(panel.undergroundIds).toContain("pipe-1");
      expect(panel.undergroundIds).toContain("footing-1");
      expect(panel.undergroundIds).toContain("underground-cable");
    });

    it("identifies underground elements by bounding box (below grade)", () => {
      // beam-1 is above grade and not an underground type
      expect(panel.undergroundIds).not.toContain("beam-1");
    });

    it("renders the panel HTML", () => {
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Utilities");
      expect(container?.innerHTML).toContain("Underground");
    });
  });

  describe("metadata extraction", () => {
    it("extracts diameter from Pset properties", () => {
      const pipe = panel.getUtilityMetadata("pipe-1");
      expect(pipe?.diameter).toBe("200mm");
    });

    it("extracts material from Pset properties", () => {
      const pipe = panel.getUtilityMetadata("pipe-1");
      expect(pipe?.material).toBe("PVC");
    });

    it("extracts length from Pset properties", () => {
      const pipe = panel.getUtilityMetadata("pipe-1");
      expect(pipe?.length).toBe("12.5m");
    });

    it("extracts all properties into a flat record", () => {
      const pipe = panel.getUtilityMetadata("pipe-1");
      expect(pipe?.properties["NominalDiameter"]).toBe("200mm");
      expect(pipe?.properties["Material"]).toBe("PVC");
      expect(pipe?.properties["NominalLength"]).toBe("12.5m");
    });

    it("extracts duct metadata", () => {
      const duct = panel.getUtilityMetadata("duct-1");
      expect(duct?.diameter).toBe("450mm");
      expect(duct?.material).toBe("Galvanized Steel");
      expect(duct?.ifcType).toBe("IfcDuctSegment");
    });

    it("returns name and IFC type", () => {
      const pipe = panel.getUtilityMetadata("pipe-1");
      expect(pipe?.name).toBe("Water Main 200mm");
      expect(pipe?.ifcType).toBe("IfcPipeSegment");
    });

    it("returns undefined for non-utility objects", () => {
      expect(panel.getUtilityMetadata("beam-1")).toBeUndefined();
    });
  });

  describe("underground visibility toggle", () => {
    it("starts with underground hidden", () => {
      expect(panel.undergroundVisible).toBe(false);
    });

    it("toggles underground visibility on", () => {
      panel.toggleUnderground();
      expect(panel.undergroundVisible).toBe(true);
    });

    it("toggles underground visibility off", () => {
      panel.toggleUnderground();
      panel.toggleUnderground();
      expect(panel.undergroundVisible).toBe(false);
    });

    it("calls setObjectsVisible when showing underground", () => {
      panel.showUnderground();
      expect(viewer.viewer.scene.setObjectsVisible).toHaveBeenCalled();
    });

    it("calls setObjectsXRayed when showing underground with transparency", () => {
      panel.showUnderground();
      expect(viewer.viewer.scene.setObjectsXRayed).toHaveBeenCalled();
    });

    it("hides underground when hideUnderground() is called", () => {
      panel.showUnderground();
      (viewer.viewer.scene.setObjectsVisible as jest.Mock).mockClear();
      panel.hideUnderground();
      expect(viewer.viewer.scene.setObjectsVisible).toHaveBeenCalled();
      expect(panel.undergroundVisible).toBe(false);
    });

    it("defaults to semi-transparent mode", () => {
      expect(panel.undergroundTransparent).toBe(true);
    });

    it("can disable transparent mode", () => {
      panel.setTransparentMode(false);
      expect(panel.undergroundTransparent).toBe(false);
    });

    it("applies X-ray when transparent mode is on and underground visible", () => {
      panel.showUnderground();
      const calls = (viewer.viewer.scene.setObjectsXRayed as jest.Mock).mock.calls;
      // Should have been called with (ids, true) for xray
      const xrayTrueCalls = calls.filter((c: unknown[]) => c[1] === true);
      expect(xrayTrueCalls.length).toBeGreaterThan(0);
    });

    it("does NOT apply X-ray when transparent mode is off and underground visible", () => {
      panel.setTransparentMode(false);
      (viewer.viewer.scene.setObjectsXRayed as jest.Mock).mockClear();
      panel.showUnderground();
      const calls = (viewer.viewer.scene.setObjectsXRayed as jest.Mock).mock.calls;
      // Should have been called with (ids, false) — no xray
      const xrayTrueCalls = calls.filter((c: unknown[]) => c[1] === true);
      expect(xrayTrueCalls.length).toBe(0);
    });
  });

  describe("selectUtility", () => {
    it("selects a utility object in the scene", () => {
      panel.selectUtility("pipe-1");
      expect(viewer.viewer.scene.setObjectsSelected).toHaveBeenCalledWith(["pipe-1"], true);
    });

    it("updates render to show selected utility detail", () => {
      panel.selectUtility("pipe-1");
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Water Main 200mm");
      expect(container?.innerHTML).toContain("200mm");
      expect(container?.innerHTML).toContain("PVC");
    });
  });

  describe("render", () => {
    it("shows utility count in the panel", () => {
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Pipe/Duct Objects (3)");
    });

    it("shows underground element count", () => {
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("underground element");
    });

    it("displays Show Underground button when hidden", () => {
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Show Underground");
    });

    it("displays Hide Underground button when shown", () => {
      panel.showUnderground();
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Hide Underground");
    });

    it("renders semi-transparent checkbox", () => {
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("Semi-transparent");
    });
  });

  describe("event handling", () => {
    it("toggles underground on button click", () => {
      const container = document.getElementById("utilities-panel")!;
      const btn = container.querySelector('[data-utilities-action="toggle-underground"]');
      expect(btn).not.toBeNull();
      (btn as HTMLElement).click();
      expect(panel.undergroundVisible).toBe(true);
    });

    it("toggles transparent mode on checkbox change", () => {
      const container = document.getElementById("utilities-panel")!;
      const checkbox = container.querySelector(
        '[data-utilities-action="transparent-toggle"]',
      ) as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      expect(panel.undergroundTransparent).toBe(false);
    });
  });

  describe("no utilities model", () => {
    it("shows empty state when no utility objects found", () => {
      // Create a viewer with no utility objects
      const emptyViewer = new ViewerCore("viewer-canvas");
      (emptyViewer.viewer.metaScene as any).metaObjects = {
        "beam-only": { type: "IfcBeam", name: "Beam", propertySets: [] },
      };
      const emptyPanel = new UtilitiesPanel(emptyViewer, "utilities-panel");
      emptyPanel.init();

      expect(emptyPanel.utilities.size).toBe(0);
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toContain("No utility objects found");
    });
  });

  describe("destroy", () => {
    it("clears the container", () => {
      panel.destroy();
      const container = document.getElementById("utilities-panel");
      expect(container?.innerHTML).toBe("");
    });
  });
});
