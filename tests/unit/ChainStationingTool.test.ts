/**
 * ChainStationingTool.test.ts — Unit tests for ChainStationingTool
 * Phase 5, Task 5.2
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsVisible: jest.fn(),
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["align1", "seg1", "seg2", "obj1"],
      objects: {
        align1: { id: "align1", aabb: [0, 0, 0, 100, 5, 100] },
        seg1: { id: "seg1", aabb: [0, 0, 0, 50, 2, 0] },
        seg2: { id: "seg2", aabb: [50, 0, 0, 100, 2, 0] },
        obj1: { id: "obj1", aabb: [10, 0, 10, 15, 3, 15] },
      },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, 0, 0, 100, 5, 100]),
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
    cameraControl: {
      on: jest.fn().mockReturnValue("sub-id"),
      off: jest.fn(),
      navMode: "orbit",
    },
    metaScene: {
      metaObjects: {
        align1: {
          id: "align1",
          name: "Main Road Alignment",
          type: "IfcAlignment",
          children: [
            { id: "seg1", name: "Segment 1", type: "IfcAlignmentSegment" },
            { id: "seg2", name: "Segment 2", type: "IfcAlignmentSegment" },
          ],
        },
        seg1: { id: "seg1", name: "Segment 1", type: "IfcAlignmentSegment" },
        seg2: { id: "seg2", name: "Segment 2", type: "IfcAlignmentSegment" },
        obj1: { id: "obj1", name: "Object 1", type: "IfcWall" },
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

import { ChainStationingTool, formatStation } from "../../src/tools/ChainStationingTool";
import { ViewerCore } from "../../src/viewer/ViewerCore";

describe("ChainStationingTool", () => {
  let viewer: ViewerCore;
  let tool: ChainStationingTool;

  beforeEach(() => {
    document.body.innerHTML = `<canvas id="viewer-canvas"></canvas>`;
    viewer = new ViewerCore("viewer-canvas");
    tool = new ChainStationingTool(viewer);
  });

  describe("formatStation", () => {
    it("formats metric station numbers", () => {
      expect(formatStation(0, "metric")).toBe("STA 0+000.000");
      expect(formatStation(1234.567, "metric")).toBe("STA 1+234.567");
      expect(formatStation(500, "metric")).toBe("STA 0+500.000");
    });

    it("formats US station numbers", () => {
      // 100 metres ≈ 328.084 feet → STA 3+028.08 (approx)
      const result = formatStation(100, "us");
      expect(result).toMatch(/^STA \d+\+\d+\.\d{2}$/);
    });
  });

  describe("detectAlignments", () => {
    it("detects IfcAlignment entities from metadata", () => {
      const count = tool.detectAlignments();
      expect(count).toBe(1);
      expect(tool.alignments.length).toBe(1);
    });

    it("sets the first detected alignment as active", () => {
      tool.detectAlignments();
      expect(tool.activeAlignment).not.toBeNull();
      expect(tool.activeAlignment!.name).toBe("Main Road Alignment");
      expect(tool.activeAlignment!.source).toBe("ifc");
    });

    it("calculates total length", () => {
      tool.detectAlignments();
      expect(tool.activeAlignment!.totalLength).toBeGreaterThan(0);
    });

    it("builds station points from child entities", () => {
      tool.detectAlignments();
      expect(tool.activeAlignment!.points.length).toBeGreaterThanOrEqual(2);
    });

    it("returns 0 when no IfcAlignment found", () => {
      // Remove the alignment from metadata
      const metaScene = viewer.viewer.metaScene;
      (metaScene.metaObjects as any).align1.type = "IfcWall";
      const count = tool.detectAlignments();
      expect(count).toBe(0);
    });
  });

  describe("manual alignment mode", () => {
    it("starts manual mode", () => {
      tool.startManualAlignment("Test Alignment");
      expect(tool.manualMode).toBe(true);
    });

    it("does not restart if already in manual mode", () => {
      tool.startManualAlignment();
      tool.startManualAlignment();
      expect(tool.manualMode).toBe(true);
    });

    it("cancels manual mode", () => {
      tool.startManualAlignment();
      tool.cancelManualAlignment();
      expect(tool.manualMode).toBe(false);
      expect(tool.manualPoints.length).toBe(0);
    });

    it("requires at least 2 points to finish", () => {
      tool.startManualAlignment();
      const result = tool.finishManualAlignment();
      expect(result).toBeNull();
    });

    it("finishes manual alignment and adds it", () => {
      tool.startManualAlignment("Highway 1");

      // Simulate adding points manually
      (tool as any)._manualPoints = [
        { station: 0, position: [0, 0, 0] as [number, number, number] },
        { station: 100, position: [100, 0, 0] as [number, number, number] },
        { station: 200, position: [200, 0, 0] as [number, number, number] },
      ];

      const result = tool.finishManualAlignment("Highway 1");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Highway 1");
      expect(result!.source).toBe("manual");
      expect(result!.points.length).toBe(3);
      expect(result!.totalLength).toBe(200);
      expect(tool.manualMode).toBe(false);
      expect(tool.alignments.length).toBe(1);
    });

    it("undoes the last point", () => {
      tool.startManualAlignment();
      (tool as any)._manualPoints = [
        { station: 0, position: [0, 0, 0] as [number, number, number] },
        { station: 10, position: [10, 0, 0] as [number, number, number] },
      ];
      tool.undoLastPoint();
      expect(tool.manualPoints.length).toBe(1);
    });
  });

  describe("alignment management", () => {
    beforeEach(() => {
      tool.detectAlignments();
    });

    it("sets active alignment", () => {
      const id = tool.alignments[0].id;
      tool.setActiveAlignment(id);
      expect(tool.activeAlignment!.id).toBe(id);
    });

    it("removes an alignment", () => {
      const id = tool.alignments[0].id;
      tool.removeAlignment(id);
      expect(tool.alignments.length).toBe(0);
      expect(tool.activeAlignment).toBeNull();
    });
  });

  describe("getStationAt", () => {
    it("returns null when no active alignment", () => {
      expect(tool.getStationAt([0, 0, 0])).toBeNull();
    });

    it("returns a station point for a position along the alignment", () => {
      tool.detectAlignments();
      const result = tool.getStationAt([50, 1, 0]);
      expect(result).not.toBeNull();
      expect(result!.station).toBeGreaterThanOrEqual(0);
    });
  });

  describe("format and display", () => {
    it("defaults to metric format", () => {
      expect(tool.format).toBe("metric");
    });

    it("sets format to US", () => {
      tool.setFormat("us");
      expect(tool.format).toBe("us");
    });

    it("formats station with current format", () => {
      expect(tool.formatStation(1500)).toBe("STA 1+500.000");
      tool.setFormat("us");
      expect(tool.formatStation(100)).toMatch(/^STA /);
    });
  });

  describe("export", () => {
    beforeEach(() => {
      tool.detectAlignments();
    });

    it("exports JSON with alignment data", () => {
      const json = tool.exportJSON();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].name).toBe("Main Road Alignment");
      expect(parsed[0].formattedTotalLength).toBeDefined();
    });

    it("exports CSV for active alignment", () => {
      const csv = tool.exportCSV();
      expect(csv).toContain("Station,Formatted Station,X,Y,Z,Entity ID");
      const lines = csv.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("exports all alignments as CSV", () => {
      const csv = tool.exportAllCSV();
      expect(csv).toContain("Alignment ID,Alignment Name");
    });

    it("returns empty CSV when no active alignment", () => {
      tool.clearAll();
      expect(tool.exportCSV()).toBe("");
    });
  });

  describe("lifecycle", () => {
    it("clears all alignments", () => {
      tool.detectAlignments();
      tool.clearAll();
      expect(tool.alignments.length).toBe(0);
      expect(tool.activeAlignment).toBeNull();
    });

    it("destroys tool", () => {
      tool.detectAlignments();
      tool.destroy();
      expect(tool.alignments.length).toBe(0);
    });
  });
});
