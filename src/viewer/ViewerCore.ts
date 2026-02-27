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

// TODO (Task 1): Replace stub with real xeokit Viewer after `npm install`
// import { Viewer } from "@xeokit/xeokit-sdk";

export type ViewMode = "3d" | "2d";

export class ViewerCore {
  private canvasId: string;
  // viewer: Viewer;  // uncomment after installing @xeokit/xeokit-sdk

  constructor(canvasId: string) {
    this.canvasId = canvasId;
    this._initViewer();
  }

  private _initViewer(): void {
    // TODO (Task 1): Initialize xeokit Viewer
    // this.viewer = new Viewer({
    //   canvasId: this.canvasId,
    //   transparent: true,
    // });
    console.info(`[ViewerCore] Canvas target: #${this.canvasId}`);
  }

  /** Switch between 3D orbit and 2D orthographic plan view */
  setMode(mode: ViewMode): void {
    // TODO (Task 1): Use xeokit CameraFlightAnimation + ortho projection
    console.info(`[ViewerCore] Mode → ${mode}`);
  }

  /** Toggle X-ray rendering for all objects */
  setXray(enabled: boolean): void {
    // TODO: viewer.scene.setObjectsXRayed(viewer.scene.objectIds, enabled);
    console.info(`[ViewerCore] X-ray → ${enabled}`);
  }

  /** Add a section plane */
  addSectionPlane(): void {
    // TODO: new SectionPlanesPlugin(viewer).createSectionPlane(...)
    console.info("[ViewerCore] Section plane added.");
  }

  /** Destroy the viewer and release WebGL resources */
  destroy(): void {
    // TODO: this.viewer.destroy();
    console.info("[ViewerCore] Destroyed.");
  }
}
