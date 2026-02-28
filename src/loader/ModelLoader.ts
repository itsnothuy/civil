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

export interface ProjectConfig {
  id: string;
  name: string;
  modelUrl: string;
  metadataUrl: string;
}

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
      sceneModel.on("loaded", () => {
        this._viewer.viewer.cameraFlight.flyTo(sceneModel);
        console.info(`[ModelLoader] Project "${projectId}" loaded successfully.`);
        resolve();
      });

      sceneModel.on("error", (msg: string) => {
        console.error(`[ModelLoader] Failed to load project "${projectId}": ${msg}`);
        // Show user-facing error
        const panel = document.getElementById("properties-panel");
        if (panel) {
          panel.innerHTML = `<p class="error">Failed to load model: ${msg}</p>`;
        }
        reject(new Error(msg));
      });
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
