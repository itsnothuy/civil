/**
 * ImportExport.test.ts — Round-trip test for JSON export/import (Task 2.4).
 *
 * Validates: export → import → identical data.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Polyfill crypto.randomUUID for jsdom ──
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== "function") {
  let counter = 0;
  globalThis.crypto.randomUUID = (() => `import-test-uuid-${++counter}`) as any;
}

// ── Mock xeokit SDK ──
jest.mock("@xeokit/xeokit-sdk", () => ({}));

// ── Mock localStorage ──
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import { AnnotationService } from "../../src/annotations/AnnotationService";

// Minimal mock ViewerCore
const mockViewer = {
  viewer: {
    scene: { canvas: { canvas: document.createElement("canvas") } },
    cameraControl: { on: jest.fn(), off: jest.fn() },
  },
} as any;

const PROJECT_ID = "test-project";

describe("JSON Import/Export round-trip", () => {
  let service: AnnotationService;

  beforeEach(() => {
    localStorageMock.clear();
    service = new AnnotationService(mockViewer);
  });

  function addSample(comment: string) {
    return service.add(PROJECT_ID, {
      type: "text",
      anchor: { type: "world", worldPos: [1, 2, 3] },
      author: "tester",
      comment,
      severity: "info",
      status: "open",
    });
  }

  it("round-trip: export then import yields identical annotations", () => {
    const a1 = addSample("Crack in wall");
    const a2 = addSample("Missing rebar");

    const exported = service.exportJSON();

    // Create a fresh service and import into it
    const service2 = new AnnotationService(mockViewer);
    const count = service2.importJSON(PROJECT_ID, exported);

    expect(count).toBe(2);
    const imported = service2.list();
    expect(imported).toHaveLength(2);

    // Verify data integrity
    const byId = new Map(imported.map((a) => [a.id, a]));
    expect(byId.get(a1.id)?.comment).toBe("Crack in wall");
    expect(byId.get(a2.id)?.comment).toBe("Missing rebar");
    expect(byId.get(a1.id)?.schemaVersion).toBe("1.0");
    expect(byId.get(a1.id)?.anchor.worldPos).toEqual([1, 2, 3]);
  });

  it("importJSON merges with existing annotations", () => {
    addSample("Existing");
    expect(service.list()).toHaveLength(1);

    const otherService = new AnnotationService(mockViewer);
    const other = otherService.add(PROJECT_ID, {
      type: "text",
      anchor: { type: "world", worldPos: [4, 5, 6] },
      author: "other",
      comment: "New import",
      severity: "warning",
      status: "open",
    });
    const json = otherService.exportJSON();

    const count = service.importJSON(PROJECT_ID, json);
    expect(count).toBe(1);
    expect(service.list()).toHaveLength(2);
    expect(service.list().find((a) => a.id === other.id)?.comment).toBe("New import");
  });

  it("importJSON overwrites duplicate IDs", () => {
    const original = addSample("Original");
    const exported = service.exportJSON();

    // Manually modify the exported JSON to change the comment
    const parsed = JSON.parse(exported);
    parsed[0].comment = "Updated via import";
    const modified = JSON.stringify(parsed);

    service.importJSON(PROJECT_ID, modified);
    expect(service.list()).toHaveLength(1);
    expect(service.list()[0].comment).toBe("Updated via import");
    expect(service.list()[0].id).toBe(original.id);
  });

  it("throws on invalid JSON string", () => {
    expect(() => service.importJSON(PROJECT_ID, "not json {{{")).toThrow("Invalid JSON");
  });

  it("throws when input is not an array", () => {
    expect(() => service.importJSON(PROJECT_ID, '{"foo": 1}')).toThrow("expected a JSON array");
  });

  it("throws on missing required fields", () => {
    const bad = JSON.stringify([{ id: "x", schemaVersion: "1.0" }]);
    expect(() => service.importJSON(PROJECT_ID, bad)).toThrow("invalid field");
  });

  it("throws on unsupported schemaVersion", () => {
    const bad = JSON.stringify([
      {
        id: "x",
        schemaVersion: "2.0",
        type: "text",
        anchor: { worldPos: [0, 0, 0] },
        author: "a",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        comment: "hi",
        severity: "info",
        status: "open",
      },
    ]);
    expect(() => service.importJSON(PROJECT_ID, bad)).toThrow('unsupported schemaVersion "2.0"');
  });

  it("throws on invalid anchor.worldPos", () => {
    const bad = JSON.stringify([
      {
        id: "x",
        schemaVersion: "1.0",
        type: "text",
        anchor: { worldPos: [1, 2] }, // only 2 elements
        author: "a",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        comment: "hi",
        severity: "info",
        status: "open",
      },
    ]);
    expect(() => service.importJSON(PROJECT_ID, bad)).toThrow("anchor.worldPos");
  });

  it("throws on missing anchor object", () => {
    const bad = JSON.stringify([
      {
        id: "x",
        schemaVersion: "1.0",
        type: "text",
        author: "a",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        comment: "hi",
        severity: "info",
        status: "open",
      },
    ]);
    expect(() => service.importJSON(PROJECT_ID, bad)).toThrow('missing or invalid field "anchor"');
  });
});
