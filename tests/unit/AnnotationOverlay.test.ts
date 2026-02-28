/**
 * AnnotationOverlay.test.ts — Unit tests for 3D annotation overlays.
 *
 * xeokit AnnotationsPlugin is fully mocked.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Polyfill crypto.randomUUID for jsdom ──
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== "function") {
  globalThis.crypto.randomUUID = (() => {
    let counter = 0;
    return () => `test-uuid-${++counter}`;
  })() as any;
}

// ── Mock state ──

const mockPluginCreateAnnotation = jest.fn();
const mockPluginDestroyAnnotation = jest.fn();
const mockPluginClear = jest.fn();
const mockPluginDestroy = jest.fn();
const mockPluginOn = jest.fn();
const mockPluginAnnotations: Record<string, any> = {};

const cameraControlHandlers: Record<string, (...args: any[]) => void> = {};
const mockCameraControlOn = jest.fn((event: string, cb: (...args: any[]) => void) => {
  cameraControlHandlers[event] = cb;
  return `sub-${event}`;
});
const mockCameraControlOff = jest.fn();

jest.mock("@xeokit/xeokit-sdk", () => ({
  AnnotationsPlugin: jest.fn().mockImplementation(() => ({
    createAnnotation: mockPluginCreateAnnotation,
    destroyAnnotation: mockPluginDestroyAnnotation,
    clear: mockPluginClear,
    destroy: mockPluginDestroy,
    on: mockPluginOn,
    annotations: mockPluginAnnotations,
  })),
}));

import { AnnotationOverlay } from "../../src/annotations/AnnotationOverlay";
import type { ViewerCore } from "../../src/viewer/ViewerCore";
import { AnnotationService } from "../../src/annotations/AnnotationService";

// ── Helpers ──

function mockViewerCore(): ViewerCore {
  return {
    viewer: {
      cameraControl: {
        on: mockCameraControlOn,
        off: mockCameraControlOff,
      },
    },
  } as unknown as ViewerCore;
}

// Minimal localStorage mock
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
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

// ── Tests ──

describe("AnnotationOverlay", () => {
  let overlay: AnnotationOverlay;
  let service: AnnotationService;
  let viewer: ViewerCore;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    for (const key of Object.keys(cameraControlHandlers)) {
      delete cameraControlHandlers[key];
    }
    for (const key of Object.keys(mockPluginAnnotations)) {
      delete mockPluginAnnotations[key];
    }

    // Set up DOM elements the overlay expects
    document.body.innerHTML = `
      <div id="viewer-container"></div>
      <div id="properties-panel"></div>
    `;

    viewer = mockViewerCore();
    service = new AnnotationService(viewer);
    overlay = new AnnotationOverlay(viewer, service, "test-project");
  });

  afterEach(() => {
    overlay.destroy();
    document.body.innerHTML = "";
  });

  it("initializes the AnnotationsPlugin", () => {
    const { AnnotationsPlugin } = jest.requireMock("@xeokit/xeokit-sdk");
    expect(AnnotationsPlugin).toHaveBeenCalledTimes(1);
  });

  it("registers a markerClicked handler", () => {
    expect(mockPluginOn).toHaveBeenCalledWith("markerClicked", expect.any(Function));
  });

  it("syncs existing annotations on construction", () => {
    // Create an annotation before overlay
    service.add("test-project", {
      type: "text",
      anchor: { type: "world", worldPos: [1, 2, 3] },
      author: "tester",
      comment: "Hello",
      severity: "info",
      status: "open",
    });

    // Recreate overlay to trigger sync
    const overlay2 = new AnnotationOverlay(viewer, service, "test-project");
    expect(mockPluginClear).toHaveBeenCalled();
    expect(mockPluginCreateAnnotation).toHaveBeenCalled();
    overlay2.destroy();
  });

  it("starts with isAdding = false", () => {
    expect(overlay.isAdding).toBe(false);
  });

  it("enters and exits add mode", () => {
    overlay.startAdding();
    expect(overlay.isAdding).toBe(true);
    expect(mockCameraControlOn).toHaveBeenCalledWith("picked", expect.any(Function));

    overlay.stopAdding();
    expect(overlay.isAdding).toBe(false);
  });

  it("shows form when picking in add mode", () => {
    overlay.startAdding();

    // Simulate a pick
    cameraControlHandlers["picked"]?.({
      worldPos: [5, 5, 5],
      entity: { id: "obj-1" },
    });

    const form = document.getElementById("annotation-form");
    expect(form).not.toBeNull();
    expect(form?.hidden).toBe(false);
  });

  it("hides form on cancel", () => {
    overlay.startAdding();
    cameraControlHandlers["picked"]?.({
      worldPos: [5, 5, 5],
      entity: { id: "obj-1" },
    });

    document.getElementById("ann-cancel")?.click();
    const form = document.getElementById("annotation-form");
    expect(form?.hidden).toBe(true);
  });

  it("creates annotation on save with valid comment", () => {
    overlay.startAdding();
    cameraControlHandlers["picked"]?.({
      worldPos: [10, 20, 30],
      entity: { id: "wall-1" },
    });

    // Fill the form
    const comment = document.getElementById("ann-comment") as HTMLTextAreaElement;
    comment.value = "Crack in wall";

    document.getElementById("ann-save")?.click();

    // Check annotation was added to service
    const annotations = service.list();
    expect(annotations).toHaveLength(1);
    expect(annotations[0].comment).toBe("Crack in wall");
    expect(annotations[0].anchor.objectId).toBe("wall-1");

    // Check xeokit marker was created
    expect(mockPluginCreateAnnotation).toHaveBeenCalled();
  });

  it("does not create annotation with empty comment", () => {
    overlay.startAdding();
    cameraControlHandlers["picked"]?.({
      worldPos: [1, 2, 3],
      entity: { id: "obj-1" },
    });

    // Leave comment empty and save
    document.getElementById("ann-save")?.click();
    expect(service.list()).toHaveLength(0);
  });

  it("removes annotation by id", () => {
    // Add via service
    const ann = service.add("test-project", {
      type: "text",
      anchor: { type: "world", worldPos: [0, 0, 0] },
      author: "tester",
      comment: "Test",
      severity: "info",
      status: "open",
    });
    // Simulate xeokit marker existence
    mockPluginAnnotations[`ann-${ann.id}`] = {};

    overlay.removeAnnotation(ann.id);
    expect(service.list()).toHaveLength(0);
    expect(mockPluginDestroyAnnotation).toHaveBeenCalledWith(`ann-${ann.id}`);
  });

  it("refresh re-syncs markers from service", () => {
    service.add("test-project", {
      type: "text",
      anchor: { type: "world", worldPos: [0, 0, 0] },
      author: "tester",
      comment: "A",
      severity: "warning",
      status: "open",
    });

    mockPluginClear.mockClear();
    mockPluginCreateAnnotation.mockClear();

    overlay.refresh();
    expect(mockPluginClear).toHaveBeenCalledTimes(1);
    expect(mockPluginCreateAnnotation).toHaveBeenCalledTimes(1);
  });

  it("destroy cleans up form and plugin", () => {
    overlay.destroy();
    expect(mockPluginClear).toHaveBeenCalled();
    expect(mockPluginDestroy).toHaveBeenCalled();
    // Form element should be removed
    expect(document.getElementById("annotation-form")).toBeNull();
  });
});
