/**
 * ModelLoader.test.ts — Unit tests for the GLB/GLTF model loader.
 *
 * xeokit GLTFLoaderPlugin is fully mocked.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mock state ──

const mockSceneModelHandlers: Record<string, (...args: any[]) => void> = {};
const mockLoad = jest.fn(() => ({
  on: jest.fn((event: string, cb: (...args: any[]) => void) => {
    mockSceneModelHandlers[event] = cb;
  }),
  id: "test-model",
}));

const mockFlyTo = jest.fn();

jest.mock("@xeokit/xeokit-sdk", () => ({
  GLTFLoaderPlugin: jest.fn().mockImplementation(() => ({
    load: mockLoad,
  })),
}));

import { ModelLoader } from "../../src/loader/ModelLoader";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Helpers ──

function mockViewerCore(): ViewerCore {
  return {
    viewer: {
      cameraFlight: { flyTo: mockFlyTo },
      scene: {
        models: {} as Record<string, any>,
      },
    },
  } as unknown as ViewerCore;
}

// ── Setup ──

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockSceneModelHandlers).forEach((k) => delete mockSceneModelHandlers[k]);

  // properties-panel element for error display
  let panel = document.getElementById("properties-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "properties-panel";
    document.body.appendChild(panel);
  }
  panel.innerHTML = "";
});

// ── Tests ──

describe("ModelLoader", () => {
  describe("constructor", () => {
    it("creates a GLTFLoaderPlugin from the viewer", () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);
      expect(loader).toBeDefined();
    });
  });

  describe("loadProject", () => {
    it("calls GLTFLoaderPlugin.load with correct paths", () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);

      // Start loading (don't await yet)
      loader.loadProject("my-project");

      expect(mockLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "my-project",
          src: "./data/my-project/model.glb",
          metaModelSrc: "./data/my-project/metadata.json",
          edges: true,
        }),
      );
    });

    it("resolves when the model fires 'loaded'", async () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);

      const promise = loader.loadProject("sample");

      // Simulate successful load
      mockSceneModelHandlers["loaded"]();

      await expect(promise).resolves.toBeUndefined();
      expect(mockFlyTo).toHaveBeenCalled();
    });

    it("rejects when the model fires 'error'", async () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);

      const promise = loader.loadProject("bad-project");

      // Simulate error
      mockSceneModelHandlers["error"]("File not found");

      await expect(promise).rejects.toThrow("File not found");
    });

    it("displays XSS-safe error message in properties panel", async () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);

      const promise = loader.loadProject("xss-test");
      mockSceneModelHandlers["error"]('<script>alert("xss")</script>');

      try {
        await promise;
      } catch {
        // expected
      }

      const panel = document.getElementById("properties-panel")!;
      expect(panel.innerHTML).toContain("&lt;script&gt;");
      expect(panel.innerHTML).not.toContain("<script>");
    });
  });

  describe("unloadAll", () => {
    it("destroys all models in the scene", () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);

      const model1 = { destroy: jest.fn() };
      const model2 = { destroy: jest.fn() };
      (viewer.viewer.scene.models as any)["m1"] = model1;
      (viewer.viewer.scene.models as any)["m2"] = model2;

      loader.unloadAll();

      expect(model1.destroy).toHaveBeenCalled();
      expect(model2.destroy).toHaveBeenCalled();
    });

    it("handles empty models list gracefully", () => {
      const viewer = mockViewerCore();
      const loader = new ModelLoader(viewer);
      // models is empty — should not throw
      expect(() => loader.unloadAll()).not.toThrow();
    });
  });
});
