/**
 * AnnotationService.test.ts
 *
 * Unit tests for annotation data schema, CRUD operations,
 * and localStorage persistence (Task 5 — K0, H1).
 */

import { AnnotationService } from "../../src/annotations/AnnotationService";
import type { Annotation } from "../../src/annotations/AnnotationService";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// Mock ViewerCore — not needed for annotation unit tests
const mockViewer = {} as ViewerCore;

// Mock localStorage
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

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: { randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` },
});

describe("AnnotationService", () => {
  let service: AnnotationService;
  const PROJECT_ID = "test-project";

  beforeEach(() => {
    localStorageMock.clear();
    service = new AnnotationService(mockViewer);
  });

  describe("add()", () => {
    it("creates an annotation with a unique id and ISO timestamps", () => {
      const ann = service.add(PROJECT_ID, {
        type: "text",
        anchor: { type: "world", worldPos: [0, 0, 0] },
        author: "engineer@example.com",
        comment: "Check this joint.",
        severity: "warning",
        status: "open",
      });

      expect(ann.id).toBeTruthy();
      expect(ann.schemaVersion).toBe("1.0");
      expect(ann.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(ann.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(ann.comment).toBe("Check this joint.");
    });

    it("persists to localStorage after add", () => {
      service.add(PROJECT_ID, {
        type: "text",
        anchor: { type: "object", objectId: "element-42" },
        author: "inspector@example.com",
        comment: "Crack visible.",
        severity: "error",
        status: "open",
      });

      const stored = localStorage.getItem(`civil-bim-annotations:${PROJECT_ID}`);
      expect(stored).not.toBeNull();
      const parsed: Annotation[] = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].anchor.objectId).toBe("element-42");
    });
  });

  describe("update()", () => {
    it("updates status and sets updatedAt", async () => {
      const ann = service.add(PROJECT_ID, {
        type: "text",
        anchor: { type: "world", worldPos: [1, 2, 3] },
        author: "pm@example.com",
        comment: "Review needed.",
        severity: "info",
        status: "open",
      });

      // Wait 2ms so updatedAt is guaranteed to differ from createdAt
      await new Promise((r) => setTimeout(r, 2));
      const updated = service.update(PROJECT_ID, ann.id, { status: "resolved" });
      expect(updated?.status).toBe("resolved");
      expect(updated).not.toBeNull();
      // updatedAt should be a valid ISO string, same or later than createdAt
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(ann.createdAt).getTime(),
      );
    });

    it("returns null for unknown id", () => {
      const result = service.update(PROJECT_ID, "nonexistent-id", { status: "closed" });
      expect(result).toBeNull();
    });
  });

  describe("delete()", () => {
    it("removes the annotation and returns true", () => {
      const ann = service.add(PROJECT_ID, {
        type: "markup",
        anchor: { type: "world", worldPos: [0, 0, 0] },
        author: "user@example.com",
        comment: "To delete.",
        severity: "info",
        status: "open",
      });

      expect(service.delete(PROJECT_ID, ann.id)).toBe(true);
      expect(service.list()).toHaveLength(0);
    });

    it("returns false for unknown id", () => {
      expect(service.delete(PROJECT_ID, "ghost-id")).toBe(false);
    });
  });

  describe("loadFromLocalStorage()", () => {
    it("restores annotations from localStorage", () => {
      const ann = service.add(PROJECT_ID, {
        type: "text",
        anchor: { type: "object", objectId: "obj-1" },
        author: "user@example.com",
        comment: "Persisted.",
        severity: "info",
        status: "open",
      });

      // Create a fresh service (simulates page reload)
      const newService = new AnnotationService(mockViewer);
      newService.loadFromLocalStorage(PROJECT_ID);

      expect(newService.list()).toHaveLength(1);
      expect(newService.list()[0].id).toBe(ann.id);
    });
  });

  describe("exportJSON()", () => {
    it("exports valid JSON with all annotations", () => {
      service.add(PROJECT_ID, {
        type: "text",
        anchor: { type: "world", worldPos: [0, 1, 0] },
        author: "a@b.com",
        comment: "Test",
        severity: "info",
        status: "open",
      });

      const json = service.exportJSON();
      const parsed: Annotation[] = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].schemaVersion).toBe("1.0");
    });
  });
});
