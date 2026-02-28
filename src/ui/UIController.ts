/**
 * UIController.ts
 *
 * Wires DOM toolbar buttons to ViewerCore, ModelLoader, and AnnotationService.
 * Handles keyboard navigation (ARIA) and provides the base for
 * Vision Pro headset-friendly UI adaptations (Task 9 — K0).
 */

import type { ViewerCore } from "../viewer/ViewerCore";
import type { ModelLoader } from "../loader/ModelLoader";
import type { AnnotationService } from "../annotations/AnnotationService";

export class UIController {
  private viewer: ViewerCore;
  // Stub: will be used for model reload/switch UI (Task 1)
  private _loader: ModelLoader;
  private annotations: AnnotationService;

  constructor(viewer: ViewerCore, loader: ModelLoader, annotations: AnnotationService) {
    this.viewer = viewer;
    this._loader = loader;
    this.annotations = annotations;
  }

  init(): void {
    this._bindToolbar();
    this._bindSearch();
    this._detectHeadsetMode();
    console.info("[UIController] Initialized.");
  }

  private _bindToolbar(): void {
    this._on("btn-3d", () => {
      this.viewer.setMode("3d");
      this._setPressed("btn-3d", true);
      this._setPressed("btn-2d", false);
    });

    this._on("btn-2d", () => {
      this.viewer.setMode("2d");
      this._setPressed("btn-3d", false);
      this._setPressed("btn-2d", true);
    });

    this._on("btn-xray", () => {
      const btn = document.getElementById("btn-xray");
      const active = btn?.getAttribute("aria-pressed") === "true";
      this.viewer.setXray(!active);
      btn?.setAttribute("aria-pressed", String(!active));
    });

    this._on("btn-section", () => {
      const planeId = this.viewer.addSectionPlane();
      console.info(`[UIController] Section plane created: ${planeId}`);
    });

    this._on("btn-export-bcf", () => {
      const json = this.annotations.exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "annotations.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    // TODO (Task 8): bind btn-measure to MeasurementTool
    // TODO (Task 8): bind btn-annotate to annotation creation flow
  }

  private _bindSearch(): void {
    const input = document.getElementById("search-input") as HTMLInputElement | null;
    input?.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      // TODO (Task 1): filter xeokit scene objects by name/IFC type
      console.info(`[UIController] Search: "${query}"`);
    });
  }

  /**
   * Vision Pro / XR headset detection (Task 9 — K0, F1).
   * Applies larger touch targets and simplified layout when running
   * on visionOS or other headset browsers.
   */
  private _detectHeadsetMode(): void {
    const isVisionOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      (navigator as Navigator & { standalone?: boolean }).standalone === undefined &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    if (isVisionOS || navigator.userAgent.includes("VisionOS")) {
      document.body.classList.add("headset-mode");
      console.info("[UIController] Headset mode enabled.");
    }
  }

  private _on(id: string, handler: () => void): void {
    document.getElementById(id)?.addEventListener("click", handler);
  }

  private _setPressed(id: string, pressed: boolean): void {
    document.getElementById(id)?.setAttribute("aria-pressed", String(pressed));
  }
}
