/**
 * AnnotationOverlay.ts
 *
 * Renders AnnotationService entries as 3D markers in the xeokit scene
 * using AnnotationsPlugin. Supports "add annotation" mode where clicking
 * an object creates a new annotation.
 *
 * Phase 2, Task 2.3 — 3D Annotation Overlays
 */

import { AnnotationsPlugin } from "@xeokit/xeokit-sdk";

import type { ViewerCore } from "../viewer/ViewerCore";

import type { AnnotationService, Annotation as AnnotationData } from "./AnnotationService";

/** Escape HTML entities for safe insertion */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class AnnotationOverlay {
  private _viewer: ViewerCore;
  private _annotations: AnnotationService;
  private _projectId: string;
  private _plugin: AnnotationsPlugin;
  private _addMode = false;
  private _pickSub: unknown = null;
  private _formEl: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _pendingPick: any = null;

  constructor(viewer: ViewerCore, annotations: AnnotationService, projectId: string) {
    this._viewer = viewer;
    this._annotations = annotations;
    this._projectId = projectId;

    const container = document.getElementById("viewer-container") ?? document.body;

    this._plugin = new AnnotationsPlugin(viewer.viewer, {
      markerHTML: `<div class="ann-marker" title="{{title}}">📌</div>`,
      labelHTML: `<div class="ann-label">
        <strong>{{title}}</strong><br/>
        <span>{{comment}}</span><br/>
        <em>{{author}} — {{severity}}</em>
      </div>`,
      container,
      surfaceOffset: 0.3,
    });

    // Toggle label on marker click
    this._plugin.on("markerClicked", (annotation) => {
      const shown = annotation.getLabelShown();
      annotation.setLabelShown(!shown);
    });

    // Build the inline annotation form (hidden initially)
    this._buildForm(container);

    // Sync existing annotations from service
    this._syncFromService();
    console.info(
      `[AnnotationOverlay] Initialized with ${this._annotations.list().length} marker(s).`,
    );
  }

  // ── Sync ────────────────────────────────────────────────

  /** Recreate xeokit markers from AnnotationService data */
  refresh(): void {
    this._syncFromService();
  }

  private _syncFromService(): void {
    this._plugin.clear();
    for (const ann of this._annotations.list()) {
      this._createMarker(ann);
    }
  }

  private _createMarker(ann: AnnotationData): void {
    const worldPos = ann.anchor.worldPos ?? [0, 0, 0];
    this._plugin.createAnnotation({
      id: `ann-${ann.id}`,
      worldPos,
      markerShown: true,
      labelShown: false,
      values: {
        title: esc(`[${ann.severity.toUpperCase()}] ${ann.type}`),
        comment: esc(ann.comment),
        author: esc(ann.author),
        severity: esc(ann.severity),
      },
    });
  }

  // ── Add mode ────────────────────────────────────────────

  /** Whether add-annotation mode is currently active */
  get isAdding(): boolean {
    return this._addMode;
  }

  /** Enter "add annotation" mode — click an object to create an annotation */
  startAdding(): void {
    if (this._addMode) return;
    this._addMode = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._pickSub = (this._viewer.viewer.cameraControl as any).on(
      "picked",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pickResult: any) => {
        if (!this._addMode || !pickResult.worldPos) return;
        this._showForm(pickResult);
      },
    );
    console.info("[AnnotationOverlay] Add mode started.");
  }

  /** Exit "add annotation" mode */
  stopAdding(): void {
    this._addMode = false;
    this._hideForm();
    if (this._pickSub != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._viewer.viewer.cameraControl as any).off?.(this._pickSub);
      this._pickSub = null;
    }
    console.info("[AnnotationOverlay] Add mode stopped.");
  }

  // ── Inline form ─────────────────────────────────────────

  private _buildForm(container: HTMLElement): void {
    const form = document.createElement("div");
    form.id = "annotation-form";
    form.className = "annotation-form";
    form.hidden = true;
    form.innerHTML = `
      <label for="ann-comment">Comment</label>
      <textarea id="ann-comment" rows="3" placeholder="Describe the issue…"></textarea>
      <label for="ann-severity">Severity</label>
      <select id="ann-severity">
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
        <option value="critical">Critical</option>
      </select>
      <div class="annotation-form-actions">
        <button id="ann-save" type="button">Save</button>
        <button id="ann-cancel" type="button">Cancel</button>
      </div>
    `;
    container.appendChild(form);
    this._formEl = form;

    document.getElementById("ann-save")?.addEventListener("click", () => {
      this._saveAnnotation();
    });
    document.getElementById("ann-cancel")?.addEventListener("click", () => {
      this._hideForm();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _showForm(pickResult: any): void {
    this._pendingPick = pickResult;
    if (!this._formEl) return;
    this._formEl.hidden = false;
    // Reset form fields
    const comment = document.getElementById("ann-comment") as HTMLTextAreaElement;
    const severity = document.getElementById("ann-severity") as HTMLSelectElement;
    if (comment) comment.value = "";
    if (severity) severity.value = "info";
    comment?.focus();
  }

  private _hideForm(): void {
    if (this._formEl) this._formEl.hidden = true;
    this._pendingPick = null;
  }

  private _saveAnnotation(): void {
    const pick = this._pendingPick;
    if (!pick) return;

    const commentEl = document.getElementById("ann-comment") as HTMLTextAreaElement;
    const severityEl = document.getElementById("ann-severity") as HTMLSelectElement;
    const comment = commentEl?.value.trim();
    if (!comment) return;

    const worldPos = pick.worldPos;
    const entityId = pick.entity ? String(pick.entity.id) : undefined;
    const severity = (severityEl?.value ?? "info") as AnnotationData["severity"];

    const ann = this._annotations.add(this._projectId, {
      type: "text",
      anchor: {
        type: entityId ? "object" : "world",
        objectId: entityId,
        worldPos: [worldPos[0], worldPos[1], worldPos[2]],
      },
      author: "user",
      comment,
      severity,
      status: "open",
    });

    this._createMarker(ann);
    this._hideForm();
    console.info(`[AnnotationOverlay] Created annotation "${ann.id}".`);
  }

  // ── Delete ──────────────────────────────────────────────

  /** Remove an annotation by its AnnotationService ID */
  removeAnnotation(annotationId: string): void {
    this._annotations.delete(this._projectId, annotationId);
    const xeokitId = `ann-${annotationId}`;
    if (this._plugin.annotations[xeokitId]) {
      this._plugin.destroyAnnotation(xeokitId);
    }
  }

  // ── Lifecycle ───────────────────────────────────────────

  destroy(): void {
    this.stopAdding();
    this._plugin.clear();
    this._plugin.destroy();
    if (this._formEl) {
      this._formEl.remove();
      this._formEl = null;
    }
  }
}
