/**
 * MeasurementTool.test.ts — Unit tests for the distance measurement tool.
 *
 * xeokit requires WebGL so all SDK classes are mocked.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mock state (must be declared before jest.mock) ──

const mockPluginOn = jest.fn();
const mockPluginClear = jest.fn();
const mockPluginDestroy = jest.fn();

const mockControlActivate = jest.fn();
const mockControlDeactivate = jest.fn();
const mockControlDestroy = jest.fn();

const mockLensDestroy = jest.fn();

jest.mock("@xeokit/xeokit-sdk", () => ({
  DistanceMeasurementsPlugin: jest.fn().mockImplementation(() => ({
    on: mockPluginOn,
    clear: mockPluginClear,
    destroy: mockPluginDestroy,
  })),
  DistanceMeasurementsMouseControl: jest.fn().mockImplementation(() => ({
    activate: mockControlActivate,
    deactivate: mockControlDeactivate,
    destroy: mockControlDestroy,
    snapping: false,
  })),
  PointerLens: jest.fn().mockImplementation(() => ({
    destroy: mockLensDestroy,
  })),
}));

import { MeasurementTool } from "../../src/tools/MeasurementTool";
import type { ViewerCore } from "../../src/viewer/ViewerCore";

// ── Helpers ──

/** Create a minimal ViewerCore mock */
function mockViewerCore(): ViewerCore {
  return { viewer: {} } as unknown as ViewerCore;
}

/** Retrieve the "measurementCreated" callback registered on the plugin */
function getMeasurementCreatedCb(): (measurement: any) => void {
  const call = mockPluginOn.mock.calls.find((c: any[]) => c[0] === "measurementCreated");
  if (!call) throw new Error("measurementCreated handler was not registered");
  return call[1] as (measurement: any) => void;
}

/** Build a fake xeokit DistanceMeasurement event payload */
function fakeMeasurement(
  id: string,
  origin: [number, number, number],
  target: [number, number, number],
) {
  return {
    id,
    origin: { worldPos: new Float64Array(origin) },
    target: { worldPos: new Float64Array(target) },
  };
}

// ── Tests ──

describe("MeasurementTool", () => {
  let tool: MeasurementTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new MeasurementTool(mockViewerCore());
  });

  afterEach(() => {
    tool.destroy();
  });

  // ---------- Construction ----------

  it("registers a measurementCreated listener on the plugin", () => {
    expect(mockPluginOn).toHaveBeenCalledWith("measurementCreated", expect.any(Function));
  });

  // ---------- Activation ----------

  it("starts inactive", () => {
    expect(tool.isActive).toBe(false);
  });

  it("activates and deactivates the mouse control", () => {
    tool.activate();
    expect(tool.isActive).toBe(true);
    expect(mockControlActivate).toHaveBeenCalledTimes(1);

    tool.deactivate();
    expect(tool.isActive).toBe(false);
    expect(mockControlDeactivate).toHaveBeenCalledTimes(1);
  });

  // ---------- Units ----------

  it("defaults to metres", () => {
    expect(tool.unit).toBe("m");
  });

  it("converts distance to feet", () => {
    tool.setUnit("ft");
    expect(tool.convertDistance(1)).toBeCloseTo(3.28084, 4);
    expect(tool.convertDistance(0)).toBe(0);
  });

  it("convertDistance returns metres unchanged", () => {
    expect(tool.convertDistance(5)).toBe(5);
  });

  it("formats distance with correct unit suffix", () => {
    expect(tool.formatDistance(5)).toBe("5.00 m");
    tool.setUnit("ft");
    expect(tool.formatDistance(1)).toBe("3.28 ft");
  });

  it("uses higher precision for sub-1 values", () => {
    expect(tool.formatDistance(0.123)).toBe("0.123 m");
  });

  // ---------- Measurement tracking ----------

  it("starts with zero measurements", () => {
    expect(tool.count).toBe(0);
    expect(tool.measurements).toEqual([]);
  });

  it("tracks measurements from the plugin event", () => {
    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m1", [0, 0, 0], [3, 4, 0]));

    expect(tool.count).toBe(1);
    expect(tool.measurements[0].id).toBe("m1");
    expect(tool.measurements[0].origin).toEqual([0, 0, 0]);
    expect(tool.measurements[0].target).toEqual([3, 4, 0]);
    // 3-4-5 triangle → distance = 5
    expect(tool.measurements[0].distance).toBeCloseTo(5, 6);
  });

  it("computes distance accurately for 3D diagonal", () => {
    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m2", [1, 2, 3], [4, 6, 3]));
    // sqrt((3)² + (4)² + 0²) = 5
    expect(tool.measurements[0].distance).toBeCloseTo(5, 6);
  });

  // ---------- Callbacks ----------

  it("fires onMeasurement callbacks", () => {
    const cb = jest.fn();
    tool.onMeasurement(cb);

    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m3", [0, 0, 0], [1, 0, 0]));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: "m3", distance: 1 }));
  });

  it("unsubscribe prevents further callbacks", () => {
    const cb = jest.fn();
    const unsub = tool.onMeasurement(cb);
    unsub();

    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m4", [0, 0, 0], [1, 0, 0]));

    expect(cb).not.toHaveBeenCalled();
  });

  // ---------- Export ----------

  it("exports measurements as JSON with display distance", () => {
    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m5", [0, 0, 0], [10, 0, 0]));

    const json = JSON.parse(tool.exportJSON());
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("m5");
    expect(json[0].displayDistance).toBe("10.00 m");
    expect(json[0].unit).toBe("m");
  });

  it("exports with feet when unit is set", () => {
    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m6", [0, 0, 0], [1, 0, 0]));
    tool.setUnit("ft");

    const json = JSON.parse(tool.exportJSON());
    expect(json[0].unit).toBe("ft");
    expect(json[0].displayDistance).toContain("ft");
  });

  // ---------- Clear ----------

  it("clearAll resets measurements and calls plugin.clear()", () => {
    const fire = getMeasurementCreatedCb();
    fire(fakeMeasurement("m7", [0, 0, 0], [1, 0, 0]));
    expect(tool.count).toBe(1);

    tool.clearAll();
    expect(tool.count).toBe(0);
    expect(tool.measurements).toEqual([]);
    expect(mockPluginClear).toHaveBeenCalledTimes(1);
  });

  // ---------- Destroy ----------

  it("destroy releases all resources", () => {
    tool.destroy();
    expect(mockControlDestroy).toHaveBeenCalledTimes(1);
    expect(mockPluginDestroy).toHaveBeenCalledTimes(1);
    expect(mockLensDestroy).toHaveBeenCalledTimes(1);
    expect(tool.count).toBe(0);
  });
});
