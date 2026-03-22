/**
 * StoreyNavigator.ts
 *
 * Floor/storey-aware 2D plan navigation. Extracts IfcBuildingStorey
 * data from the model metadata. Provides a storey selector UI,
 * filters visible objects per storey, and navigates between floors.
 *
 * Phase 5, Task 5.1
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Escape HTML special characters */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Represents a single building storey extracted from IFC metadata */
export interface StoreyInfo {
  /** Metadata object ID for the storey */
  id: string;
  /** Human-readable name (e.g. "Ground Floor", "Level 1") */
  name: string;
  /** Elevation in model units (metres) — extracted from metadata if available */
  elevation: number;
  /** All object IDs that belong to this storey (children in the containment tree) */
  objectIds: string[];
}

export class StoreyNavigator {
  private _viewer: ViewerCore;
  private _containerId: string;
  private _storeys: StoreyInfo[] = [];
  private _activeStoreyId: string | null = null;
  private _showAllMode = true;

  constructor(viewer: ViewerCore, containerId: string) {
    this._viewer = viewer;
    this._containerId = containerId;
  }

  /** Build storey list from metadata and render the selector UI */
  init(): void {
    this._extractStoreys();
    this._render();
    this._bindEvents();
    console.info(`[StoreyNavigator] Initialized with ${this._storeys.length} storey(s).`);
  }

  // ── Data extraction ──────────────────────────────────────

  /** Extract IfcBuildingStorey objects from the metaScene hierarchy */
  private _extractStoreys(): void {
    this._storeys = [];
    const metaScene = this._viewer.viewer.metaScene;
    const metaObjects = metaScene.metaObjects;

    for (const id of Object.keys(metaObjects)) {
      const meta = metaObjects[id];
      if (meta.type !== "IfcBuildingStorey") continue;

      const elevation = this._parseElevation(meta);
      const objectIds = this._collectChildObjectIds(meta);

      this._storeys.push({
        id,
        name: meta.name ?? `Storey ${id}`,
        elevation,
        objectIds,
      });
    }

    // Sort storeys by elevation (lowest first)
    this._storeys.sort((a, b) => a.elevation - b.elevation);
  }

  /** Try to extract elevation from property sets or name */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _parseElevation(meta: any): number {
    // Check property sets for Elevation
    if (meta.propertySets) {
      for (const ps of meta.propertySets) {
        if (ps.properties) {
          for (const prop of ps.properties) {
            if (prop.name?.toLowerCase() === "elevation" && typeof prop.value === "number") {
              return prop.value;
            }
          }
        }
      }
    }

    // Fallback: try to parse elevation from the name (e.g., "Level 1 (+3.000)")
    const match = meta.name?.match(/[+-]?\d+\.?\d*/);
    if (match) {
      return parseFloat(match[0]);
    }

    return 0;
  }

  /** Recursively collect all child object IDs under a metaObject */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _collectChildObjectIds(metaObject: any): string[] {
    const ids: string[] = [];
    const scene = this._viewer.viewer.scene;

    // Include this object if it exists in the scene
    if (scene.objects[metaObject.id]) {
      ids.push(metaObject.id);
    }

    // Recurse into children
    if (metaObject.children) {
      for (const child of metaObject.children) {
        ids.push(...this._collectChildObjectIds(child));
      }
    }

    return ids;
  }

  // ── Public API ──────────────────────────────────────────

  /** All extracted storeys (sorted by elevation) */
  get storeys(): ReadonlyArray<StoreyInfo> {
    return this._storeys;
  }

  /** Currently active storey ID, or null if showing all */
  get activeStoreyId(): string | null {
    return this._activeStoreyId;
  }

  /** Whether "show all storeys" mode is active */
  get showAllMode(): boolean {
    return this._showAllMode;
  }

  /**
   * Navigate to a specific storey.
   * Filters visible objects to that storey and switches to 2D plan view.
   */
  goToStorey(storeyId: string): void {
    const storey = this._storeys.find((s) => s.id === storeyId);
    if (!storey) {
      console.warn(`[StoreyNavigator] Storey "${storeyId}" not found.`);
      return;
    }

    this._activeStoreyId = storeyId;
    this._showAllMode = false;
    const scene = this._viewer.viewer.scene;

    // Collect all storey object IDs and hide everything else
    const allStoreyObjIds = new Set<string>();
    for (const s of this._storeys) {
      for (const oid of s.objectIds) allStoreyObjIds.add(oid);
    }

    // Hide all objects first
    scene.setObjectsVisible(scene.objectIds, false);
    // Show only objects in the selected storey
    const validIds = storey.objectIds.filter((id) => scene.objects[id]);
    scene.setObjectsVisible(validIds, true);

    // Switch to 2D plan view centred on the storey
    this._flyToStorey(storey);

    this._render();
    console.info(`[StoreyNavigator] Navigated to storey "${storey.name}".`);
  }

  /** Navigate to next storey (up) */
  goToNextStorey(): void {
    if (this._storeys.length === 0) return;
    const idx = this._storeys.findIndex((s) => s.id === this._activeStoreyId);
    const nextIdx = idx < this._storeys.length - 1 ? idx + 1 : 0;
    this.goToStorey(this._storeys[nextIdx].id);
  }

  /** Navigate to previous storey (down) */
  goToPreviousStorey(): void {
    if (this._storeys.length === 0) return;
    const idx = this._storeys.findIndex((s) => s.id === this._activeStoreyId);
    const prevIdx = idx > 0 ? idx - 1 : this._storeys.length - 1;
    this.goToStorey(this._storeys[prevIdx].id);
  }

  /** Show all storeys (reset filter) and switch back to 3D */
  showAll(): void {
    this._activeStoreyId = null;
    this._showAllMode = true;

    const scene = this._viewer.viewer.scene;
    scene.setObjectsVisible(scene.objectIds, true);
    this._viewer.setMode("3d");

    this._render();
    console.info("[StoreyNavigator] Showing all storeys.");
  }

  /**
   * Focus on an object: if the object belongs to a storey, navigate to
   * that storey and highlight the object. Used for plan-to-3D sync.
   */
  focusObject(objectId: string): void {
    const scene = this._viewer.viewer.scene;
    const entity = scene.objects[objectId];
    if (!entity) return;

    // Find which storey contains this object
    const storey = this._storeys.find((s) => s.objectIds.includes(objectId));
    if (storey && this._activeStoreyId !== storey.id) {
      this.goToStorey(storey.id);
    }

    // Select and fly to the entity
    this._viewer.selectEntity(objectId);
    this._viewer.viewer.cameraFlight.flyTo({
      aabb: entity.aabb,
      duration: 0.5,
    });
  }

  // ── Camera ──────────────────────────────────────────────

  /** Fly camera to a top-down plan view of a storey */
  private _flyToStorey(storey: StoreyInfo): void {
    const scene = this._viewer.viewer.scene;
    const validIds = storey.objectIds.filter((id) => scene.objects[id]);

    if (validIds.length === 0) {
      // Fallback: use scene AABB at storey elevation
      const aabb = scene.getAABB(scene.objectIds);
      const cx = (aabb[0] + aabb[3]) / 2;
      const cz = (aabb[2] + aabb[5]) / 2;
      this._viewer.viewer.cameraFlight.flyTo({
        eye: [cx, storey.elevation + 50, cz],
        look: [cx, storey.elevation, cz],
        up: [0, 0, -1],
        projection: "ortho",
        duration: 0.5,
      });
    } else {
      // Compute AABB of storey objects
      const aabb = scene.getAABB(validIds);
      const cx = (aabb[0] + aabb[3]) / 2;
      const cy = (aabb[1] + aabb[4]) / 2;
      const cz = (aabb[2] + aabb[5]) / 2;
      const height = aabb[4] - aabb[1];

      this._viewer.viewer.cameraFlight.flyTo({
        eye: [cx, cy + Math.max(height * 3, 20), cz],
        look: [cx, cy, cz],
        up: [0, 0, -1],
        projection: "ortho",
        duration: 0.5,
      });
    }

    // Set planView navigation mode
    this._viewer.viewer.cameraControl.navMode = "planView";
  }

  // ── UI Rendering ────────────────────────────────────────

  /** Render the storey selector dropdown and navigation buttons */
  private _render(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    if (this._storeys.length === 0) {
      container.innerHTML = `<p class="muted storey-empty">No storeys found in model.</p>`;
      return;
    }

    let html = `<h4>Storeys</h4>`;
    html += `<div class="storey-nav">`;
    html += `<select id="storey-select" aria-label="Select building storey">`;
    html += `<option value="__all__" ${this._showAllMode ? "selected" : ""}>All Storeys</option>`;

    for (const storey of this._storeys) {
      const selected = storey.id === this._activeStoreyId ? "selected" : "";
      const label = `${esc(storey.name)} (${storey.objectIds.length} objects)`;
      html += `<option value="${esc(storey.id)}" ${selected}>${label}</option>`;
    }

    html += `</select>`;
    html += `<div class="storey-buttons">`;
    html += `<button id="storey-up" aria-label="Go to upper storey" ${this._storeys.length <= 1 ? "disabled" : ""}>&#9650; Up</button>`;
    html += `<button id="storey-down" aria-label="Go to lower storey" ${this._storeys.length <= 1 ? "disabled" : ""}>&#9660; Down</button>`;
    html += `</div>`;
    html += `</div>`;

    container.innerHTML = html;
  }

  /** Bind event listeners */
  private _bindEvents(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    container.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.id !== "storey-select") return;

      if (target.value === "__all__") {
        this.showAll();
      } else {
        this.goToStorey(target.value);
      }
    });

    container.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;

      if (btn.id === "storey-up") this.goToNextStorey();
      else if (btn.id === "storey-down") this.goToPreviousStorey();
    });
  }

  /** Destroy and clean up */
  destroy(): void {
    const container = document.getElementById(this._containerId);
    if (container) container.innerHTML = "";
    this._storeys = [];
    this._activeStoreyId = null;
  }
}
