/**
 * AnnotationService.ts
 *
 * Manages text annotations and measurements anchored to objects or
 * world coordinates (Task 5 — K0: data schema for annotations/issues).
 *
 * MVP: persist to localStorage (IndexedDB upgrade planned for V1).
 * V1:  sync to remote REST API (see C2 API Boundaries).
 * Export/import: JSON and BCF zip.
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Severity levels matching common BCF conventions */
export type AnnotationSeverity = "info" | "warning" | "error" | "critical";

/** Anchor to a specific IFC object or a world-space coordinate */
export interface AnnotationAnchor {
  type: "object" | "world";
  objectId?: string;
  worldPos?: [number, number, number];
}

/**
 * Core annotation data schema (Task 5 — K0).
 * Follows a subset of the BCF markup schema.
 * schemaVersion allows future migrations.
 */
export interface Annotation {
  id: string;
  schemaVersion: "1.0";
  type: "text" | "measurement" | "markup";
  anchor: AnnotationAnchor;
  author: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  comment: string;
  severity: AnnotationSeverity;
  status: "open" | "in-progress" | "resolved" | "closed";
  /** Camera viewpoint for BCF compatibility */
  viewpoint?: {
    eye: [number, number, number];
    look: [number, number, number];
    up: [number, number, number];
    selectedObjects: string[];
  };
}

const STORAGE_KEY_PREFIX = "civil-bim-annotations";

export class AnnotationService {
  // Stub: will be used for xeokit scene annotations overlay (Task 1)
  private _viewer: ViewerCore;
  private annotations: Map<string, Annotation> = new Map();

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  /** Load annotations for a project from localStorage */
  loadFromLocalStorage(projectId: string): void {
    const key = `${STORAGE_KEY_PREFIX}:${projectId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const items: Annotation[] = JSON.parse(raw);
      items.forEach((a) => this.annotations.set(a.id, a));
      console.info(`[AnnotationService] Loaded ${items.length} annotation(s) for "${projectId}".`);
    } catch {
      console.warn("[AnnotationService] Failed to parse stored annotations.");
    }
  }

  /** Persist all annotations to localStorage */
  private _persist(projectId: string): void {
    const key = `${STORAGE_KEY_PREFIX}:${projectId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(this.annotations.values())));
  }

  /** Add a new annotation */
  add(
    projectId: string,
    annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt" | "schemaVersion">,
  ): Annotation {
    const now = new Date().toISOString();
    const full: Annotation = {
      ...annotation,
      id: crypto.randomUUID(),
      schemaVersion: "1.0",
      createdAt: now,
      updatedAt: now,
    };
    this.annotations.set(full.id, full);
    this._persist(projectId);
    return full;
  }

  /** Update an existing annotation */
  update(projectId: string, id: string, patch: Partial<Annotation>): Annotation | null {
    const existing = this.annotations.get(id);
    if (!existing) return null;
    const updated: Annotation = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.annotations.set(id, updated);
    this._persist(projectId);
    return updated;
  }

  /** Delete an annotation by ID */
  delete(projectId: string, id: string): boolean {
    const deleted = this.annotations.delete(id);
    if (deleted) this._persist(projectId);
    return deleted;
  }

  /** List all annotations */
  list(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /** Export all annotations as JSON string */
  exportJSON(): string {
    return JSON.stringify(this.list(), null, 2);
  }

  // TODO (V1): importBCF(zip: Blob): Promise<void>
  // TODO (V1): exportBCF(): Promise<Blob>
}
