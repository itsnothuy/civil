/**
 * ModelLoader.ts
 *
 * Loads converted glTF/GLB models into the viewer (Task 3 — K0).
 * Reads project metadata from data/<projectId>/metadata.json and
 * loads model.glb via xeokit's GLTFLoaderPlugin.
 *
 * Pipeline (static hosting):
 *   IFC → ifcConvert (IfcOpenShell) → model.glb → data/<projectId>/
 * See: scripts/convert-ifc.mjs
 */

import { GLTFLoaderPlugin } from "@xeokit/xeokit-sdk";

import type { ViewerCore } from "../viewer/ViewerCore";

export class ModelLoader {
  private _viewer: ViewerCore;
  private _gltfLoader: GLTFLoaderPlugin;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
    this._gltfLoader = new GLTFLoaderPlugin(viewer.viewer);
  }

  /**
   * Load a project by ID.
   * Expects files at: /data/<projectId>/model.glb and /data/<projectId>/metadata.json
   */
  async loadProject(projectId: string): Promise<void> {
    const basePath = `./data/${projectId}`;
    const modelUrl = `${basePath}/model.glb`;
    const metadataUrl = `${basePath}/metadata.json`;

    const sceneModel = this._gltfLoader.load({
      id: projectId,
      src: modelUrl,
      metaModelSrc: metadataUrl,
      edges: true,
    });

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      sceneModel.on("loaded", () => {
        if (settled) return;
        settled = true;
        this._viewer.viewer.cameraFlight.flyTo(sceneModel);
        console.info(`[ModelLoader] Project "${projectId}" loaded successfully.`);
        resolve();
      });

      sceneModel.on("error", (msg: string) => {
        if (settled) return;
        settled = true;
        console.error(`[ModelLoader] Failed to load project "${projectId}": ${msg}`);
        // Show user-facing error (escape HTML to prevent XSS)
        const panel = document.getElementById("properties-panel");
        if (panel) {
          const safeMsg = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          panel.innerHTML = `<p class="error">Failed to load model: ${safeMsg}</p>`;
        }
        reject(new Error(msg));
      });

      // Timeout to prevent hanging if neither event fires
      setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(`[ModelLoader] Timed out loading project "${projectId}".`);
        reject(new Error(`Model load timed out for "${projectId}".`));
      }, 30000);
    });
  }

  /** Unload all models from the scene */
  unloadAll(): void {
    const models = this._viewer.viewer.scene.models;
    for (const id in models) {
      if (Object.prototype.hasOwnProperty.call(models, id)) {
        models[id].destroy();
      }
    }
    console.info("[ModelLoader] All models unloaded.");
  }
}
