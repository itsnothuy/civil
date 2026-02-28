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

  private _activeSectionPlanes: string[] = [];

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
      this._activeSectionPlanes.push(planeId);
      this._updateSectionList();
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

  /** Update the section-plane list in the toolbar area */
  private _updateSectionList(): void {
    let container = document.getElementById("section-list");
    if (!container) {
      container = document.createElement("div");
      container.id = "section-list";
      container.setAttribute("aria-label", "Active section planes");
      document.getElementById("toolbar")?.appendChild(container);
    }

    if (this._activeSectionPlanes.length === 0) {
      container.innerHTML = "";
      return;
    }

    let html = "";
    for (const id of this._activeSectionPlanes) {
      html += `<button class="section-chip" data-plane-id="${id}" aria-label="Remove ${id}">✕ ${id}</button>`;
    }
    html += `<button id="btn-clear-sections" aria-label="Clear all section planes">Clear All</button>`;
    container.innerHTML = html;

    // Bind remove buttons
    container.querySelectorAll<HTMLButtonElement>(".section-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const planeId = btn.dataset.planeId;
        if (planeId) {
          this.viewer.removeSectionPlane(planeId);
          this._activeSectionPlanes = this._activeSectionPlanes.filter((p) => p !== planeId);
          this._updateSectionList();
        }
      });
    });

    // Bind clear-all
    document.getElementById("btn-clear-sections")?.addEventListener("click", () => {
      this.viewer.clearSectionPlanes();
      this._activeSectionPlanes = [];
      this._updateSectionList();
    });
  }

  private _bindSearch(): void {
    const input = document.getElementById("search-input") as HTMLInputElement | null;
    input?.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
      const scene = this.viewer.viewer.scene;
      const metaScene = this.viewer.viewer.metaScene;

      if (!query) {
        // Reset: show all objects, clear X-ray
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsXRayed(scene.objectIds, false);
        return;
      }

      // Search meta-objects by name or IFC type
      const matchedIds: string[] = [];
      for (const id of Object.keys(metaScene.metaObjects)) {
        const meta = metaScene.metaObjects[id];
        const name = (meta.name ?? "").toLowerCase();
        const type = (meta.type ?? "").toLowerCase();
        if (name.includes(query) || type.includes(query)) {
          matchedIds.push(id);
        }
      }

      // X-ray non-matching, highlight matching
      scene.setObjectsXRayed(scene.objectIds, true);
      scene.setObjectsXRayed(matchedIds, false);
      scene.setObjectsHighlighted(scene.highlightedObjectIds, false);
      scene.setObjectsHighlighted(matchedIds, true);
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
