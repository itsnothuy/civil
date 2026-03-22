/**
 * CollaborationClient.test.ts — Unit tests for the collaboration client
 * Phase 5, Task 5.5
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsVisible: jest.fn(),
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["obj1"],
      objects: { obj1: { id: "obj1", aabb: [0, 0, 0, 5, 3, 5] } },
      selectedObjectIds: ["obj1"],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, 0, 0, 10, 10, 10]),
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

// Mock crypto.randomUUID for jsdom
let uuidCounter = 0;
Object.defineProperty(globalThis, "crypto", {
  value: {
    ...globalThis.crypto,
    randomUUID: () => `00000000-0000-0000-0000-${String(++uuidCounter).padStart(12, "0")}`,
  },
  writable: true,
});

import {
  CollaborationClient,
  type CollaborationConfig,
} from "../../src/collaboration/CollaborationClient";
import { ViewerCore } from "../../src/viewer/ViewerCore";
import { AnnotationService } from "../../src/annotations/AnnotationService";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CollaborationClient", () => {
  let viewer: ViewerCore;
  let annotations: AnnotationService;
  let config: CollaborationConfig;
  let client: CollaborationClient;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="viewer-canvas" width="200" height="200"></canvas>
      <div id="properties-panel"></div>
    `;
    localStorage.clear();
    mockFetch.mockReset();

    viewer = new ViewerCore("viewer-canvas");
    annotations = new AnnotationService(viewer);
    config = {
      apiUrl: "http://localhost:4000/api",
      githubClientId: "test-client-id",
      projectId: "test-project",
    };
    client = new CollaborationClient(viewer, annotations, config);
  });

  describe("initialization", () => {
    it("starts disconnected", () => {
      expect(client.state).toBe("disconnected");
      expect(client.isConnected).toBe(false);
    });

    it("starts without a user", () => {
      expect(client.user).toBeNull();
      expect(client.isLoggedIn).toBe(false);
    });

    it("returns the configured API URL", () => {
      expect(client.apiUrl).toBe("http://localhost:4000/api");
    });

    it("restores token from localStorage", () => {
      localStorage.setItem("collab-token", "saved-token");
      const client2 = new CollaborationClient(viewer, annotations, config);
      // Token is restored but user is not set yet (need connect())
      expect(client2.isLoggedIn).toBe(false); // no user yet
    });
  });

  describe("OAuth flow", () => {
    it("loginWithGitHub redirects to GitHub", () => {
      // Mock window.location
      const originalHref = window.location.href;
      delete (window as any).location;
      (window as any).location = { href: "", origin: "http://localhost:3000" };

      client.loginWithGitHub();

      expect((window as any).location.href).toContain("github.com/login/oauth/authorize");
      expect((window as any).location.href).toContain("client_id=test-client-id");

      (window as any).location = { href: originalHref };
    });

    it("handles OAuth callback successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "test-token-123",
          user: {
            id: "1",
            login: "testuser",
            name: "Test User",
            avatarUrl: "https://github.com/avatar.png",
          },
        }),
      });

      const result = await client.handleOAuthCallback("test-code");
      expect(result).toBe(true);
      expect(client.isLoggedIn).toBe(true);
      expect(client.user?.login).toBe("testuser");
      expect(client.state).toBe("connected");
      expect(localStorage.getItem("collab-token")).toBe("test-token-123");
    });

    it("handles OAuth callback failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await client.handleOAuthCallback("bad-code");
      expect(result).toBe(false);
      expect(client.state).toBe("error");
    });

    it("handles network error during OAuth", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.handleOAuthCallback("test-code");
      expect(result).toBe(false);
      expect(client.state).toBe("error");
    });
  });

  describe("connect", () => {
    it("returns false when no token exists", async () => {
      const result = await client.connect();
      expect(result).toBe(false);
      expect(client.state).toBe("disconnected");
    });

    it("connects successfully with valid token", async () => {
      localStorage.setItem("collab-token", "valid-token");
      const clientWithToken = new CollaborationClient(viewer, annotations, config);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "1", login: "user1", name: "User One", avatarUrl: "https://avatar.png" },
        }),
      });

      const result = await clientWithToken.connect();
      expect(result).toBe(true);
      expect(clientWithToken.isConnected).toBe(true);
      expect(clientWithToken.user?.login).toBe("user1");
    });

    it("clears token when server returns unauthorized", async () => {
      localStorage.setItem("collab-token", "expired-token");
      const clientWithToken = new CollaborationClient(viewer, annotations, config);

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await clientWithToken.connect();
      expect(result).toBe(false);
      expect(localStorage.getItem("collab-token")).toBeNull();
    });

    it("sets error state when backend is unreachable", async () => {
      localStorage.setItem("collab-token", "some-token");
      const clientWithToken = new CollaborationClient(viewer, annotations, config);

      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await clientWithToken.connect();
      expect(result).toBe(false);
      expect(clientWithToken.state).toBe("error");
    });
  });

  describe("logout", () => {
    it("clears user and token", async () => {
      // First login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");
      expect(client.isLoggedIn).toBe(true);

      client.logout();
      expect(client.isLoggedIn).toBe(false);
      expect(client.user).toBeNull();
      expect(client.state).toBe("disconnected");
      expect(localStorage.getItem("collab-token")).toBeNull();
    });
  });

  describe("saveAnnotations", () => {
    it("saves to localStorage when offline", async () => {
      const spy = jest.spyOn(annotations, "saveToLocalStorage");
      const result = await client.saveAnnotations();
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith("test-project");
    });

    it("saves to server when connected", async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: 0 }),
      });

      const result = await client.saveAnnotations();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/api/projects/test-project/annotations",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("falls back to localStorage on server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      mockFetch.mockResolvedValueOnce({ ok: false });
      const spy = jest.spyOn(annotations, "saveToLocalStorage");

      const result = await client.saveAnnotations();
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("loadAnnotations", () => {
    it("loads from localStorage when offline", async () => {
      const spy = jest.spyOn(annotations, "loadFromLocalStorage");
      await client.loadAnnotations();
      expect(spy).toHaveBeenCalledWith("test-project");
    });

    it("loads from server when connected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ annotations: [] }),
      });

      const result = await client.loadAnnotations();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("shareViewpoint", () => {
    it("returns an offline viewpoint with URL when disconnected", async () => {
      const vp = await client.shareViewpoint();
      expect(vp).not.toBeNull();
      expect(vp?.id).toContain("local-");
      expect(vp?.url).toContain("viewpoint=");
      expect(vp?.eye).toEqual([-10, 10, -10]);
    });

    it("returns server viewpoint when connected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "vp-123",
          eye: [0, 0, 0],
          look: [1, 1, 1],
          up: [0, 1, 0],
          projection: "perspective",
          selectedObjects: [],
          createdBy: "u",
          createdAt: "2026-01-01T00:00:00Z",
          url: "http://localhost:3000/?projectId=test#viewpoint-id=vp-123",
        }),
      });

      const vp = await client.shareViewpoint();
      expect(vp?.id).toBe("vp-123");
    });
  });

  describe("restoreSharedViewpoint", () => {
    it("restores camera from URL hash", () => {
      const vpData = {
        eye: [100, 200, 300],
        look: [0, 0, 0],
        up: [0, 1, 0],
        projection: "ortho",
        selectedObjects: ["obj1"],
      };
      const encoded = btoa(JSON.stringify(vpData));

      // Set location hash
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: `#viewpoint=${encoded}` },
        writable: true,
      });

      const result = client.restoreSharedViewpoint();
      expect(result).toBe(true);
      expect(viewer.viewer.camera.eye).toEqual([100, 200, 300]);
      expect(viewer.viewer.camera.projection).toBe("ortho");
      expect(viewer.viewer.scene.setObjectsSelected).toHaveBeenCalledWith(["obj1"], true);
    });

    it("returns false when no viewpoint in hash", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "" },
        writable: true,
      });

      const result = client.restoreSharedViewpoint();
      expect(result).toBe(false);
    });

    it("returns false on malformed viewpoint data", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "#viewpoint=not-valid-base64!!!" },
        writable: true,
      });

      const result = client.restoreSharedViewpoint();
      expect(result).toBe(false);
    });
  });

  describe("event system", () => {
    it("emits login event on successful OAuth", async () => {
      const loginCb = jest.fn();
      client.on("login", loginCb);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      expect(loginCb).toHaveBeenCalled();
    });

    it("emits logout event", async () => {
      const logoutCb = jest.fn();
      client.on("logout", logoutCb);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok",
          user: { id: "1", login: "u", name: "U", avatarUrl: "" },
        }),
      });
      await client.handleOAuthCallback("code");

      client.logout();
      expect(logoutCb).toHaveBeenCalled();
    });

    it("supports unsubscribe", () => {
      const cb = jest.fn();
      const unsub = client.on("state-change", cb);
      unsub();
      // Trigger state change
      client.logout();
      // Should not be called for the logout state change
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
