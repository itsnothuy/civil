# Feature Guide: Annotations

> **Module:** `src/annotations/AnnotationService.ts`, `src/annotations/AnnotationOverlay.ts`
> **Keyboard shortcut:** `A` (toggle annotation mode)

## Overview

Annotations let you pin notes, issues, and comments to specific objects or locations in the 3D model. They persist in localStorage, sync to the collaboration server when available, and can be exported as BCF 2.1 or JSON.

---

## Quick Start

1. **Activate** — Press `A` or click the **Annotate** button in the toolbar
2. **Click** a model object or 3D location to place an annotation marker
3. **Fill in** the annotation form (title, description, severity)
4. **Save** — the annotation appears as a colored marker in the scene
5. **Deactivate** — Press `A` again or `Escape`

---

## Creating Annotations

When annotation mode is active, click any point in the scene. An inline form appears:

| Field | Required | Description |
|-------|----------|-------------|
| **Title** | Yes | Short summary of the issue (max 100 characters) |
| **Description** | No | Detailed notes or instructions |
| **Severity** | Yes | One of: `info`, `warning`, `error`, `critical` |

### Severity Levels

| Level | Color | Use Case |
|-------|-------|----------|
| `info` | Blue | General notes, reference points |
| `warning` | Yellow | Potential issues, review needed |
| `error` | Red | Defects, non-conformances |
| `critical` | Dark Red | Safety issues, immediate attention |

---

## Managing Annotations

### View

Click any marker in the 3D scene to select it. The annotation details appear in the Properties Panel on the right sidebar.

### Delete

Select an annotation marker, then click **Delete** in the annotation detail view, or use the context menu.

### Filter

Annotations can be filtered by severity in the annotation list panel.

---

## Persistence

Annotations are saved automatically:

1. **localStorage** — immediate, always available (default)
2. **Server sync** — if the collaboration server is running, annotations sync via REST API
3. **Offline queue** — if the server is unreachable, changes queue and replay when reconnected

---

## Export & Import

### JSON Export

```json
[
  {
    "id": "ann-001",
    "title": "Crack in foundation",
    "description": "Visible crack at column base C3",
    "severity": "error",
    "objectId": "0x1A2B3C",
    "worldPos": [12.5, 0.0, -3.2],
    "createdAt": "2026-03-24T10:30:00Z"
  }
]
```

### BCF 2.1 Export

Export annotations as a BCF 2.1 zip file for interoperability with other BIM tools (Navisworks, BIMcollab, Solibri, etc.):

1. Click **Export BCF** in the toolbar
2. A `.bcf` zip file downloads containing:
   - `bcf.version` — BCF version declaration
   - Per-topic folders with `markup.bcf`, `viewpoint.bcfv`, and `snapshot.png`
3. The severity level maps to BCF priority

### BCF Import

1. Click **Import BCF** in the toolbar
2. Select a `.bcf` file
3. Annotations are created from each BCF topic
4. Camera viewpoints are restored from the BCF viewpoint data

---

## Collaboration

When the collaboration server is active:

- Annotations are visible to all connected users
- Real-time sync via WebSocket pushes new annotations to other clients
- Role-based permissions control who can create/edit/delete annotations
- Each annotation records the creating user

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Toggle annotation mode |
| `Escape` | Cancel annotation placement |
| `Delete` | Delete selected annotation |

---

## API Reference

```typescript
class AnnotationService {
  create(data: Partial<Annotation>): Annotation;
  update(id: string, data: Partial<Annotation>): Annotation | null;
  delete(id: string): boolean;
  getAll(): Annotation[];
  getById(id: string): Annotation | null;
  getByObjectId(objectId: string): Annotation[];
  exportJSON(): string;
  importJSON(json: string): number;
  loadFromLocalStorage(projectId: string): void;
  saveToLocalStorage(projectId: string): void;
}
```
