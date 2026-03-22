/**
 * TreeView.test.ts — Unit tests for the model hierarchy tree wrapper.
 *
 * xeokit TreeViewPlugin is fully mocked.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mock state ──

const treeViewHandlers: Record<string, (...args: any[]) => void> = {};
const mockTvOn = jest.fn((event: string, cb: (...args: any[]) => void) => {
  treeViewHandlers[event] = cb;
});
const mockTvDestroy = jest.fn();
const mockTvShowNode = jest.fn();
const mockTvCollapse = jest.fn();
const mockTvExpandToDepth = jest.fn();
let mockTvHierarchy = "containment";

jest.mock("@xeokit/xeokit-sdk", () => ({
  TreeViewPlugin: jest.fn().mockImplementation(() => ({
    on: mockTvOn,
    destroy: mockTvDestroy,
    showNode: mockTvShowNode,
    collapse: mockTvCollapse,
    expandToDepth: mockTvExpandToDepth,
    get hierarchy() {
      return mockTvHierarchy;
    },
    set hierarchy(val: string) {
      mockTvHierarchy = val;
    },
  })),
}));

import { TreeView } from "../../src/ui/TreeView";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Helpers ──

const mockSelectEntity = jest.fn();
const mockFlyTo = jest.fn();
const mockSetObjectsXRayed = jest.fn();
const mockSetObjectsHighlighted = jest.fn();
const mockSetObjectsVisible = jest.fn();

function mockViewerCore(): ViewerCore {
  return {
    viewer: {
      scene: {
        objects: {
          "obj-1": { aabb: [0, 0, 0, 1, 1, 1] },
          "obj-2": { aabb: [0, 0, 0, 2, 2, 2] },
        },
        objectIds: ["obj-1", "obj-2"],
        highlightedObjectIds: [],
        setObjectsXRayed: mockSetObjectsXRayed,
        setObjectsHighlighted: mockSetObjectsHighlighted,
        setObjectsVisible: mockSetObjectsVisible,
      },
      cameraFlight: { flyTo: mockFlyTo },
    },
    selectEntity: mockSelectEntity,
  } as unknown as ViewerCore;
}

// ── Setup ──

let treeContainer: HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(treeViewHandlers).forEach((k) => delete treeViewHandlers[k]);
  mockTvHierarchy = "containment";

  treeContainer = document.createElement("div");
  treeContainer.id = "tree-view";
  document.body.appendChild(treeContainer);
});

afterEach(() => {
  treeContainer.remove();
  // Remove any context menus
  document.querySelectorAll(".tree-context-menu").forEach((el) => el.remove());
});

// ── Tests ──

describe("TreeView", () => {
  describe("constructor", () => {
    it("creates a TreeViewPlugin with correct config", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      expect(tv).toBeDefined();
      expect(mockTvOn).toHaveBeenCalledWith("nodeTitleClicked", expect.any(Function));
    });

    it("creates a context menu element in the DOM", () => {
      new TreeView(mockViewerCore(), "tree-view");
      const menu = document.querySelector(".tree-context-menu");
      expect(menu).toBeTruthy();
      expect(menu!.querySelectorAll("button")).toHaveLength(3);
    });
  });

  describe("nodeTitleClicked", () => {
    it("selects entity via ViewerCore and flies camera to it", () => {
      const viewer = mockViewerCore();
      new TreeView(viewer, "tree-view");

      const handler = treeViewHandlers["nodeTitleClicked"];
      expect(handler).toBeDefined();

      handler({ treeViewNode: { objectId: "obj-1" } });

      expect(mockSelectEntity).toHaveBeenCalledWith("obj-1");
      expect(mockFlyTo).toHaveBeenCalledWith(expect.objectContaining({ aabb: [0, 0, 0, 1, 1, 1] }));
    });

    it("does nothing for non-existent objects", () => {
      const viewer = mockViewerCore();
      new TreeView(viewer, "tree-view");

      treeViewHandlers["nodeTitleClicked"]({ treeViewNode: { objectId: "non-existent" } });

      expect(mockSelectEntity).not.toHaveBeenCalled();
    });
  });

  describe("context menu", () => {
    it("show-all action makes all objects visible", () => {
      const viewer = mockViewerCore();
      new TreeView(viewer, "tree-view");

      const menu = document.querySelector(".tree-context-menu")!;
      const showAllBtn = menu.querySelector('[data-action="show-all"]') as HTMLElement;

      // Simulate a right-click to set targetObjectId
      const link = document.createElement("a");
      link.dataset.treenodeid = "obj-1";
      treeContainer.appendChild(link);

      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      link.dispatchEvent(contextEvent);

      // Now click show-all
      showAllBtn.click();

      expect(mockSetObjectsVisible).toHaveBeenCalledWith(["obj-1", "obj-2"], true);
      expect(mockSetObjectsXRayed).toHaveBeenCalledWith(["obj-1", "obj-2"], false);
    });

    it("isolate action x-rays everything except target", () => {
      const viewer = mockViewerCore();
      new TreeView(viewer, "tree-view");

      const menu = document.querySelector(".tree-context-menu")!;
      const isolateBtn = menu.querySelector('[data-action="isolate"]') as HTMLElement;

      const link = document.createElement("a");
      link.dataset.treenodeid = "obj-1";
      treeContainer.appendChild(link);

      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
      });
      link.dispatchEvent(contextEvent);

      isolateBtn.click();

      expect(mockSetObjectsXRayed).toHaveBeenCalledWith(["obj-1", "obj-2"], true);
      expect(mockSetObjectsXRayed).toHaveBeenCalledWith(["obj-1"], false);
      expect(mockSetObjectsHighlighted).toHaveBeenCalledWith(["obj-1"], true);
    });

    it("hide action hides the target object", () => {
      const viewer = mockViewerCore();
      new TreeView(viewer, "tree-view");

      const menu = document.querySelector(".tree-context-menu")!;
      const hideBtn = menu.querySelector('[data-action="hide"]') as HTMLElement;

      const link = document.createElement("a");
      link.dataset.treenodeid = "obj-2";
      treeContainer.appendChild(link);

      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      });
      link.dispatchEvent(contextEvent);

      hideBtn.click();

      expect(mockSetObjectsVisible).toHaveBeenCalledWith(["obj-2"], false);
    });

    it("hides menu when right-clicking on non-node area", () => {
      new TreeView(mockViewerCore(), "tree-view");
      const menu = document.querySelector(".tree-context-menu") as HTMLElement;

      // Right-click on container, not on a link
      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
      });
      treeContainer.dispatchEvent(contextEvent);

      expect(menu.style.display).toBe("none");
    });

    it("ignores right-click on link with missing treenodeid", () => {
      new TreeView(mockViewerCore(), "tree-view");

      // Add a link WITHOUT data-treenodeid
      const badLink = document.createElement("a");
      treeContainer.appendChild(badLink);

      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
      });
      badLink.dispatchEvent(contextEvent);

      // Menu should not show
      const menu = document.querySelector(".tree-context-menu") as HTMLElement;
      expect(menu.style.display).not.toBe("block");
    });

    it("ignores right-click on link for non-existent scene object", () => {
      new TreeView(mockViewerCore(), "tree-view");

      const link = document.createElement("a");
      link.dataset.treenodeid = "non-existent";
      treeContainer.appendChild(link);

      const contextEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 50,
        clientY: 50,
      });
      link.dispatchEvent(contextEvent);

      const menu = document.querySelector(".tree-context-menu") as HTMLElement;
      expect(menu.style.display).not.toBe("block");
    });

    it("hides menu when clicking elsewhere on document", () => {
      new TreeView(mockViewerCore(), "tree-view");

      const menu = document.querySelector(".tree-context-menu") as HTMLElement;

      // Open menu first
      const link = document.createElement("a");
      link.dataset.treenodeid = "obj-1";
      treeContainer.appendChild(link);
      link.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: 50, clientY: 50 }),
      );
      expect(menu.style.display).toBe("block");

      // Click elsewhere
      document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(menu.style.display).toBe("none");
    });
  });

  describe("public API", () => {
    it("showNode delegates to TreeViewPlugin", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      tv.showNode("obj-1");
      expect(mockTvShowNode).toHaveBeenCalledWith("obj-1");
    });

    it("collapse delegates to TreeViewPlugin", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      tv.collapse();
      expect(mockTvCollapse).toHaveBeenCalled();
    });

    it("expandToDepth delegates to TreeViewPlugin", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      tv.expandToDepth(3);
      expect(mockTvExpandToDepth).toHaveBeenCalledWith(3);
    });

    it("setHierarchy changes the tree mode", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      tv.setHierarchy("storeys");
      expect(tv.plugin.hierarchy).toBe("storeys");
    });

    it("plugin getter returns the underlying TreeViewPlugin", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      expect(tv.plugin).toBeDefined();
      expect(tv.plugin.on).toBe(mockTvOn);
    });
  });

  describe("destroy", () => {
    it("removes context menu and destroys plugin", () => {
      const tv = new TreeView(mockViewerCore(), "tree-view");
      const menu = document.querySelector(".tree-context-menu");
      expect(menu).toBeTruthy();

      tv.destroy();

      expect(mockTvDestroy).toHaveBeenCalled();
      expect(document.querySelector(".tree-context-menu")).toBeNull();
    });
  });
});
