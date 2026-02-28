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

export class ViewerCore {
  private canvasId: string;
  private _viewer!: Viewer;
  private _sectionPlanes!: SectionPlanesPlugin;
  private _navCube: NavCubePlugin | null = null;
  private _planeCounter = 0;
  private _currentMode: ViewMode = "3d";

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

    console.info(`[ViewerCore] Initialized with canvas #${this.canvasId}`);
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
    } else {
      this._viewer.cameraFlight.flyTo({
        aabb,
        projection: "perspective",
        duration: 0.5,
      });
    }
    console.info(`[ViewerCore] Mode → ${mode}`);
  }

  /** Toggle X-ray rendering for all objects */
  setXray(enabled: boolean): void {
    this._viewer.scene.setObjectsXRayed(this._viewer.scene.objectIds, enabled);
    console.info(`[ViewerCore] X-ray → ${enabled}`);
  }

  /** Add a section plane at the scene center and show its gizmo. Returns the plane ID. */
  addSectionPlane(): string {
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

  /** Destroy the viewer and release WebGL resources */
  destroy(): void {
    this._navCube?.destroy();
    this._sectionPlanes.clear();
    this._viewer.destroy();
    console.info("[ViewerCore] Destroyed.");
  }
}
