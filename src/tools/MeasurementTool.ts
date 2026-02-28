/**
 * MeasurementTool.ts
 *
 * Two-point and cumulative path distance measurement using xeokit
 * DistanceMeasurementsPlugin. Supports vertex/edge snapping,
 * metric/imperial units, in-memory persistence, and JSON export.
 *
 * Phase 2, Tasks 2.1 + 2.2
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

/** A single segment in a cumulative path */
export interface PathSegment {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  /** Segment distance in metres */
  distance: number;
}

/** Cumulative path measurement data */
export interface PathData {
  segments: PathSegment[];
  points: Array<[number, number, number]>;
  /** Total path distance in metres */
  totalDistance: number;
}

/** Callback fired when a new measurement is placed */
export type MeasurementCallback = (data: MeasurementData) => void;

/** Callback fired when the current path changes */
export type PathChangeCallback = (data: PathData) => void;

/** Euclidean distance between two 3-D points */
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

  // ── Path state ──
  private _pathMode = false;
  private _pathPoints: Array<{ worldPos: [number, number, number]; entity: unknown }> = [];
  private _pathSegmentIds: string[] = [];
  private _pathSegCounter = 0;
  private _pathPickSub: unknown = null;
  private _pathListeners: PathChangeCallback[] = [];

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
    const twoPoint = this._measurements.map((m) => ({
      ...m,
      displayDistance: this.formatDistance(m.distance),
      unit: this._unit,
    }));
    const path = this.currentPath;
    const result: Record<string, unknown> = { measurements: twoPoint };
    if (path) {
      result.path = {
        ...path,
        displayTotalDistance: this.formatDistance(path.totalDistance),
        segments: path.segments.map((s) => ({
          ...s,
          displayDistance: this.formatDistance(s.distance),
        })),
        unit: this._unit,
      };
    }
    return JSON.stringify(result, null, 2);
  }

  // ── Cumulative path measurement (Task 2.2) ─────────────

  /** Whether cumulative path mode is active */
  get pathMode(): boolean {
    return this._pathMode;
  }

  /** Start cumulative path measurement mode (click to add points) */
  startPath(): void {
    if (this._pathMode) return;
    // Deactivate two-point mode if active
    if (this._active) this.deactivate();
    this._pathMode = true;
    this._pathPoints = [];
    this._pathSegmentIds = [];

    // Listen for object picks to build path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._pathPickSub = (this._viewer.viewer.cameraControl as any).on(
      "picked",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pickResult: any) => {
        if (!this._pathMode || !pickResult.worldPos) return;
        this._addPathPoint(pickResult);
      },
    );
    console.info("[MeasurementTool] Path mode started.");
  }

  /** Internal: add a point to the current path */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _addPathPoint(pickResult: any): void {
    const wp = pickResult.worldPos;
    const point = {
      worldPos: [wp[0], wp[1], wp[2]] as [number, number, number],
      entity: pickResult.entity,
    };
    this._pathPoints.push(point);

    // Create a visual segment from the previous point
    if (this._pathPoints.length >= 2) {
      const prev = this._pathPoints[this._pathPoints.length - 2];
      const curr = this._pathPoints[this._pathPoints.length - 1];
      const segId = `path-seg-${++this._pathSegCounter}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._distPlugin as any).createMeasurement({
        id: segId,
        origin: { entity: prev.entity, worldPos: [...prev.worldPos] },
        target: { entity: curr.entity, worldPos: [...curr.worldPos] },
        visible: true,
        color: "#FF6600",
      });
      this._pathSegmentIds.push(segId);
    }

    this._firePathChange();
  }

  /** Remove the last point from the path (undo) */
  undoLastPoint(): void {
    if (this._pathPoints.length === 0) return;
    this._pathPoints.pop();

    // Remove the last visual segment
    if (this._pathSegmentIds.length > 0) {
      const lastSegId = this._pathSegmentIds.pop()!;
      this._distPlugin.destroyMeasurement(lastSegId);
    }
    this._firePathChange();
    console.info(`[MeasurementTool] Undo → ${this._pathPoints.length} point(s) remaining.`);
  }

  /** Current path data (null if no points) */
  get currentPath(): PathData | null {
    if (this._pathPoints.length === 0) return null;

    const segments: PathSegment[] = [];
    let totalDistance = 0;

    for (let i = 1; i < this._pathPoints.length; i++) {
      const from = this._pathPoints[i - 1].worldPos;
      const to = this._pathPoints[i].worldPos;
      const dist = euclidean(from, to);
      totalDistance += dist;
      segments.push({
        id: this._pathSegmentIds[i - 1] ?? `seg-${i}`,
        from,
        to,
        distance: dist,
      });
    }

    return {
      segments,
      points: this._pathPoints.map((p) => p.worldPos),
      totalDistance,
    };
  }

  /** End path mode and return the final path data */
  endPath(): PathData | null {
    const data = this.currentPath;
    this._stopPathListening();
    this._pathMode = false;
    console.info(
      `[MeasurementTool] Path ended — ${data?.segments.length ?? 0} segment(s), ` +
        `total ${data ? this.formatDistance(data.totalDistance) : "0 m"}.`,
    );
    return data;
  }

  /** Cancel path mode and remove all path visual segments */
  clearPath(): void {
    for (const segId of this._pathSegmentIds) {
      this._distPlugin.destroyMeasurement(segId);
    }
    this._pathPoints = [];
    this._pathSegmentIds = [];
    this._stopPathListening();
    this._pathMode = false;
    console.info("[MeasurementTool] Path cleared.");
  }

  /** Register a listener for path changes. Returns unsubscribe function. */
  onPathChange(callback: PathChangeCallback): () => void {
    this._pathListeners.push(callback);
    return () => {
      this._pathListeners = this._pathListeners.filter((cb) => cb !== callback);
    };
  }

  private _firePathChange(): void {
    const data = this.currentPath;
    if (!data) return;
    for (const cb of this._pathListeners) {
      cb(data);
    }
  }

  private _stopPathListening(): void {
    if (this._pathPickSub != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._viewer.viewer.cameraControl as any).off?.(this._pathPickSub);
      this._pathPickSub = null;
    }
  }

  // ── Lifecycle ───────────────────────────────────────────

  /** Clear all measurements (two-point and path) from the scene and memory */
  clearAll(): void {
    this.clearPath();
    this._distPlugin.clear();
    this._measurements = [];
    console.info("[MeasurementTool] All measurements cleared.");
  }

  /** Destroy the tool and release all resources */
  destroy(): void {
    this._stopPathListening();
    this._mouseControl.destroy();
    this._distPlugin.destroy();
    this._pointerLens.destroy();
    this._listeners = [];
    this._pathListeners = [];
    this._measurements = [];
    this._pathPoints = [];
    this._pathSegmentIds = [];
  }
}
