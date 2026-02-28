/**
 * ViewerCore.ts
 *
 * Wraps the xeokit Viewer instance (Task 1 — K0).
 * Provides 3D/2D modes, camera controls, section planes,
 * X-ray, and a JS API for extensions.
 *
 * Depends on: @xeokit/xeokit-sdk
 * License note: xeokit-sdk is AGPL-3.0. All modifications must be released
 * under AGPL unless a commercial license is obtained.
 */

import { Viewer, SectionPlanesPlugin, NavCubePlugin } from "@xeokit/xeokit-sdk";

export type ViewMode = "3d" | "2d";

/** Callback fired when an object is selected or deselected */
export type SelectionCallback = (entityId: string | null, worldPos: number[] | null) => void;

/** Maximum number of section planes allowed */
const MAX_SECTION_PLANES = 6;

export class ViewerCore {
  private canvasId: string;
  private _viewer!: Viewer;
  private _sectionPlanes!: SectionPlanesPlugin;
  private _navCube: NavCubePlugin | null = null;
  private _planeCounter = 0;
  private _currentMode: ViewMode = "3d";
  private _selectListeners: SelectionCallback[] = [];
  private _pickedSub: unknown = null;
  private _pickedNothingSub: unknown = null;

  constructor(canvasId: string) {
    this.canvasId = canvasId;
    this._initViewer();
  }

  /** The underlying xeokit Viewer — exposed for plugins and ModelLoader */
  get viewer(): Viewer {
    return this._viewer;
  }

  /** Current view mode */
  get mode(): ViewMode {
    return this._currentMode;
  }

  private _initViewer(): void {
    this._viewer = new Viewer({
      canvasId: this.canvasId,
      transparent: true,
      saoEnabled: false,
      pbrEnabled: false,
      dtxEnabled: true,
      antialias: true,
    });

    // Configure X-ray appearance
    const xrayMat = this._viewer.scene.xrayMaterial;
    xrayMat.fill = true;
    xrayMat.fillAlpha = 0.1;
    xrayMat.fillColor = [0, 0, 0];
    xrayMat.edgeAlpha = 0.3;
    xrayMat.edgeColor = [0, 0, 0];

    // Configure highlight appearance
    const hlMat = this._viewer.scene.highlightMaterial;
    hlMat.fill = true;
    hlMat.edges = true;
    hlMat.fillAlpha = 0.3;
    hlMat.edgeColor = [1, 1, 0];

    // Section planes plugin
    this._sectionPlanes = new SectionPlanesPlugin(this._viewer);

    // NavCube (optional — only if DOM element exists)
    const navCubeCanvas = document.getElementById("nav-cube-canvas");
    if (navCubeCanvas) {
      this._navCube = new NavCubePlugin(this._viewer, {
        canvasId: "nav-cube-canvas",
        visible: true,
        cameraFly: true,
        cameraFlyDuration: 0.5,
      });
    }

    // Default camera
    this._viewer.camera.eye = [-10, 10, -10];
    this._viewer.camera.look = [0, 0, 0];
    this._viewer.camera.up = [0, 1, 0];

    // Wire object picking (click-to-select)
    this._initSelection();

    // Handle WebGL context loss/restore
    this._initContextLossHandling();

    console.info(`[ViewerCore] Initialized with canvas #${this.canvasId}`);
  }

  /** Wire canvas click → pick → select/highlight → callback */
  private _initSelection(): void {
    this._pickedSub = this._viewer.cameraControl.on("picked", (pickResult) => {
      // Clear previous selection
      this._viewer.scene.setObjectsSelected(this._viewer.scene.selectedObjectIds, false);
      this._viewer.scene.setObjectsHighlighted(this._viewer.scene.highlightedObjectIds, false);

      const entity = pickResult.entity;
      if (entity) {
        entity.selected = true;
        entity.highlighted = true;
        const worldPos = pickResult.worldPos ?? null;
        this._fireSelect(String(entity.id), worldPos);
      }
    });

    this._pickedNothingSub = this._viewer.cameraControl.on("pickedNothing", () => {
      this._viewer.scene.setObjectsSelected(this._viewer.scene.selectedObjectIds, false);
      this._viewer.scene.setObjectsHighlighted(this._viewer.scene.highlightedObjectIds, false);
      this._fireSelect(null, null);
    });
  }

  /** Handle WebGL context loss and restoration */
  private _initContextLossHandling(): void {
    const canvasEl = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
    if (!canvasEl) return;

    canvasEl.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("[ViewerCore] WebGL context lost. Awaiting restoration…");
    });

    canvasEl.addEventListener("webglcontextrestored", () => {
      console.info("[ViewerCore] WebGL context restored.");
    });
  }

  /** Fire all registered selection callbacks */
  private _fireSelect(entityId: string | null, worldPos: number[] | null): void {
    for (const cb of this._selectListeners) {
      cb(entityId, worldPos);
    }
  }

  /**
   * Programmatically select an entity (used by TreeView for syncing).
   * Clears previous selection, highlights the entity, and fires listeners.
   */
  selectEntity(entityId: string | null): void {
    this._viewer.scene.setObjectsSelected(this._viewer.scene.selectedObjectIds, false);
    this._viewer.scene.setObjectsHighlighted(this._viewer.scene.highlightedObjectIds, false);

    if (entityId) {
      const entity = this._viewer.scene.objects[entityId];
      if (entity) {
        entity.selected = true;
        entity.highlighted = true;
        this._fireSelect(entityId, null);
      }
    } else {
      this._fireSelect(null, null);
    }
  }

  /**
   * Register a callback for object selection changes.
   * Multiple listeners can be registered; returns an unsubscribe function.
   */
  onSelect(callback: SelectionCallback): () => void {
    this._selectListeners.push(callback);
    return () => {
      this._selectListeners = this._selectListeners.filter((cb) => cb !== callback);
    };
  }

  /** Switch between 3D orbit and 2D orthographic plan view */
  setMode(mode: ViewMode): void {
    this._currentMode = mode;
    const aabb = this._viewer.scene.getAABB(this._viewer.scene.objectIds);
    const cx = (aabb[0] + aabb[3]) / 2;
    const cy = (aabb[1] + aabb[4]) / 2;
    const cz = (aabb[2] + aabb[5]) / 2;

    if (mode === "2d") {
      this._viewer.cameraFlight.flyTo({
        eye: [cx, aabb[4] + 50, cz],
        look: [cx, cy, cz],
        up: [0, 0, -1],
        projection: "ortho",
        duration: 0.5,
      });
      // Disable orbit in 2D, allow only pan/zoom (first-person style)
      this._viewer.cameraControl.navMode = "planView";
    } else {
      this._viewer.cameraFlight.flyTo({
        aabb,
        projection: "perspective",
        duration: 0.5,
      });
      // Restore orbit navigation in 3D
      this._viewer.cameraControl.navMode = "orbit";
    }
    console.info(`[ViewerCore] Mode → ${mode}`);
  }

  /** Toggle X-ray rendering for all objects */
  setXray(enabled: boolean): void {
    this._viewer.scene.setObjectsXRayed(this._viewer.scene.objectIds, enabled);
    console.info(`[ViewerCore] X-ray → ${enabled}`);
  }

  /** Add a section plane at the scene center and show its gizmo. Returns the plane ID, or null if limit reached. */
  addSectionPlane(): string | null {
    if (this._planeCounter >= MAX_SECTION_PLANES) {
      console.warn(`[ViewerCore] Maximum section planes (${MAX_SECTION_PLANES}) reached.`);
      return null;
    }
    const aabb = this._viewer.scene.getAABB(this._viewer.scene.objectIds);
    const center: [number, number, number] = [
      (aabb[0] + aabb[3]) / 2,
      (aabb[1] + aabb[4]) / 2,
      (aabb[2] + aabb[5]) / 2,
    ];
    const id = `section-${++this._planeCounter}`;
    this._sectionPlanes.createSectionPlane({
      id,
      pos: center,
      dir: [0, -1, 0],
    });
    this._sectionPlanes.showControl(id);
    console.info(`[ViewerCore] Section plane "${id}" added.`);
    return id;
  }

  /** Remove a specific section plane by ID */
  removeSectionPlane(id: string): void {
    this._sectionPlanes.destroySectionPlane(id);
  }

  /** Remove all section planes */
  clearSectionPlanes(): void {
    this._sectionPlanes.clear();
    this._planeCounter = 0;
  }

  /** Export all section plane positions/directions as JSON-serializable data */
  exportSectionPlanes(): Array<{ id: string; pos: number[]; dir: number[] }> {
    const result: Array<{ id: string; pos: number[]; dir: number[] }> = [];
    const planes = this._sectionPlanes.sectionPlanes;
    for (const id in planes) {
      if (Object.prototype.hasOwnProperty.call(planes, id)) {
        const plane = planes[id];
        result.push({
          id: plane.id,
          pos: Array.from(plane.pos),
          dir: Array.from(plane.dir),
        });
      }
    }
    return result;
  }

  /**
   * Cycle selection to the next/previous object in the scene.
   * Used for Tab-key keyboard navigation.
   */
  cycleSelection(direction: "next" | "prev" = "next"): void {
    const objectIds = this._viewer.scene.objectIds;
    if (objectIds.length === 0) return;

    const currentSelected = this._viewer.scene.selectedObjectIds;
    let currentIndex = -1;
    if (currentSelected.length > 0) {
      currentIndex = objectIds.indexOf(currentSelected[0]);
    }

    let nextIndex: number;
    if (direction === "next") {
      nextIndex = currentIndex < objectIds.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : objectIds.length - 1;
    }

    const nextId = objectIds[nextIndex];
    this.selectEntity(nextId);

    // Fly to selected entity
    const entity = this._viewer.scene.objects[nextId];
    if (entity) {
      this._viewer.cameraFlight.flyTo({ aabb: entity.aabb, duration: 0.3 });
    }
  }

  /** Destroy the viewer and release WebGL resources */
  destroy(): void {
    this._selectListeners = [];
    this._navCube?.destroy();
    this._sectionPlanes.clear();
    this._viewer.destroy();
    console.info("[ViewerCore] Destroyed.");
  }
}
