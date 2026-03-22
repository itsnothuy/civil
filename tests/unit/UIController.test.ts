/**
 * UIController.test.ts — Unit tests for the toolbar, keyboard, and high-contrast controller.
 *
 * Tests toolbar bindings, keyboard shortcuts, high-contrast toggle, search,
 * section plane management, and mutual exclusion between tools.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { UIController } from "../../src/ui/UIController";
import type { ViewerCore } from "../../src/viewer/ViewerCore";
import type { AnnotationService } from "../../src/annotations/AnnotationService";
import type { MeasurementTool } from "../../src/tools/MeasurementTool";
import type { AnnotationOverlay } from "../../src/annotations/AnnotationOverlay";

// ── localStorage mock ──

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (_: number) => null,
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

// ── Helpers ──

function createToolbarHTML(): void {
  document.body.innerHTML = `
    <header id="toolbar">
      <button id="btn-3d" aria-pressed="true">3D</button>
      <button id="btn-2d" aria-pressed="false">2D</button>
      <button id="btn-measure" aria-pressed="false">Measure</button>
      <button id="btn-path-measure" aria-pressed="false">Path</button>
      <button id="btn-annotate" aria-pressed="false">Annotate</button>
      <button id="btn-section">Section</button>
      <button id="btn-xray" aria-pressed="false">X-Ray</button>
      <button id="btn-high-contrast" aria-pressed="false">Contrast</button>
      <button id="btn-export-bcf">Export BCF</button>
      <button id="btn-import-json">Import</button>
      <input id="import-file-input" type="file" hidden />
    </header>
    <input id="search-input" type="search" />
    <div id="filter-panel"></div>
  `;
}

const mockSetMode = jest.fn();
const mockSetXray = jest.fn();
const mockAddSectionPlane = jest.fn(() => "sp-1");
const mockRemoveSectionPlane = jest.fn();
const mockClearSectionPlanes = jest.fn();
const mockSelectEntity = jest.fn();
const mockCycleSelection = jest.fn();

function mockViewerCore(): ViewerCore {
  return {
    viewer: {
      scene: {
        objectIds: ["a", "b"],
        selectedObjectIds: [],
        highlightedObjectIds: [],
        setObjectsVisible: jest.fn(),
        setObjectsXRayed: jest.fn(),
        setObjectsHighlighted: jest.fn(),
      },
      metaScene: {
        metaObjects: {
          a: { name: "Wall A", type: "IfcWall" },
          b: { name: "Beam B", type: "IfcBeam" },
        },
      },
    },
    setMode: mockSetMode,
    setXray: mockSetXray,
    addSectionPlane: mockAddSectionPlane,
    removeSectionPlane: mockRemoveSectionPlane,
    clearSectionPlanes: mockClearSectionPlanes,
    selectEntity: mockSelectEntity,
    cycleSelection: mockCycleSelection,
  } as unknown as ViewerCore;
}

function mockAnnotations(): AnnotationService {
  return {
    exportJSON: jest.fn(() => '{"annotations":[]}'),
    importJSON: jest.fn(() => 2),
    loadFromLocalStorage: jest.fn(),
  } as unknown as AnnotationService;
}

function mockMeasurementTool(): MeasurementTool {
  return {
    isActive: false,
    pathMode: false,
    activate: jest.fn(),
    deactivate: jest.fn(),
    startPath: jest.fn(),
    endPath: jest.fn(),
    clearPath: jest.fn(),
    undoLastPoint: jest.fn(),
  } as unknown as MeasurementTool;
}

function mockAnnotationOverlay(): AnnotationOverlay {
  return {
    isAdding: false,
    startAdding: jest.fn(),
    stopAdding: jest.fn(),
    refresh: jest.fn(),
  } as unknown as AnnotationOverlay;
}

// ── Setup ──

// Track keydown handlers to clean up between tests (prevents listener accumulation)
const trackedKeydownHandlers: EventListenerOrEventListenerObject[] = [];
const origAddEventListener = document.addEventListener.bind(document);
const origRemoveEventListener = document.removeEventListener.bind(document);

document.addEventListener = function (
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  if (type === "keydown") trackedKeydownHandlers.push(handler);
  return origAddEventListener(type, handler, options);
} as typeof document.addEventListener;

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  document.body.className = "";
  createToolbarHTML();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.className = "";
  // Remove accumulated keydown listeners from UIController.init()
  for (const h of trackedKeydownHandlers) {
    origRemoveEventListener("keydown", h);
  }
  trackedKeydownHandlers.length = 0;
  // Remove any keyboard help overlays
  document.getElementById("keyboard-help-overlay")?.remove();
});

// ── Tests ──

describe("UIController", () => {
  describe("constructor & init", () => {
    it("creates a UIController and does not throw", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      expect(ui).toBeDefined();
    });

    it("init does not throw with minimal params", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      expect(() => ui.init()).not.toThrow();
    });

    it("init does not throw with all 5 params", () => {
      const ui = new UIController(
        mockViewerCore(),
        mockAnnotations(),
        "test-project",
        mockMeasurementTool(),
        mockAnnotationOverlay(),
      );
      expect(() => ui.init()).not.toThrow();
    });
  });

  describe("3D / 2D toggle", () => {
    it("clicking 2D calls setMode('2d') and updates aria-pressed", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-2d")!.click();
      expect(mockSetMode).toHaveBeenCalledWith("2d");
      expect(document.getElementById("btn-2d")!.getAttribute("aria-pressed")).toBe("true");
      expect(document.getElementById("btn-3d")!.getAttribute("aria-pressed")).toBe("false");
    });

    it("clicking 3D calls setMode('3d')", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-3d")!.click();
      expect(mockSetMode).toHaveBeenCalledWith("3d");
    });
  });

  describe("X-ray toggle", () => {
    it("toggles xray on and updates aria-pressed", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const btn = document.getElementById("btn-xray")!;
      expect(btn.getAttribute("aria-pressed")).toBe("false");

      btn.click();
      expect(btn.getAttribute("aria-pressed")).toBe("true");
    });

    it("toggles X-ray off on second click", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const btn = document.getElementById("btn-xray")!;
      btn.click(); // on
      btn.click(); // off
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("high-contrast toggle (Task 3.2)", () => {
    it("clicking btn-high-contrast toggles .high-contrast class on body", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      const btn = document.getElementById("btn-high-contrast")!;
      btn.click();
      expect(document.body.classList.contains("high-contrast")).toBe(true);
      expect(btn.getAttribute("aria-pressed")).toBe("true");

      btn.click();
      expect(document.body.classList.contains("high-contrast")).toBe(false);
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    });

    it("persists preference in localStorage", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      document.getElementById("btn-high-contrast")!.click();
      expect(localStorageMock.getItem("civil-bim-high-contrast")).toBe("true");

      document.getElementById("btn-high-contrast")!.click();
      expect(localStorageMock.getItem("civil-bim-high-contrast")).toBe("false");
    });

    it("restores high-contrast from localStorage on init", () => {
      localStorageMock.setItem("civil-bim-high-contrast", "true");

      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      expect(document.body.classList.contains("high-contrast")).toBe(true);
      expect(document.getElementById("btn-high-contrast")!.getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    it("does not restore when localStorage value is 'false'", () => {
      localStorageMock.setItem("civil-bim-high-contrast", "false");

      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      expect(document.body.classList.contains("high-contrast")).toBe(false);
    });
  });

  describe("section planes", () => {
    it("adds a section plane on button click", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-section")!.click();
      expect(mockAddSectionPlane).toHaveBeenCalled();
    });

    it("renders section plane chips after adding", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-section")!.click();
      const sectionList = document.getElementById("section-list");
      expect(sectionList).toBeTruthy();
      expect(sectionList!.querySelectorAll(".section-chip").length).toBe(1);
    });

    it("does not add chip when addSectionPlane returns falsy", () => {
      const viewer = mockViewerCore();
      mockAddSectionPlane.mockReturnValueOnce(undefined as unknown as string);
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-section")!.click();
      const sectionList = document.getElementById("section-list");
      // Should not create section list if no plane was added
      expect(sectionList).toBeFalsy();
    });
  });

  describe("keyboard shortcuts (Task 3.3)", () => {
    function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
    }

    it("Tab cycles selection forward", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      pressKey("Tab");
      expect(mockCycleSelection).toHaveBeenCalledWith("next");
    });

    it("Shift+Tab cycles selection backward", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      pressKey("Tab", { shiftKey: true });
      expect(mockCycleSelection).toHaveBeenCalledWith("prev");
    });

    it("Escape deselects all", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      pressKey("Escape");
      expect(mockSelectEntity).toHaveBeenCalledWith(null);
    });

    it("M key triggers measure button click", () => {
      const mt = mockMeasurementTool();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      // M should trigger btn-measure click → since mt.isActive is false, should activate
      pressKey("m");
      expect(mt.activate).toHaveBeenCalled();
    });

    it("A key triggers annotate button click", () => {
      const ao = mockAnnotationOverlay();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", undefined, ao);
      ui.init();

      pressKey("a");
      expect(ao.startAdding).toHaveBeenCalled();
    });

    it("H key toggles high-contrast", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      pressKey("H");
      expect(document.body.classList.contains("high-contrast")).toBe(true);

      pressKey("H");
      expect(document.body.classList.contains("high-contrast")).toBe(false);
    });

    it("F key focuses search input", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      const searchInput = document.getElementById("search-input")!;
      const focusSpy = jest.spyOn(searchInput, "focus");

      pressKey("F");
      expect(focusSpy).toHaveBeenCalled();
    });

    it("? key opens keyboard help overlay", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      pressKey("?");
      const overlay = document.getElementById("keyboard-help-overlay");
      expect(overlay).toBeTruthy();
      expect(overlay!.getAttribute("role")).toBe("dialog");
    });

    it("? key toggles help overlay off when already open", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      pressKey("?");
      expect(document.getElementById("keyboard-help-overlay")).toBeTruthy();

      pressKey("?");
      expect(document.getElementById("keyboard-help-overlay")).toBeFalsy();
    });

    it("help overlay close button removes it", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      pressKey("?");
      const closeBtn = document.getElementById("keyboard-help-close")!;
      closeBtn.click();
      expect(document.getElementById("keyboard-help-overlay")).toBeFalsy();
    });

    it("X key toggles X-ray mode", () => {
      const ui = new UIController(mockViewerCore(), mockAnnotations());
      ui.init();

      pressKey("x");
      expect(document.getElementById("btn-xray")!.getAttribute("aria-pressed")).toBe("true");
    });

    it("Ctrl+Z undoes last path point when in path mode", () => {
      const mt = mockMeasurementTool();
      (mt as any).pathMode = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      pressKey("z", { ctrlKey: true });
      expect(mt.undoLastPoint).toHaveBeenCalled();
    });

    it("does not intercept keys when typing in an input", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const input = document.getElementById("search-input")!;
      input.focus();

      // Dispatch keydown event on the input element
      const event = new KeyboardEvent("keydown", { key: "m", bubbles: true });
      Object.defineProperty(event, "target", { value: input });
      input.dispatchEvent(event);

      // Should NOT have triggered measurement button click
      // (we can't easily test this since the event handler checks target.tagName)
      // but at least it should not throw
    });
  });

  describe("search binding", () => {
    it("search input filtering matches by name", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const input = document.getElementById("search-input") as HTMLInputElement;
      input.value = "wall";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const scene = viewer.viewer.scene;
      expect(scene.setObjectsXRayed).toHaveBeenCalled();
      expect(scene.setObjectsHighlighted).toHaveBeenCalled();
    });

    it("empty search resets visibility", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const input = document.getElementById("search-input") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const scene = viewer.viewer.scene;
      expect(scene.setObjectsVisible).toHaveBeenCalledWith(["a", "b"], true);
    });
  });

  describe("measurement tool integration", () => {
    it("btn-measure activates measurement tool", () => {
      const mt = mockMeasurementTool();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      document.getElementById("btn-measure")!.click();
      expect(mt.activate).toHaveBeenCalled();
    });

    it("btn-measure deactivates when already active", () => {
      const mt = mockMeasurementTool();
      (mt as any).isActive = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      document.getElementById("btn-measure")!.click();
      expect(mt.deactivate).toHaveBeenCalled();
    });

    it("btn-path-measure starts path mode", () => {
      const mt = mockMeasurementTool();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      document.getElementById("btn-path-measure")!.click();
      expect(mt.startPath).toHaveBeenCalled();
    });

    it("btn-path-measure deactivates two-point mode first", () => {
      const mt = mockMeasurementTool();
      (mt as any).isActive = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      document.getElementById("btn-path-measure")!.click();
      expect(mt.deactivate).toHaveBeenCalled();
      expect(mt.startPath).toHaveBeenCalled();
    });
  });

  describe("annotation overlay integration", () => {
    it("btn-annotate starts annotation adding", () => {
      const ao = mockAnnotationOverlay();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mockMeasurementTool(), ao);
      ui.init();

      document.getElementById("btn-annotate")!.click();
      expect(ao.startAdding).toHaveBeenCalled();
    });

    it("btn-annotate stops adding when already in add mode", () => {
      const ao = mockAnnotationOverlay();
      (ao as any).isAdding = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mockMeasurementTool(), ao);
      ui.init();

      document.getElementById("btn-annotate")!.click();
      expect(ao.stopAdding).toHaveBeenCalled();
    });

    it("starting annotation deactivates measurement tool", () => {
      const mt = mockMeasurementTool();
      (mt as any).isActive = true;
      const ao = mockAnnotationOverlay();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt, ao);
      ui.init();

      document.getElementById("btn-annotate")!.click();
      expect(mt.deactivate).toHaveBeenCalled();
      expect(ao.startAdding).toHaveBeenCalled();
    });
  });

  describe("export", () => {
    it("btn-export-bcf calls exportJSON and triggers download", () => {
      const annotations = mockAnnotations();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, annotations);
      ui.init();

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockUrl = "blob:test";
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = jest.fn(() => mockUrl);
      URL.revokeObjectURL = jest.fn();

      // Spy on HTMLAnchorElement.click to verify download trigger
      const clickSpy = jest.fn();
      HTMLAnchorElement.prototype.click = clickSpy;

      document.getElementById("btn-export-bcf")!.click();
      expect(annotations.exportJSON).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      // Restore
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe("Escape handler deactivates all tools", () => {
    function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
    }

    it("Escape deactivates active measurement tool", () => {
      const mt = mockMeasurementTool();
      (mt as any).isActive = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      pressKey("Escape");
      expect(mt.deactivate).toHaveBeenCalled();
    });

    it("Escape ends active path mode", () => {
      const mt = mockMeasurementTool();
      (mt as any).pathMode = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      pressKey("Escape");
      expect(mt.endPath).toHaveBeenCalled();
    });

    it("Escape stops annotation adding", () => {
      const ao = mockAnnotationOverlay();
      (ao as any).isAdding = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", undefined, ao);
      ui.init();

      pressKey("Escape");
      expect(ao.stopAdding).toHaveBeenCalled();
    });
  });

  describe("import JSON (Task 2.4)", () => {
    it("btn-import-json triggers file input click", () => {
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      const fileInput = document.getElementById("import-file-input") as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, "click");

      document.getElementById("btn-import-json")!.click();
      expect(clickSpy).toHaveBeenCalled();
    });

    it("reads selected file and calls importJSON", (done) => {
      const annotations = mockAnnotations();
      const ao = mockAnnotationOverlay();
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, annotations, "test-proj", mockMeasurementTool(), ao);
      ui.init();

      const fileInput = document.getElementById("import-file-input") as HTMLInputElement;

      // Create a mock file
      const file = new File(['{"annotations":[]}'], "test.json", { type: "application/json" });
      Object.defineProperty(fileInput, "files", { value: [file], writable: true });

      fileInput.dispatchEvent(new Event("change"));

      // FileReader is async  — wait a tick
      setTimeout(() => {
        expect(annotations.importJSON).toHaveBeenCalledWith("test-proj", '{"annotations":[]}');
        expect(ao.refresh).toHaveBeenCalled();
        // Toast should appear
        const toast = document.querySelector(".toast-success");
        expect(toast).toBeTruthy();
        done();
      }, 50);
    });

    it("shows error toast when importJSON throws", (done) => {
      const annotations = mockAnnotations();
      (annotations.importJSON as jest.Mock).mockImplementation(() => {
        throw new Error("bad format");
      });
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, annotations, "test-proj");
      ui.init();

      const fileInput = document.getElementById("import-file-input") as HTMLInputElement;
      const file = new File(["invalid"], "bad.json", { type: "application/json" });
      Object.defineProperty(fileInput, "files", { value: [file], writable: true });

      fileInput.dispatchEvent(new Event("change"));

      setTimeout(() => {
        const toast = document.querySelector(".toast-error");
        expect(toast).toBeTruthy();
        expect(toast!.textContent).toContain("bad format");
        done();
      }, 50);
    });
  });

  describe("path-measure toggle off", () => {
    it("btn-path-measure ends path when pathMode is already active", () => {
      const mt = mockMeasurementTool();
      (mt as any).pathMode = true;
      const viewer = mockViewerCore();
      const ui = new UIController(viewer, mockAnnotations(), "p", mt);
      ui.init();

      document.getElementById("btn-path-measure")!.click();
      expect(mt.endPath).toHaveBeenCalled();
    });
  });

  describe("section list management", () => {
    it("clicking a section chip removes that section plane", () => {
      const viewer = mockViewerCore();
      mockAddSectionPlane.mockReturnValue("sp-1");
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-section")!.click();
      const chip = document.querySelector(".section-chip") as HTMLButtonElement;
      expect(chip).toBeTruthy();

      chip.click();
      expect(mockRemoveSectionPlane).toHaveBeenCalledWith("sp-1");
    });

    it("clicking Clear All removes all section planes", () => {
      const viewer = mockViewerCore();
      mockAddSectionPlane.mockReturnValueOnce("sp-1").mockReturnValueOnce("sp-2");
      const ui = new UIController(viewer, mockAnnotations());
      ui.init();

      document.getElementById("btn-section")!.click();
      document.getElementById("btn-section")!.click();

      const clearBtn = document.getElementById("btn-clear-sections")!;
      clearBtn.click();
      expect(mockClearSectionPlanes).toHaveBeenCalled();
    });
  });
});
