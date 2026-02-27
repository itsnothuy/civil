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

import type { ViewerCore } from "../viewer/ViewerCore";

export interface ProjectConfig {
  id: string;
  name: string;
  modelUrl: string;
  metadataUrl: string;
}

export class ModelLoader {
  // Stub: will be read when xeokit is integrated (Task 1)
  private _viewer: ViewerCore;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  /**
   * Load a project by ID.
   * Expects files at: /data/<projectId>/model.glb and /data/<projectId>/metadata.json
   */
  async loadProject(projectId: string): Promise<void> {
    const basePath = `./data/${projectId}`;
    const metadataUrl = `${basePath}/metadata.json`;
    const modelUrl = `${basePath}/model.glb`;

    let metadata: Record<string, unknown> = {};
    try {
      const res = await fetch(metadataUrl);
      if (res.ok) {
        metadata = await res.json();
      } else {
        console.warn(`[ModelLoader] No metadata found at ${metadataUrl}`);
      }
    } catch {
      console.warn(`[ModelLoader] Failed to fetch metadata for project "${projectId}"`);
    }

    // TODO (Task 1): Load model via xeokit GLTFLoaderPlugin
    // const gltfLoader = new GLTFLoaderPlugin(this.viewer.viewer);
    // const model = gltfLoader.load({ id: projectId, src: modelUrl, metaModelSrc: metadataUrl });
    console.info(`[ModelLoader] Loading project "${projectId}" from ${modelUrl}`, metadata);
  }

  /** Unload all models from the scene */
  unloadAll(): void {
    // TODO: this.viewer.viewer.scene.models.forEach(m => m.destroy());
    console.info("[ModelLoader] All models unloaded.");
  }
}
