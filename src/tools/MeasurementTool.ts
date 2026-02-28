/**
 * MeasurementTool.ts
 *
 * Two-point distance measurement using xeokit DistanceMeasurementsPlugin.
 * Supports vertex/edge snapping, metric/imperial units, in-memory persistence,
 * and JSON export.
 *
 * Phase 2, Task 2.1 — Distance Measurement Tool
 */

import {
  DistanceMeasurementsPlugin,
  DistanceMeasurementsMouseControl,
  PointerLens,
} from "@xeokit/xeokit-sdk";

import type { ViewerCore } from "../viewer/ViewerCore";

export type MeasurementUnit = "m" | "ft";

/** Meters-to-feet conversion factor */
const M_TO_FT = 3.28084;

/** Serialisable snapshot of a single two-point measurement */
export interface MeasurementData {
  id: string;
  origin: [number, number, number];
  target: [number, number, number];
  /** Euclidean distance in metres (model units) */
  distance: number;
}

/** Callback fired when a new measurement is placed */
export type MeasurementCallback = (data: MeasurementData) => void;

/** Euclidean distance between two 3-D points (fallback if .length unavailable) */
function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export class MeasurementTool {
  private _viewer: ViewerCore;
  private _distPlugin: DistanceMeasurementsPlugin;
  private _mouseControl: DistanceMeasurementsMouseControl;
  private _pointerLens: PointerLens;
  private _unit: MeasurementUnit = "m";
  private _active = false;
  private _measurements: MeasurementData[] = [];
  private _listeners: MeasurementCallback[] = [];

  constructor(viewerCore: ViewerCore) {
    this._viewer = viewerCore;
    const viewer = viewerCore.viewer;

    this._distPlugin = new DistanceMeasurementsPlugin(viewer, {
      defaultColor: "#00BBFF",
    });

    this._pointerLens = new PointerLens(viewer);
    this._mouseControl = new DistanceMeasurementsMouseControl(this._distPlugin, {
      pointerLens: this._pointerLens,
    });
    this._mouseControl.snapping = true;

    // Track every newly placed measurement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this._distPlugin as any).on("measurementCreated", (measurement: any) => {
      const originPos = measurement.origin.worldPos;
      const targetPos = measurement.target.worldPos;
      const o: [number, number, number] = [originPos[0], originPos[1], originPos[2]];
      const t: [number, number, number] = [targetPos[0], targetPos[1], targetPos[2]];
      const data: MeasurementData = {
        id: String(measurement.id),
        origin: o,
        target: t,
        distance: typeof measurement.length === "number" ? measurement.length : euclidean(o, t),
      };
      this._measurements.push(data);
      for (const cb of this._listeners) {
        cb(data);
      }
    });
  }

  // ── Activation ──────────────────────────────────────────

  /** Activate interactive two-point measurement mode */
  activate(): void {
    this._mouseControl.activate();
    this._active = true;
    console.info("[MeasurementTool] Activated.");
  }

  /** Deactivate measurement mode */
  deactivate(): void {
    this._mouseControl.deactivate();
    this._active = false;
    console.info("[MeasurementTool] Deactivated.");
  }

  /** Whether measurement mode is currently active */
  get isActive(): boolean {
    return this._active;
  }

  // ── Unit handling ───────────────────────────────────────

  /** Set the display unit (m or ft) */
  setUnit(unit: MeasurementUnit): void {
    this._unit = unit;
  }

  /** Current display unit */
  get unit(): MeasurementUnit {
    return this._unit;
  }

  /** Convert a distance from metres to the current display unit */
  convertDistance(metres: number): number {
    return this._unit === "ft" ? metres * M_TO_FT : metres;
  }

  /** Format a distance with the current unit suffix */
  formatDistance(metres: number): string {
    const value = this.convertDistance(metres);
    const precision = value < 1 ? 3 : 2;
    return `${value.toFixed(precision)} ${this._unit}`;
  }

  // ── Measurement data ────────────────────────────────────

  /** All measurements taken in this session (read-only) */
  get measurements(): ReadonlyArray<MeasurementData> {
    return this._measurements;
  }

  /** Number of measurements */
  get count(): number {
    return this._measurements.length;
  }

  /** Register a listener for new measurements. Returns an unsubscribe function. */
  onMeasurement(callback: MeasurementCallback): () => void {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  }

  /** Export all measurements as a JSON string */
  exportJSON(): string {
    return JSON.stringify(
      this._measurements.map((m) => ({
        ...m,
        displayDistance: this.formatDistance(m.distance),
        unit: this._unit,
      })),
      null,
      2,
    );
  }

  // ── Lifecycle ───────────────────────────────────────────

  /** Clear all measurements from the scene and memory */
  clearAll(): void {
    this._distPlugin.clear();
    this._measurements = [];
    console.info("[MeasurementTool] All measurements cleared.");
  }

  /** Destroy the tool and release all resources */
  destroy(): void {
    this._mouseControl.destroy();
    this._distPlugin.destroy();
    this._pointerLens.destroy();
    this._listeners = [];
    this._measurements = [];
  }
}
