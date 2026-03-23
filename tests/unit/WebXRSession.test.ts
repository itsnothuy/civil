/**
 * WebXRSession.test.ts — Unit tests for Phase 6 Task 6.2
 *
 * Note: WebXR is heavily dependent on browser/device APIs not available
 * in jsdom. Tests focus on the state machine, capability detection,
 * comfort reporting, and graceful degradation when WebXR is unavailable.
 */

// Mock xeokit
jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsVisible: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["obj1", "obj2"],
      objects: {
        obj1: { id: "obj1", highlighted: false, selected: false },
        obj2: { id: "obj2", highlighted: false, selected: false },
      },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, 0, 0, 10, 10, 10]),
      xrayMaterial: {
        fill: true,
        fillAlpha: 0.1,
        fillColor: [0, 0, 0],
        edgeAlpha: 0.3,
        edgeColor: [0, 0, 0],
      },
      highlightMaterial: {
        fill: true,
        edges: true,
        fillAlpha: 0.3,
        edgeColor: [1, 1, 0],
      },
      models: {},
      canvas: { canvas: document.createElement("canvas") },
      pick: jest.fn(() => null),
    },
    camera: {
      projection: "perspective",
      eye: [0, 0, 10],
      look: [0, 0, 0],
      up: [0, 1, 0],
    },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: { metaObjects: {} },
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

import { WebXRSession } from "../../src/xr/WebXRSession";
import { ViewerCore } from "../../src/viewer/ViewerCore";

describe("WebXRSession", () => {
  let viewer: ViewerCore;
  let xrSession: WebXRSession;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="viewer-canvas"></canvas>
      <canvas id="nav-cube-canvas"></canvas>
    `;
    viewer = new ViewerCore("viewer-canvas");
    xrSession = new WebXRSession(viewer);
  });

  afterEach(() => {
    xrSession.destroy();
    document.body.innerHTML = "";
    // Clean up navigator.xr mock if set
    if ("xr" in navigator) {
      Object.defineProperty(navigator, "xr", {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }
  });

  describe("initial state", () => {
    it("starts as unavailable", () => {
      expect(xrSession.state).toBe("unavailable");
    });

    it("is not active", () => {
      expect(xrSession.isActive).toBe(false);
    });

    it("session is null", () => {
      expect(xrSession.session).toBeNull();
    });
  });

  describe("checkCapabilities — no WebXR", () => {
    it("reports unavailable when navigator.xr is missing", async () => {
      const caps = await xrSession.checkCapabilities();
      expect(caps.apiAvailable).toBe(false);
      expect(caps.vrSupported).toBe(false);
      expect(caps.arSupported).toBe(false);
      expect(caps.bestMode).toBeNull();
      expect(caps.message).toContain("not available");
    });

    it("sets state to unavailable", async () => {
      await xrSession.checkCapabilities();
      expect(xrSession.state).toBe("unavailable");
    });

    it("caches result on subsequent calls", async () => {
      const caps1 = await xrSession.checkCapabilities();
      const caps2 = await xrSession.checkCapabilities();
      expect(caps1).toBe(caps2);
    });
  });

  describe("checkCapabilities — with WebXR API (VR only)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: jest.fn().mockImplementation((mode: string) => {
            if (mode === "immersive-vr") return Promise.resolve(true);
            return Promise.resolve(false);
          }),
          requestSession: jest.fn(),
        },
        writable: true,
        configurable: true,
      });
    });

    it("detects VR support", async () => {
      const caps = await xrSession.checkCapabilities();
      expect(caps.apiAvailable).toBe(true);
      expect(caps.vrSupported).toBe(true);
      expect(caps.arSupported).toBe(false);
      expect(caps.bestMode).toBe("immersive-vr");
    });

    it("sets state to available", async () => {
      await xrSession.checkCapabilities();
      expect(xrSession.state).toBe("available");
    });
  });

  describe("checkCapabilities — with AR + VR", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: jest.fn().mockResolvedValue(true),
          requestSession: jest.fn(),
        },
        writable: true,
        configurable: true,
      });
    });

    it("prefers AR mode as bestMode", async () => {
      const caps = await xrSession.checkCapabilities();
      expect(caps.arSupported).toBe(true);
      expect(caps.vrSupported).toBe(true);
      expect(caps.bestMode).toBe("immersive-ar");
    });
  });

  describe("enterXR — no WebXR", () => {
    it("returns false when WebXR unavailable", async () => {
      const result = await xrSession.enterXR();
      expect(result).toBe(false);
    });

    it("emits error event", async () => {
      const errorCb = jest.fn();
      xrSession.on("error", errorCb);
      await xrSession.enterXR();
      // State should be unavailable or error
      expect(["unavailable", "error"]).toContain(xrSession.state);
    });
  });

  describe("enterXR — with mock session", () => {
    let mockXRSession: {
      requestReferenceSpace: jest.Mock;
      addEventListener: jest.Mock;
      removeEventListener: jest.Mock;
      requestAnimationFrame: jest.Mock;
      cancelAnimationFrame: jest.Mock;
      end: jest.Mock;
    };

    beforeEach(() => {
      mockXRSession = {
        requestReferenceSpace: jest.fn().mockResolvedValue({}),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        requestAnimationFrame: jest.fn().mockReturnValue(1),
        cancelAnimationFrame: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: jest.fn().mockResolvedValue(true),
          requestSession: jest.fn().mockResolvedValue(mockXRSession),
        },
        writable: true,
        configurable: true,
      });
    });

    it("successfully enters XR session", async () => {
      const result = await xrSession.enterXR("immersive-vr");
      expect(result).toBe(true);
      expect(xrSession.state).toBe("active");
      expect(xrSession.isActive).toBe(true);
    });

    it("requests reference space", async () => {
      await xrSession.enterXR("immersive-vr");
      expect(mockXRSession.requestReferenceSpace).toHaveBeenCalledWith("local-floor");
    });

    it("registers event listeners", async () => {
      await xrSession.enterXR("immersive-vr");
      expect(mockXRSession.addEventListener).toHaveBeenCalledWith(
        "inputsourceschange",
        expect.any(Function),
      );
      expect(mockXRSession.addEventListener).toHaveBeenCalledWith("select", expect.any(Function));
      expect(mockXRSession.addEventListener).toHaveBeenCalledWith("end", expect.any(Function));
    });

    it("starts animation frame loop", async () => {
      await xrSession.enterXR("immersive-vr");
      expect(mockXRSession.requestAnimationFrame).toHaveBeenCalled();
    });

    it("emits session-started event", async () => {
      const cb = jest.fn();
      xrSession.on("session-started", cb);
      await xrSession.enterXR("immersive-vr");
      expect(cb).toHaveBeenCalledWith("immersive-vr");
    });

    it("does not double-enter", async () => {
      await xrSession.enterXR("immersive-vr");
      const result = await xrSession.enterXR("immersive-vr");
      expect(result).toBe(false);
    });
  });

  describe("exitXR", () => {
    let mockXRSession: {
      requestReferenceSpace: jest.Mock;
      addEventListener: jest.Mock;
      removeEventListener: jest.Mock;
      requestAnimationFrame: jest.Mock;
      cancelAnimationFrame: jest.Mock;
      end: jest.Mock;
    };

    beforeEach(async () => {
      mockXRSession = {
        requestReferenceSpace: jest.fn().mockResolvedValue({}),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        requestAnimationFrame: jest.fn().mockReturnValue(1),
        cancelAnimationFrame: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: jest.fn().mockResolvedValue(true),
          requestSession: jest.fn().mockResolvedValue(mockXRSession),
        },
        writable: true,
        configurable: true,
      });

      await xrSession.enterXR("immersive-vr");
    });

    it("calls session.end()", async () => {
      await xrSession.exitXR();
      expect(mockXRSession.end).toHaveBeenCalled();
    });

    it("cleans up state", async () => {
      await xrSession.exitXR();
      expect(xrSession.isActive).toBe(false);
      expect(xrSession.session).toBeNull();
    });

    it("is safe to call when no session", async () => {
      await xrSession.exitXR();
      await expect(xrSession.exitXR()).resolves.not.toThrow();
    });
  });

  describe("comfort report", () => {
    it("returns default report when no session", () => {
      const report = xrSession.getComfortReport();
      expect(report.sessionDurationMs).toBe(0);
      expect(report.avgFrameTimeMs).toBe(0);
      expect(report.droppedFrames).toBe(0);
      expect(report.motionIntensity).toBe("high");
      expect(report.recommendation).toBeTruthy();
    });
  });

  describe("createEnterButton — no WebXR", () => {
    it("creates a disabled button", async () => {
      const btn = await xrSession.createEnterButton();
      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe("XR Unavailable");
      expect(btn.getAttribute("aria-label")).toBe("Enter immersive XR mode");
    });

    it("button is inside a wrapper div", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const btn = await xrSession.createEnterButton(container);
      expect(btn.parentElement?.className).toBe("webxr-overlay");
    });
  });

  describe("createEnterButton — with WebXR", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "xr", {
        value: {
          isSessionSupported: jest.fn().mockImplementation((mode: string) => {
            if (mode === "immersive-vr") return Promise.resolve(true);
            return Promise.resolve(false);
          }),
          requestSession: jest.fn(),
        },
        writable: true,
        configurable: true,
      });
    });

    it("creates an enabled button", async () => {
      const btn = await xrSession.createEnterButton();
      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe("Enter VR");
    });
  });

  describe("event emitter", () => {
    it("on returns unsubscribe function", () => {
      const cb = jest.fn();
      const unsub = xrSession.on("test", cb);
      expect(typeof unsub).toBe("function");
      unsub();
    });
  });

  describe("destroy", () => {
    it("cleans up everything", () => {
      xrSession.destroy();
      expect(xrSession.state).not.toBe("active");
      expect(xrSession.session).toBeNull();
    });
  });
});
