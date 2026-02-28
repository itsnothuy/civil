/**
 * UIController.ts
 *
 * Wires DOM toolbar buttons to ViewerCore, ModelLoader, and AnnotationService.
 * Handles keyboard navigation (ARIA) and provides the base for
 * Vision Pro headset-friendly UI adaptations (Task 9 — K0).
 */

import type { ViewerCore } from "../viewer/ViewerCore";
import type { AnnotationService } from "../annotations/AnnotationService";
import type { MeasurementTool } from "../tools/MeasurementTool";
import type { AnnotationOverlay } from "../annotations/AnnotationOverlay";

export class UIController {
  private viewer: ViewerCore;
  private annotations: AnnotationService;
  private _measurementTool: MeasurementTool | null;
  private _annotationOverlay: AnnotationOverlay | null;
  private _projectId: string;

  private _activeSectionPlanes: string[] = [];
  private _sectionListCleanup: (() => void) | null = null;

  constructor(
    viewer: ViewerCore,
    annotations: AnnotationService,
    projectId?: string,
    measurementTool?: MeasurementTool,
    annotationOverlay?: AnnotationOverlay,
  ) {
    this.viewer = viewer;
    this.annotations = annotations;
    this._projectId = projectId ?? "sample";
    this._measurementTool = measurementTool ?? null;
    this._annotationOverlay = annotationOverlay ?? null;
  }

  /** Initialize all UI bindings */
  init(): void {
    this._bindToolbar();
    this._bindSearch();
    this._bindKeyboard();
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
      if (planeId) {
        this._activeSectionPlanes.push(planeId);
        this._updateSectionList();
      }
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

    // JSON Import (Task 2.4)
    this._on("btn-import-json", () => {
      const fileInput = document.getElementById("import-file-input") as HTMLInputElement | null;
      fileInput?.click();
    });

    // High-contrast toggle (Task 3.2)
    this._on("btn-high-contrast", () => {
      const isHC = document.body.classList.toggle("high-contrast");
      this._setPressed("btn-high-contrast", isHC);
      try {
        localStorage.setItem("civil-bim-high-contrast", isHC ? "1" : "0");
      } catch {
        /* localStorage unavailable */
      }
    });

    // Restore high-contrast from localStorage
    try {
      if (localStorage.getItem("civil-bim-high-contrast") === "1") {
        document.body.classList.add("high-contrast");
        this._setPressed("btn-high-contrast", true);
      }
    } catch {
      /* localStorage unavailable */
    }

    const fileInput = document.getElementById("import-file-input") as HTMLInputElement | null;
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result as string;
            const count = this.annotations.importJSON(this._projectId, text);
            this._annotationOverlay?.refresh();
            console.info(`[UIController] Imported ${count} annotation(s) from "${file.name}".`);
            this._showToast(`Imported ${count} annotation(s).`, "success");
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error(`[UIController] Import failed: ${msg}`);
            this._showToast(`Import failed: ${msg}`, "error");
          }
          // Reset input so same file can be re-imported
          fileInput.value = "";
        };
        reader.readAsText(file);
      });
    }

    // TODO (Task 8): bind btn-annotate to annotation creation flow

    // Annotation overlay toggle (Task 2.3)
    this._on("btn-annotate", () => {
      if (!this._annotationOverlay) return;
      const btn = document.getElementById("btn-annotate");
      if (this._annotationOverlay.isAdding) {
        this._annotationOverlay.stopAdding();
        btn?.setAttribute("aria-pressed", "false");
      } else {
        // Deactivate measurement modes first
        if (this._measurementTool?.isActive) {
          this._measurementTool.deactivate();
          this._setPressed("btn-measure", false);
        }
        if (this._measurementTool?.pathMode) {
          this._measurementTool.endPath();
          this._setPressed("btn-path-measure", false);
        }
        this._annotationOverlay.startAdding();
        btn?.setAttribute("aria-pressed", "true");
      }
    });

    // Measurement tool toggle (Task 2.1)
    this._on("btn-measure", () => {
      if (!this._measurementTool) return;
      // Deactivate path mode first
      if (this._measurementTool.pathMode) {
        this._measurementTool.clearPath();
        this._setPressed("btn-path-measure", false);
      }
      const btn = document.getElementById("btn-measure");
      if (this._measurementTool.isActive) {
        this._measurementTool.deactivate();
        btn?.setAttribute("aria-pressed", "false");
      } else {
        this._measurementTool.activate();
        btn?.setAttribute("aria-pressed", "true");
      }
    });

    // Path measurement toggle (Task 2.2)
    this._on("btn-path-measure", () => {
      if (!this._measurementTool) return;
      // Deactivate two-point mode first
      if (this._measurementTool.isActive) {
        this._measurementTool.deactivate();
        this._setPressed("btn-measure", false);
      }
      if (this._measurementTool.pathMode) {
        this._measurementTool.endPath();
        this._setPressed("btn-path-measure", false);
      } else {
        this._measurementTool.startPath();
        this._setPressed("btn-path-measure", true);
      }
    });
  }

  /** Update the section-plane list in the toolbar area (uses event delegation to avoid listener leaks) */
  private _updateSectionList(): void {
    let container = document.getElementById("section-list");

    // Clean up previous delegated listener
    if (this._sectionListCleanup) {
      this._sectionListCleanup();
      this._sectionListCleanup = null;
    }

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
      html += `<button class="section-chip" data-plane-id="${id}" aria-label="Remove ${id}">&#10005; ${id}</button>`;
    }
    html += `<button id="btn-clear-sections" aria-label="Clear all section planes">Clear All</button>`;
    container.innerHTML = html;

    // Single delegated listener on the container (avoids per-button listener leaks)
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;

      if (btn.id === "btn-clear-sections") {
        this.viewer.clearSectionPlanes();
        this._activeSectionPlanes = [];
        this._updateSectionList();
      } else if (btn.classList.contains("section-chip")) {
        const planeId = btn.getAttribute("data-plane-id");
        if (planeId) {
          this.viewer.removeSectionPlane(planeId);
          this._activeSectionPlanes = this._activeSectionPlanes.filter((p) => p !== planeId);
          this._updateSectionList();
        }
      }
    };

    container.addEventListener("click", handler);
    this._sectionListCleanup = () => container!.removeEventListener("click", handler);
  }

  private _bindSearch(): void {
    const input = document.getElementById("search-input") as HTMLInputElement | null;
    input?.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
      const scene = this.viewer.viewer.scene;
      const metaScene = this.viewer.viewer.metaScene;

      if (!query) {
        // Reset: show all objects, clear X-ray and highlights
        scene.setObjectsVisible(scene.objectIds, true);
        scene.setObjectsXRayed(scene.objectIds, false);
        scene.setObjectsHighlighted(scene.highlightedObjectIds, false);
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

  /** Bind global keyboard shortcuts for navigation and tool activation */
  private _bindKeyboard(): void {
    document.addEventListener("keydown", (e) => {
      // Don't intercept when user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "Tab":
          // Tab / Shift+Tab: cycle selection through objects
          e.preventDefault();
          this.viewer.cycleSelection(e.shiftKey ? "prev" : "next");
          break;
        case "Escape":
          // Escape: deselect all, cancel measurement/path, close panels
          this.viewer.selectEntity(null);
          if (this._measurementTool?.isActive) {
            this._measurementTool.deactivate();
            document.getElementById("btn-measure")?.setAttribute("aria-pressed", "false");
          }
          if (this._measurementTool?.pathMode) {
            this._measurementTool.endPath();
            document.getElementById("btn-path-measure")?.setAttribute("aria-pressed", "false");
          }
          if (this._annotationOverlay?.isAdding) {
            this._annotationOverlay.stopAdding();
            document.getElementById("btn-annotate")?.setAttribute("aria-pressed", "false");
          }
          break;
        case "m":
        case "M":
          // M: toggle measurement
          document.getElementById("btn-measure")?.click();
          break;
        case "a":
        case "A":
          // A: toggle annotation
          document.getElementById("btn-annotate")?.click();
          break;
        case "h":
        case "H":
          // H: toggle high-contrast
          document.getElementById("btn-high-contrast")?.click();
          break;
        case "f":
        case "F":
          // F: focus filter panel
          {
            const filterContainer = document.getElementById("filter-container");
            if (filterContainer) {
              const firstCheckbox =
                filterContainer.querySelector<HTMLInputElement>("input[type=checkbox]");
              firstCheckbox?.focus();
            }
          }
          break;
        case "z":
        case "Z":
          // Ctrl+Z / Cmd+Z: undo last path point
          if ((e.ctrlKey || e.metaKey) && this._measurementTool?.pathMode) {
            e.preventDefault();
            this._measurementTool.undoLastPoint();
          }
          break;
        case "x":
        case "X":
          // X: toggle X-ray
          document.getElementById("btn-xray")?.click();
          break;
      }
    });
  }

  private _on(id: string, handler: () => void): void {
    document.getElementById(id)?.addEventListener("click", handler);
  }

  private _setPressed(id: string, pressed: boolean): void {
    document.getElementById(id)?.setAttribute("aria-pressed", String(pressed));
  }

  /** Show a brief toast notification */
  private _showToast(message: string, type: "success" | "error" = "success"): void {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;
    document.body.appendChild(toast);
    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}
