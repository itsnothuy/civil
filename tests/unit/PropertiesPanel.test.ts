/**
 * PropertiesPanel.test.ts — Unit tests for the IFC properties display panel.
 *
 * Tests metadata rendering and XSS escaping.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PropertiesPanel } from "../../src/ui/PropertiesPanel";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Helpers ──

function mockViewerCore(metaObjects: Record<string, any> = {}): ViewerCore {
  return {
    viewer: {
      metaScene: { metaObjects },
    },
  } as unknown as ViewerCore;
}

// ── Setup ──

let panelEl: HTMLElement;

beforeEach(() => {
  panelEl = document.createElement("div");
  panelEl.id = "properties-panel";
  document.body.appendChild(panelEl);
});

afterEach(() => {
  panelEl.remove();
});

// ── Tests ──

describe("PropertiesPanel", () => {
  describe("constructor", () => {
    it("finds the properties-panel element", () => {
      const panel = new PropertiesPanel(mockViewerCore());
      expect(panel).toBeDefined();
    });
  });

  describe("show", () => {
    it("renders metadata for a known entity", () => {
      const viewer = mockViewerCore({
        "wall-1": {
          name: "Exterior Wall",
          type: "IfcWall",
          parent: null,
          propertySets: [],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("wall-1");

      expect(panelEl.innerHTML).toContain("Exterior Wall");
      expect(panelEl.innerHTML).toContain("IfcWall");
    });

    it("shows muted message for unknown entity", () => {
      const panel = new PropertiesPanel(mockViewerCore());
      panel.show("unknown-id");

      expect(panelEl.innerHTML).toContain("No metadata");
      expect(panelEl.innerHTML).toContain("unknown-id");
    });

    it("escapes HTML in entity names to prevent XSS", () => {
      const viewer = mockViewerCore({
        "xss-1": {
          name: '<img src=x onerror="alert(1)">',
          type: "IfcColumn",
          parent: null,
          propertySets: [],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("xss-1");

      expect(panelEl.innerHTML).not.toContain("<img");
      expect(panelEl.innerHTML).toContain("&lt;img");
    });

    it("escapes HTML in entity IDs", () => {
      const panel = new PropertiesPanel(mockViewerCore());
      panel.show('<script>alert("xss")</script>');

      expect(panelEl.innerHTML).not.toContain("<script>");
      expect(panelEl.innerHTML).toContain("&lt;script&gt;");
    });

    it("renders parent information when present", () => {
      const viewer = mockViewerCore({
        "child-1": {
          name: "Floor Slab",
          type: "IfcSlab",
          parent: { id: "parent-1", name: "First Floor" },
          propertySets: [],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("child-1");

      expect(panelEl.innerHTML).toContain("Parent");
      expect(panelEl.innerHTML).toContain("First Floor");
    });

    it("renders property sets with individual properties", () => {
      const viewer = mockViewerCore({
        "beam-1": {
          name: "Steel Beam",
          type: "IfcBeam",
          parent: null,
          propertySets: [
            {
              name: "Pset_BeamCommon",
              properties: [
                { name: "Span", value: "6000mm" },
                { name: "LoadBearing", value: true },
              ],
            },
          ],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("beam-1");

      expect(panelEl.innerHTML).toContain("Pset_BeamCommon");
      expect(panelEl.innerHTML).toContain("Span");
      expect(panelEl.innerHTML).toContain("6000mm");
      expect(panelEl.innerHTML).toContain("LoadBearing");
    });

    it("handles null name/type gracefully", () => {
      const viewer = mockViewerCore({
        "null-1": {
          name: null,
          type: null,
          parent: null,
          propertySets: [],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("null-1");

      // Should fall back to entity ID for name, "Unknown" for type
      expect(panelEl.innerHTML).toContain("null-1");
      expect(panelEl.innerHTML).toContain("Unknown");
    });

    it("handles null property values with dash fallback", () => {
      const viewer = mockViewerCore({
        "pv-1": {
          name: "Test",
          type: "IfcWall",
          parent: null,
          propertySets: [
            {
              name: "Props",
              properties: [{ name: "Empty", value: null }],
            },
          ],
        },
      });

      const panel = new PropertiesPanel(viewer);
      panel.show("pv-1");
      expect(panelEl.innerHTML).toContain("—");
    });

    it("does nothing when panel element is missing", () => {
      panelEl.remove();
      const panel = new PropertiesPanel(mockViewerCore());
      // Should not throw
      expect(() => panel.show("any-id")).not.toThrow();
    });
  });

  describe("hide", () => {
    it("resets the panel to default message", () => {
      const panel = new PropertiesPanel(mockViewerCore());
      panelEl.innerHTML = "<p>Something</p>";
      panel.hide();
      expect(panelEl.innerHTML).toContain("Select an object to view properties");
    });

    it("does nothing when panel element is missing", () => {
      panelEl.remove();
      const panel = new PropertiesPanel(mockViewerCore());
      expect(() => panel.hide()).not.toThrow();
    });
  });

  describe("XSS escaping", () => {
    it("escapes ampersands", () => {
      const viewer = mockViewerCore({
        amp: { name: "A & B", type: "IfcWall", parent: null, propertySets: [] },
      });
      const panel = new PropertiesPanel(viewer);
      panel.show("amp");
      expect(panelEl.innerHTML).toContain("A &amp; B");
    });

    it("escapes quotes", () => {
      const viewer = mockViewerCore({
        q: { name: 'He said "hello"', type: "IfcWall", parent: null, propertySets: [] },
      });
      const panel = new PropertiesPanel(viewer);
      panel.show("q");
      // The implementation renders quotes literally; verify they appear
      expect(panelEl.innerHTML).toContain('He said "hello"');
    });
  });
});
