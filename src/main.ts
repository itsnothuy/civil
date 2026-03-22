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
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { TreeView } from "./ui/TreeView";
import { MeasurementTool } from "./tools/MeasurementTool";
import { ChainStationingTool } from "./tools/ChainStationingTool";
import { AnnotationOverlay } from "./annotations/AnnotationOverlay";
import { FilterPanel } from "./ui/FilterPanel";
import { StoreyNavigator } from "./ui/StoreyNavigator";

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId") ?? "sample";

  // --- Viewer Core (xeokit) ---
  const viewer = new ViewerCore("viewer-canvas");

  // --- Annotations ---
  const annotations = new AnnotationService(viewer);
  annotations.loadFromLocalStorage(projectId);

  // --- Measurement tool ---
  const measurementTool = new MeasurementTool(viewer);

  // --- Chain/Stationing tool (Task 5.2) ---
  const chainStationingTool = new ChainStationingTool(viewer);

  // --- Annotation overlay (3D markers) ---
  const annotationOverlay = new AnnotationOverlay(viewer, annotations, projectId);

  // --- UI wiring (initialize before model load so UI is interactive immediately) ---
  const ui = new UIController(viewer, annotations, projectId, measurementTool, annotationOverlay);
  ui.init();

  // --- Layer/discipline filter panel ---
  const filterPanel = new FilterPanel(viewer, "filter-panel");
  filterPanel.init();

  // --- Storey navigator (Task 5.1) ---
  const storeyNavigator = new StoreyNavigator(viewer, "storey-panel");
  storeyNavigator.init();

  // --- Model tree (left panel) ---
  const _treeView = new TreeView(viewer, "tree-view");

  // --- Properties panel (click-to-select) ---
  const propertiesPanel = new PropertiesPanel(viewer);
  viewer.onSelect((entityId) => {
    if (entityId) {
      propertiesPanel.show(entityId);
      _treeView.showNode(entityId);
    } else {
      propertiesPanel.hide();
    }
  });

  // --- Model Loader (non-blocking — UI works even if model fails) ---
  const loader = new ModelLoader(viewer);
  try {
    await loader.loadProject(projectId);
    // Rebuild filter panel and storey navigator once model metadata is available
    filterPanel.init();
    storeyNavigator.init();
    // Auto-detect IfcAlignment for stationing
    chainStationingTool.detectAlignments();
  } catch {
    console.warn(`[CivilBIMViewer] Could not load project "${projectId}" — viewer is empty.`);
  }

  console.info(`[CivilBIMViewer] Project "${projectId}" loaded.`);
}

init().catch((err) => {
  console.error("[CivilBIMViewer] Initialization failed:", err);
});
