/**
 * ChainStationingTool.ts
 *
 * Alignment-aware stationing measurement tool. Auto-detects IfcAlignment
 * entities in model metadata when available; falls back to manual polyline
 * selection. Displays station numbers along alignments. Exports CSV/JSON.
 *
 * Phase 5, Task 5.2
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Euclidean distance between two 3-D points */
function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** A single station point along an alignment */
export interface StationPoint {
  /** Station number in metres from alignment start */
  station: number;
  /** World position [x, y, z] */
  position: [number, number, number];
  /** Optional entity ID the point was snapped to */
  entityId?: string;
}

/** A complete alignment (auto-detected or manual) */
export interface AlignmentData {
  /** Unique ID for this alignment */
  id: string;
  /** Human-readable name */
  name: string;
  /** Source: "ifc" for auto-detected, "manual" for user-drawn */
  source: "ifc" | "manual";
  /** Ordered station points */
  points: StationPoint[];
  /** Total alignment length in metres */
  totalLength: number;
}

/** Stationing format options */
export type StationFormat = "metric" | "us";

/** Format a station number with the given format */
export function formatStation(metres: number, format: StationFormat = "metric"): string {
  if (format === "us") {
    // US format: STA 12+345.67 (stations every 100 ft)
    const feet = metres * 3.28084;
    const sta = Math.floor(feet / 100);
    const remainder = feet - sta * 100;
    return `STA ${sta}+${remainder.toFixed(2).padStart(6, "0")}`;
  }
  // Metric format: STA 0+000.000 (chainage in metres)
  const km = Math.floor(metres / 1000);
  const remainder = metres - km * 1000;
  return `STA ${km}+${remainder.toFixed(3).padStart(7, "0")}`;
}

export class ChainStationingTool {
  private _viewer: ViewerCore;
  private _alignments: AlignmentData[] = [];
  private _activeAlignmentId: string | null = null;
  private _format: StationFormat = "metric";

  // Manual polyline state
  private _manualMode = false;
  private _manualPoints: StationPoint[] = [];
  private _manualCounter = 0;
  private _pickSub: unknown = null;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  // ── Auto-detection ─────────────────────────────────────

  /**
   * Scan model metadata for IfcAlignment entities.
   * Auto-creates alignments from their geometry if found.
   * Returns the number of alignments detected.
   */
  detectAlignments(): number {
    const metaScene = this._viewer.viewer.metaScene;
    const metaObjects = metaScene.metaObjects;
    let detected = 0;

    for (const id of Object.keys(metaObjects)) {
      const meta = metaObjects[id];
      if (meta.type !== "IfcAlignment") continue;

      // Collect child elements to build alignment polyline
      const points = this._extractAlignmentPoints(meta);
      if (points.length < 2) continue;

      const alignment = this._buildAlignmentFromPoints(
        `ifc-${id}`,
        meta.name ?? `Alignment ${id}`,
        "ifc",
        points,
      );
      this._alignments.push(alignment);
      detected++;
    }

    if (detected > 0) {
      console.info(`[ChainStationingTool] Detected ${detected} IfcAlignment(s).`);
      this._activeAlignmentId = this._alignments[0].id;
    }
    return detected;
  }

  /** Extract world positions from an IfcAlignment's children */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _extractAlignmentPoints(
    meta: any,
  ): Array<{ pos: [number, number, number]; entityId?: string }> {
    const scene = this._viewer.viewer.scene;
    const points: Array<{ pos: [number, number, number]; entityId?: string }> = [];

    // Try getting geometry positions from child entities
    if (meta.children) {
      for (const child of meta.children) {
        const entity = scene.objects[child.id];
        if (entity && entity.aabb) {
          // Use center of AABB as approximation
          const aabb = entity.aabb;
          const cx = (aabb[0] + aabb[3]) / 2;
          const cy = (aabb[1] + aabb[4]) / 2;
          const cz = (aabb[2] + aabb[5]) / 2;
          points.push({ pos: [cx, cy, cz], entityId: child.id });
        }
      }
    }

    // Also try the alignment entity itself
    if (points.length === 0) {
      const entity = scene.objects[meta.id];
      if (entity && entity.aabb) {
        const aabb = entity.aabb;
        const start: [number, number, number] = [aabb[0], (aabb[1] + aabb[4]) / 2, aabb[2]];
        const end: [number, number, number] = [aabb[3], (aabb[1] + aabb[4]) / 2, aabb[5]];
        points.push({ pos: start, entityId: meta.id });
        points.push({ pos: end, entityId: meta.id });
      }
    }

    return points;
  }

  /** Build an alignment from a list of ordered positions */
  private _buildAlignmentFromPoints(
    id: string,
    name: string,
    source: "ifc" | "manual",
    rawPoints: Array<{ pos: [number, number, number]; entityId?: string }>,
  ): AlignmentData {
    let cumDist = 0;
    const stationPoints: StationPoint[] = [];

    for (let i = 0; i < rawPoints.length; i++) {
      if (i > 0) {
        cumDist += euclidean(rawPoints[i - 1].pos, rawPoints[i].pos);
      }
      stationPoints.push({
        station: cumDist,
        position: rawPoints[i].pos,
        entityId: rawPoints[i].entityId,
      });
    }

    return {
      id,
      name,
      source,
      points: stationPoints,
      totalLength: cumDist,
    };
  }

  // ── Manual polyline mode ───────────────────────────────

  /** Whether manual alignment definition mode is active */
  get manualMode(): boolean {
    return this._manualMode;
  }

  /** Start manual alignment definition mode (click to add waypoints) */
  startManualAlignment(name?: string): void {
    if (this._manualMode) return;
    this._manualMode = true;
    this._manualPoints = [];
    this._manualCounter++;

    // Listen for picks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._pickSub = (this._viewer.viewer.cameraControl as any).on(
      "picked",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pickResult: any) => {
        if (!this._manualMode || !pickResult.worldPos) return;
        const wp = pickResult.worldPos;
        const entityId = pickResult.entity ? String(pickResult.entity.id) : undefined;

        // Calculate cumulative distance
        let station = 0;
        if (this._manualPoints.length > 0) {
          const prev = this._manualPoints[this._manualPoints.length - 1];
          station = prev.station + euclidean(prev.position, [wp[0], wp[1], wp[2]]);
        }

        this._manualPoints.push({
          station,
          position: [wp[0], wp[1], wp[2]],
          entityId,
        });
      },
    );

    console.info(
      `[ChainStationingTool] Manual alignment mode started: "${name ?? `Manual-${this._manualCounter}`}"`,
    );
  }

  /** Finish manual alignment and add it to the list */
  finishManualAlignment(name?: string): AlignmentData | null {
    if (!this._manualMode) return null;
    this._manualMode = false;

    // Stop listening for picks
    if (this._pickSub != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._viewer.viewer.cameraControl as any).off?.(this._pickSub);
      this._pickSub = null;
    }

    if (this._manualPoints.length < 2) {
      console.warn("[ChainStationingTool] Need at least 2 points for an alignment.");
      this._manualPoints = [];
      return null;
    }

    const alignment: AlignmentData = {
      id: `manual-${this._manualCounter}`,
      name: name ?? `Manual Alignment ${this._manualCounter}`,
      source: "manual",
      points: [...this._manualPoints],
      totalLength: this._manualPoints[this._manualPoints.length - 1].station,
    };

    this._alignments.push(alignment);
    this._activeAlignmentId = alignment.id;
    this._manualPoints = [];

    console.info(
      `[ChainStationingTool] Manual alignment "${alignment.name}" created ` +
        `(${alignment.points.length} points, ${this.formatStation(alignment.totalLength)}).`,
    );
    return alignment;
  }

  /** Cancel manual alignment mode without saving */
  cancelManualAlignment(): void {
    this._manualMode = false;
    this._manualPoints = [];
    if (this._pickSub != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._viewer.viewer.cameraControl as any).off?.(this._pickSub);
      this._pickSub = null;
    }
    console.info("[ChainStationingTool] Manual alignment cancelled.");
  }

  /** Undo the last manually placed point */
  undoLastPoint(): void {
    if (this._manualPoints.length === 0) return;
    this._manualPoints.pop();
  }

  /** Current manual points (read-only, for UI display) */
  get manualPoints(): ReadonlyArray<StationPoint> {
    return this._manualPoints;
  }

  // ── Alignment access ───────────────────────────────────

  /** All alignments (auto-detected + manual) */
  get alignments(): ReadonlyArray<AlignmentData> {
    return this._alignments;
  }

  /** Currently active alignment, or null */
  get activeAlignment(): AlignmentData | null {
    return this._alignments.find((a) => a.id === this._activeAlignmentId) ?? null;
  }

  /** Set the active alignment by ID */
  setActiveAlignment(id: string): void {
    const alignment = this._alignments.find((a) => a.id === id);
    if (alignment) {
      this._activeAlignmentId = id;
    }
  }

  /** Remove an alignment by ID */
  removeAlignment(id: string): void {
    this._alignments = this._alignments.filter((a) => a.id !== id);
    if (this._activeAlignmentId === id) {
      this._activeAlignmentId = this._alignments.length > 0 ? this._alignments[0].id : null;
    }
  }

  // ── Station queries ────────────────────────────────────

  /** Get the station number at a world position along the active alignment */
  getStationAt(worldPos: [number, number, number]): StationPoint | null {
    const alignment = this.activeAlignment;
    if (!alignment || alignment.points.length < 2) return null;

    // Find the closest segment and project the point onto it
    let minDist = Infinity;
    let bestStation = 0;

    for (let i = 1; i < alignment.points.length; i++) {
      const a = alignment.points[i - 1].position;
      const b = alignment.points[i].position;

      // Project worldPos onto segment A→B
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ap = [worldPos[0] - a[0], worldPos[1] - a[1], worldPos[2] - a[2]];
      const abLen = Math.sqrt(ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2);
      if (abLen === 0) continue;

      const t = Math.max(
        0,
        Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / abLen ** 2),
      );
      const proj = [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]];
      const dist = euclidean(worldPos, proj);

      if (dist < minDist) {
        minDist = dist;
        bestStation = alignment.points[i - 1].station + t * euclidean(a, b);
      }
    }

    return {
      station: bestStation,
      position: worldPos,
    };
  }

  // ── Format & display ───────────────────────────────────

  /** Current station format */
  get format(): StationFormat {
    return this._format;
  }

  /** Set station format */
  setFormat(format: StationFormat): void {
    this._format = format;
  }

  /** Format a station number with current format */
  formatStation(metres: number): string {
    return formatStation(metres, this._format);
  }

  // ── Export ─────────────────────────────────────────────

  /** Export all alignments as JSON */
  exportJSON(): string {
    const data = this._alignments.map((a) => ({
      ...a,
      formattedTotalLength: this.formatStation(a.totalLength),
      points: a.points.map((p) => ({
        ...p,
        formattedStation: this.formatStation(p.station),
      })),
    }));
    return JSON.stringify(data, null, 2);
  }

  /** Export the active alignment as CSV */
  exportCSV(): string {
    const alignment = this.activeAlignment;
    if (!alignment) return "";

    const lines: string[] = ["Station,Formatted Station,X,Y,Z,Entity ID"];

    for (const p of alignment.points) {
      const formatted = this.formatStation(p.station);
      lines.push(
        `${p.station.toFixed(3)},${formatted},${p.position[0].toFixed(3)},${p.position[1].toFixed(3)},${p.position[2].toFixed(3)},${p.entityId ?? ""}`,
      );
    }

    return lines.join("\n");
  }

  /** Export all alignments as CSV (all alignments concatenated) */
  exportAllCSV(): string {
    const lines: string[] = [
      "Alignment ID,Alignment Name,Station,Formatted Station,X,Y,Z,Entity ID",
    ];

    for (const a of this._alignments) {
      for (const p of a.points) {
        lines.push(
          `${a.id},${a.name},${p.station.toFixed(3)},${this.formatStation(p.station)},${p.position[0].toFixed(3)},${p.position[1].toFixed(3)},${p.position[2].toFixed(3)},${p.entityId ?? ""}`,
        );
      }
    }

    return lines.join("\n");
  }

  // ── Lifecycle ──────────────────────────────────────────

  /** Remove all alignments and reset state */
  clearAll(): void {
    this.cancelManualAlignment();
    this._alignments = [];
    this._activeAlignmentId = null;
  }

  /** Destroy the tool and release resources */
  destroy(): void {
    this.cancelManualAlignment();
    this._alignments = [];
    this._activeAlignmentId = null;
    this._manualPoints = [];
  }
}
