/**
 * FilterPanel.test.ts — Unit tests for the layer/discipline filtering panel.
 *
 * Tests discipline mapping, group building, visibility toggling, X-ray mode, and DOM rendering.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { FilterPanel, getDiscipline } from "../../src/ui/FilterPanel";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Helpers ──

const mockSetObjectsVisible = jest.fn();
const mockSetObjectsXRayed = jest.fn();

function mockViewerCore(metaObjects: Record<string, any> = {}): ViewerCore {
  const sceneObjects: Record<string, any> = {};
  for (const id of Object.keys(metaObjects)) {
    sceneObjects[id] = { id, visible: true };
  }

  return {
    viewer: {
      metaScene: { metaObjects },
      scene: {
        objects: sceneObjects,
        setObjectsVisible: mockSetObjectsVisible,
        setObjectsXRayed: mockSetObjectsXRayed,
      },
    },
  } as unknown as ViewerCore;
}

/** Build a minimal metaObjects map for testing */
function sampleMetaObjects(): Record<string, any> {
  return {
    "wall-1": { type: "IfcWall" },
    "wall-2": { type: "IfcWallStandardCase" },
    "beam-1": { type: "IfcBeam" },
    "column-1": { type: "IfcColumn" },
    "pipe-1": { type: "IfcPipeSegment" },
    "pipe-2": { type: "IfcPipeFitting" },
    "duct-1": { type: "IfcDuctSegment" },
    "cable-1": { type: "IfcCableSegment" },
    "door-1": { type: "IfcDoor" },
    "window-1": { type: "IfcWindow" },
    "unknown-1": { type: "SomeCustomType" },
    "null-type": { type: null },
  };
}

// ── Setup ──

let container: HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement("div");
  container.id = "filter-panel";
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

// ── Tests ──

describe("getDiscipline", () => {
  it("maps IfcWall to Structural", () => {
    expect(getDiscipline("IfcWall")).toBe("Structural");
  });

  it("maps IfcBeam to Structural", () => {
    expect(getDiscipline("IfcBeam")).toBe("Structural");
  });

  it("maps IfcColumn to Structural", () => {
    expect(getDiscipline("IfcColumn")).toBe("Structural");
  });

  it("maps IfcPipeSegment to Plumbing", () => {
    expect(getDiscipline("IfcPipeSegment")).toBe("Plumbing");
  });

  it("maps IfcDuctSegment to Mechanical", () => {
    expect(getDiscipline("IfcDuctSegment")).toBe("Mechanical");
  });

  it("maps IfcCableSegment to Electrical", () => {
    expect(getDiscipline("IfcCableSegment")).toBe("Electrical");
  });

  it("maps IfcDoor to Utilities", () => {
    expect(getDiscipline("IfcDoor")).toBe("Utilities");
  });

  it("maps IfcWindow to Utilities", () => {
    expect(getDiscipline("IfcWindow")).toBe("Utilities");
  });

  it('returns "Other" for unknown IFC types', () => {
    expect(getDiscipline("SomeCustomType")).toBe("Other");
  });

  it('returns "Other" for empty string', () => {
    expect(getDiscipline("")).toBe("Other");
  });
});

describe("FilterPanel", () => {
  describe("constructor", () => {
    it("creates a FilterPanel instance", () => {
      const fp = new FilterPanel(mockViewerCore(), "filter-panel");
      expect(fp).toBeDefined();
    });
  });

  describe("init", () => {
    it("builds discipline groups from metaScene", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const groups = fp.groups;
      expect(groups.size).toBeGreaterThanOrEqual(5); // Structural, Plumbing, Mechanical, Electrical, Utilities, Other
    });

    it("renders HTML into the container", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      expect(container.innerHTML).toContain("Disciplines");
      expect(container.innerHTML).toContain("Show All");
      expect(container.innerHTML).toContain("Hide All");
    });

    it("renders checkboxes for each discipline group", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const checkboxes = container.querySelectorAll("input[data-filter-group]");
      expect(checkboxes.length).toBe(fp.groups.size);
    });

    it("handles empty metaScene gracefully", () => {
      const viewer = mockViewerCore({});
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();
      expect(fp.groups.size).toBe(0);
    });
  });

  describe("groups", () => {
    it("returns a ReadonlyMap of DisciplineGroup objects", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const structural = fp.groups.get("Structural");
      expect(structural).toBeDefined();
      expect(structural!.name).toBe("Structural");
      expect(structural!.visible).toBe(true);
      expect(structural!.objectIds.length).toBeGreaterThanOrEqual(3); // wall-1, wall-2, beam-1, column-1
      expect(structural!.ifcTypes).toContain("IfcWall");
    });

    it("groups Plumbing objects correctly", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const plumbing = fp.groups.get("Plumbing");
      expect(plumbing).toBeDefined();
      expect(plumbing!.objectIds).toContain("pipe-1");
      expect(plumbing!.objectIds).toContain("pipe-2");
    });

    it('groups unknown types as "Other"', () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const other = fp.groups.get("Other");
      expect(other).toBeDefined();
      expect(other!.objectIds).toContain("unknown-1");
    });

    it("handles null type as Unknown → Other", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const other = fp.groups.get("Other");
      expect(other!.objectIds).toContain("null-type");
    });
  });

  describe("toggleGroup", () => {
    it("hides a visible group", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.toggleGroup("Structural");
      const structural = fp.groups.get("Structural");
      expect(structural!.visible).toBe(false);
      expect(mockSetObjectsVisible).toHaveBeenCalled();
    });

    it("shows a hidden group", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.toggleGroup("Structural"); // hide
      fp.toggleGroup("Structural"); // show
      const structural = fp.groups.get("Structural");
      expect(structural!.visible).toBe(true);
    });

    it("does nothing for unknown group names", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      mockSetObjectsVisible.mockClear();
      fp.toggleGroup("NonExistent");
      // Should not call any scene methods (no _applyVisibility change)
      expect(mockSetObjectsVisible).not.toHaveBeenCalled();
    });
  });

  describe("setGroupVisible", () => {
    it("sets specific visibility state", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.setGroupVisible("Structural", false);
      expect(fp.groups.get("Structural")!.visible).toBe(false);

      fp.setGroupVisible("Structural", true);
      expect(fp.groups.get("Structural")!.visible).toBe(true);
    });
  });

  describe("showAll / hideAll", () => {
    it("showAll makes all groups visible", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.hideAll();
      for (const group of fp.groups.values()) {
        expect(group.visible).toBe(false);
      }

      fp.showAll();
      for (const group of fp.groups.values()) {
        expect(group.visible).toBe(true);
      }
    });

    it("hideAll hides all groups", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.hideAll();
      for (const group of fp.groups.values()) {
        expect(group.visible).toBe(false);
      }
    });

    it("showAll calls setObjectsVisible(true) for all groups", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      mockSetObjectsVisible.mockClear();
      fp.showAll();
      expect(mockSetObjectsVisible).toHaveBeenCalled();
      // Every call should have `true` as second arg
      for (const call of mockSetObjectsVisible.mock.calls) {
        expect(call[1]).toBe(true);
      }
    });
  });

  describe("X-ray mode", () => {
    it("defaults to false", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();
      expect(fp.xrayMode).toBe(false);
    });

    it("setXrayMode enables X-ray for hidden groups", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.setXrayMode(true);
      expect(fp.xrayMode).toBe(true);
    });

    it("X-ray mode makes hidden groups visible but X-rayed", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.setXrayMode(true);
      fp.toggleGroup("Structural"); // hide structural

      // Should have called setObjectsXRayed(true) for structural objects
      const xrayedCalls = mockSetObjectsXRayed.mock.calls.filter((c: any[]) => c[1] === true);
      expect(xrayedCalls.length).toBeGreaterThan(0);
    });

    it("renders X-ray checkbox as checked when enabled", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      fp.setXrayMode(true);
      const checkbox = container.querySelector(
        '[data-filter-action="xray-toggle"]',
      ) as HTMLInputElement;
      expect(checkbox?.checked).toBe(true);
    });
  });

  describe("DOM event handling", () => {
    it("toggles group visibility via checkbox change event", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const checkbox = container.querySelector(
        '[data-filter-group="Structural"]',
      ) as HTMLInputElement;
      expect(checkbox).toBeTruthy();

      // Simulate unchecking
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(fp.groups.get("Structural")!.visible).toBe(false);
    });

    it("Show All button shows all groups", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      // First hide all
      fp.hideAll();

      const btn = container.querySelector('[data-filter-action="show-all"]') as HTMLButtonElement;
      btn.click();

      for (const group of fp.groups.values()) {
        expect(group.visible).toBe(true);
      }
    });

    it("Hide All button hides all groups", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const btn = container.querySelector('[data-filter-action="hide-all"]') as HTMLButtonElement;
      btn.click();

      for (const group of fp.groups.values()) {
        expect(group.visible).toBe(false);
      }
    });

    it("X-ray toggle checkbox changes X-ray mode", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const checkbox = container.querySelector(
        '[data-filter-action="xray-toggle"]',
      ) as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(fp.xrayMode).toBe(true);
    });
  });

  describe("destroy", () => {
    it("clears the container innerHTML", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      expect(container.innerHTML).not.toBe("");
      fp.destroy();
      expect(container.innerHTML).toBe("");
    });

    it("handles missing container gracefully", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "nonexistent-panel");
      // Should not throw
      expect(() => fp.destroy()).not.toThrow();
    });
  });

  describe("rendering", () => {
    it("sorts 'Other' discipline last", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const labels = container.querySelectorAll(".filter-group");
      const lastLabel = labels[labels.length - 1];
      expect(lastLabel?.getAttribute("data-discipline")).toBe("Other");
    });

    it("shows object count per discipline", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      // Structural has 4 objects (wall-1, wall-2, beam-1, column-1)
      const structural = fp.groups.get("Structural")!;
      expect(container.innerHTML).toContain(`(${structural.objectIds.length})`);
    });

    it("does not render when container is missing", () => {
      container.remove();
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      expect(() => fp.init()).not.toThrow();
    });

    it("all checkboxes have aria-label", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const checkboxes = container.querySelectorAll("input[data-filter-group]");
      checkboxes.forEach((cb) => {
        expect(cb.getAttribute("aria-label")).toBeTruthy();
      });
    });

    it("Show All and Hide All buttons have aria-label", () => {
      const viewer = mockViewerCore(sampleMetaObjects());
      const fp = new FilterPanel(viewer, "filter-panel");
      fp.init();

      const showAll = container.querySelector('[data-filter-action="show-all"]');
      const hideAll = container.querySelector('[data-filter-action="hide-all"]');
      expect(showAll?.getAttribute("aria-label")).toBeTruthy();
      expect(hideAll?.getAttribute("aria-label")).toBeTruthy();
    });
  });
});
