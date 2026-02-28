/**
 * main.ts — Entry point for the Civil BIM Viewer
 *
 * Task 1 (K0): Fork and integrate xeokit-bim-viewer as the viewer core.
 * This file bootstraps the viewer, wires up modules, and loads a model
 * identified by the `?projectId=<id>` query parameter.
 */

import { ViewerCore } from "./viewer/ViewerCore";
import { ModelLoader } from "./loader/ModelLoader";
import { AnnotationService } from "./annotations/AnnotationService";
import { UIController } from "./ui/UIController";

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId") ?? "sample";

  // --- Viewer Core (xeokit) ---
  const viewer = new ViewerCore("viewer-canvas");

  // --- Model Loader ---
  const loader = new ModelLoader(viewer);
  try {
    await loader.loadProject(projectId);
  } catch {
    console.warn(`[CivilBIMViewer] Could not load project "${projectId}" — viewer is empty.`);
  }

  // --- Annotations ---
  const annotations = new AnnotationService(viewer);
  annotations.loadFromLocalStorage(projectId);

  // --- UI wiring ---
  const ui = new UIController(viewer, loader, annotations);
  ui.init();

  console.info(`[CivilBIMViewer] Project "${projectId}" loaded.`);
}

init().catch((err) => {
  console.error("[CivilBIMViewer] Initialization failed:", err);
});
