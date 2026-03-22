# Civil BIM Viewer — SWE Execution Prompt

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Act as a senior full-stack software engineer to implement the Civil BIM Viewer phase-by-phase until 100% functional  
> **Companion doc:** `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC, dependencies)  
> **Last updated:** 2026-03-22 (Phases 1-4 complete; MVP validated A- 90%; ready for Phase 5)

---

## ROLE & OBJECTIVE

You are a **senior software engineer** implementing a browser-based, open-source BIM/IFC viewer for civil and civic engineering. The project scaffold exists. Planning is done. Your job is to **write production code, tests, and docs** — phase by phase — until the application is 100% functional as defined in the completion plan.

**Rules:**
1. **Always run `npm run lint && npm run test && npm run build` after every task** to verify nothing is broken.
2. **Commit after each completed task** with conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
3. **Never delete or overwrite working code** without verifying tests still pass.
4. **Ask the user before** making any architectural decision not covered by existing docs.
5. **Mark stubs as implemented** incrementally — do not rewrite everything at once.
6. **Each phase must end with all tests green and the build succeeding.**

---

## PROJECT CONTEXT

### Repository
- **URL:** `https://github.com/itsnothuy/civil`
- **Branch:** `main`
- **License:** AGPL-3.0-or-later (CLA for dual licensing)
- **Node:** >=20, npm >=10

### Tech Stack
| Tool | Version | Config File |
|------|---------|------------|
| TypeScript | 5.9.3 (strict mode) | `tsconfig.json` |
| Vite | 6.4.1 (dev server on :3000) | `vite.config.ts` |
| xeokit-sdk | ^2.6.0 (installed: 2.6.106) | — |
| Jest | 29 + ts-jest + jsdom | `jest.config.js` |
| Playwright | 1.42 (Chromium, Safari, Mobile Chrome) | `playwright.config.ts` |
| ESLint | 8.57 + @typescript-eslint | `.eslintrc.json` |
| Prettier | 3.2.5 | `.prettierrc.json` |

### NPM Scripts
```bash
npm run dev          # Vite dev server (:3000)
npm run build        # tsc && vite build → dist/
npm run lint         # ESLint
npm run format:check # Prettier check
npm run test         # Jest unit tests
npm run test:coverage # Jest + coverage report
npm run test:e2e     # Playwright E2E
npm run test:perf    # Playwright performance benchmarks (CDP)
npm run typecheck    # tsc --noEmit
npm run convert      # IFC→GLB conversion (scripts/convert-ifc.mjs)
```

### Verification Command (run after EVERY task)
```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```

---

## FILE MAP (Current State)

```
civil/
├── src/
│   ├── main.ts                              # ✅ Entry — bootstraps ViewerCore, ModelLoader, FilterPanel, all UI
│   ├── index.html                           # ✅ ARIA toolbar (10 buttons), canvas, sidebar, filter panel, skip-link
│   ├── viewer/ViewerCore.ts                 # ✅ DONE — xeokit Viewer, selection, section planes, modes (304 lines)
│   ├── loader/ModelLoader.ts                # ✅ DONE — GLTFLoaderPlugin, Promise-based load (72 lines)
│   ├── ui/UIController.ts                   # ✅ DONE — toolbar, search, keyboard (H/F/?/M/A/X/Tab/Esc), high-contrast, toast (442 lines)
│   ├── ui/PropertiesPanel.ts                # ✅ DONE — IFC metadata display (XSS-safe) (71 lines)
│   ├── ui/TreeView.ts                       # ✅ DONE — TreeViewPlugin wrapper + context menu (161 lines)
│   ├── ui/FilterPanel.ts                    # ✅ DONE — layer/discipline filtering, X-ray toggle, Show/Hide All (312 lines)
│   ├── tools/MeasurementTool.ts             # ✅ DONE — two-point + path measurement, snap, m/ft, export (371 lines)
│   ├── annotations/AnnotationOverlay.ts     # ✅ DONE — 3D markers via AnnotationsPlugin, inline form (242 lines)
│   ├── annotations/AnnotationService.ts     # ✅ DONE — CRUD, localStorage, JSON export/import (199 lines)
│   └── styles/main.css                      # ✅ DONE — layout, high-contrast, filter, skip-link, help overlay, a11y fixes (~606 lines)
├── tests/
│   ├── unit/ViewerCore.test.ts              # ✅ 28/28 passing (96.8% stmts)
│   ├── unit/ModelLoader.test.ts             # ✅ 8/8 passing (81.6% stmts)
│   ├── unit/UIController.test.ts            # ✅ 46/46 passing (94.5% stmts)
│   ├── unit/FilterPanel.test.ts             # ✅ 35/35 passing (95.3% stmts)
│   ├── unit/PropertiesPanel.test.ts         # ✅ 17/17 passing (100% stmts)
│   ├── unit/TreeView.test.ts                # ✅ 18/18 passing (95.7% stmts)
│   ├── unit/MeasurementTool.test.ts         # ✅ 27/27 passing (~98% coverage)
│   ├── unit/AnnotationOverlay.test.ts       # ✅ 12/12 passing (~93% coverage)
│   ├── unit/AnnotationService.test.ts       # ✅ 8/8 passing (95.5% stmts)
│   ├── unit/ImportExport.test.ts            # ✅ 11/11 passing
│   ├── e2e/viewer.spec.ts                   # ✅ DONE — 50 E2E tests, 14 describe blocks (646 lines)
│   ├── e2e/accessibility.spec.ts            # ✅ DONE — 7 axe-core WCAG 2.1 AA tests (104 lines)
│   └── performance/benchmark.spec.ts        # ✅ DONE — Playwright + CDP load/FPS/heap (193 lines)
├── scripts/convert-ifc.mjs                  # ✅ Ready (needs ifcconvert on PATH)
├── data/sample-models/                      # ★ EMPTY — no models converted yet
├── .github/workflows/
│   ├── ci.yml                               # ✅ Lint→Unit→E2E→Build→Security
│   ├── deploy.yml                           # ◐ Configured, never deployed
│   └── cla.yml                              # ✅ CLA Assistant
├── docs/
│   ├── prompts/                             # Execution & validation prompts (Phase 3-7)
│   ├── reports/                             # Completion plan + validation reports (Phase 1, 2)
│   └── review/                              # Architecture, backlog docs
├── package.json                             # Dependencies + scripts (incl. test:perf)
├── tsconfig.json                            # ES2022, strict, bundler resolution
├── vite.config.ts                           # root: src, base: ./, outDir: ../dist
├── jest.config.js                           # ts-jest, jsdom, coverage thresholds
└── playwright.config.ts                     # Chromium + Safari + Mobile Chrome
```

Legend: ★ = stub/empty, ◐ = partial, ✅ = done

---

## CURRENT SOURCE CODE (Phase 1 Complete — Verbatim)

> **Note:** Phase 1 (Tasks 1.1–1.6) is fully implemented. The code below reflects
> the actual state after the Phase 1 validation fixes. Phase 2+ should build on this code.

### `src/viewer/ViewerCore.ts` — ✅ DONE (302 lines)

**Key public API:**
- `get viewer(): Viewer` — exposes raw xeokit Viewer for plugins
- `get mode(): ViewMode` — current "3d" | "2d"
- `onSelect(callback): () => void` — register selection listener (multi-listener, returns unsubscribe)
- `selectEntity(entityId: string | null): void` — programmatic selection (fires listeners)
- `cycleSelection(direction): void` — Tab-key keyboard object cycling
- `setMode(mode): void` — 3D↔2D with flyTo animation + navMode switch
- `setXray(enabled): void` — batch X-ray toggle
- `addSectionPlane(): string | null` — returns ID or null if max (6) reached
- `removeSectionPlane(id): void` / `clearSectionPlanes(): void`
- `exportSectionPlanes(): Array<{id, pos, dir}>` — JSON export
- `destroy(): void` — full cleanup

**Key implementation details:**
```typescript
// Import: bare specifier works with Vite's bundler resolution
import { Viewer, SectionPlanesPlugin, NavCubePlugin } from "@xeokit/xeokit-sdk";

// Selection uses cameraControl events (NOT scene.input.on)
this._viewer.cameraControl.on("picked", (pickResult) => { ... });
this._viewer.cameraControl.on("pickedNothing", () => { ... });

// 2D mode disables orbit
this._viewer.cameraControl.navMode = "planView"; // 2D
this._viewer.cameraControl.navMode = "orbit";     // 3D

// getAABB requires objectIds parameter for TypeScript
this._viewer.scene.getAABB(this._viewer.scene.objectIds);

// Entity.id is string | number — coerce with String()
this._fireSelect(String(entity.id), worldPos);

// WebGL context loss handled via document.getElementById(canvasId)
canvasEl.addEventListener("webglcontextlost", ...);
```

### `src/loader/ModelLoader.ts` — ✅ DONE (67 lines)

```typescript
import { GLTFLoaderPlugin } from "@xeokit/xeokit-sdk";
import type { ViewerCore } from "../viewer/ViewerCore";

export class ModelLoader {
  private _viewer: ViewerCore;
  private _gltfLoader: GLTFLoaderPlugin;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
    this._gltfLoader = new GLTFLoaderPlugin(viewer.viewer);
  }

  async loadProject(projectId: string): Promise<void> {
    const basePath = `./data/${projectId}`;
    const sceneModel = this._gltfLoader.load({
      id: projectId,
      src: `${basePath}/model.glb`,
      metaModelSrc: `${basePath}/metadata.json`,
      edges: true,
    });

    return new Promise<void>((resolve, reject) => {
      sceneModel.on("loaded", () => {
        this._viewer.viewer.cameraFlight.flyTo(sceneModel);
        resolve();
      });
      sceneModel.on("error", (msg: string) => {
        // XSS-safe error display
        const panel = document.getElementById("properties-panel");
        if (panel) {
          const safeMsg = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          panel.innerHTML = `<p class="error">Failed to load model: ${safeMsg}</p>`;
        }
        reject(new Error(msg));
      });
    });
  }

  unloadAll(): void {
    const models = this._viewer.viewer.scene.models;
    for (const id in models) {
      if (Object.prototype.hasOwnProperty.call(models, id)) {
        models[id].destroy();
      }
    }
  }
}
```

### `src/ui/UIController.ts` — ✅ DONE (442 lines)

**Key changes from stub (Phases 1→2→3):**
- Constructor: `(viewer: ViewerCore, annotations: AnnotationService, projectId?: string, measurementTool?: MeasurementTool, annotationOverlay?: AnnotationOverlay)` — 5 params
- `_bindSearch()`: X-rays non-matching, highlights matching, clears on empty query
- `_updateSectionList()`: Uses **event delegation** (single listener) to avoid leaks
- `_bindKeyboard()`: Tab (cycle), Escape (deselect), M (measure), A (annotate), X (camera), H (high-contrast), F (search focus), ? (help overlay)
- Mutual exclusion between measurement and annotation modes
- `_showToast()`: temporary status notifications with `aria-live="polite"`
- `_restoreHighContrast()`: restores high-contrast preference from localStorage on init
- `_showKeyboardHelp()`: renders keyboard help overlay, dismissible via Escape or X button
- `addSectionPlane()` returns `string | null` — UIController checks for null

### `src/ui/PropertiesPanel.ts` — ✅ DONE (69 lines)

All dynamic IFC metadata is **HTML-escaped** via `escapeHtml()` to prevent XSS.

### `src/ui/TreeView.ts` — ✅ DONE (167 lines)

- Tree node click calls `viewer.selectEntity(objectId)` — fires all listeners (PropertiesPanel syncs)
- Right-click context menu: Isolate / Hide / Show All
- `destroy()` removes the context menu DOM element

### `src/main.ts` — ✅ DONE (71 lines)

Bootstraps all modules including Phase 2/3 additions:
```typescript
import { ViewerCore } from "./viewer/ViewerCore";
import { ModelLoader } from "./loader/ModelLoader";
import { AnnotationService } from "./annotations/AnnotationService";
import { MeasurementTool } from "./tools/MeasurementTool";
import { AnnotationOverlay } from "./annotations/AnnotationOverlay";
import { UIController } from "./ui/UIController";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { TreeView } from "./ui/TreeView";
import { FilterPanel } from "./ui/FilterPanel";

// Key wiring (simplified):
const viewer = new ViewerCore("viewer-canvas");
const loader = new ModelLoader(viewer);
await loader.loadProject(projectId);

const annotations = new AnnotationService(viewer);
const measurementTool = new MeasurementTool(viewer);
const annotationOverlay = new AnnotationOverlay(viewer, annotations);

// UIController now takes 5 params:
const ui = new UIController(viewer, annotations, projectId, measurementTool, annotationOverlay);
ui.init();

const filterPanel = new FilterPanel(viewer);
filterPanel.init();
```

### `src/index.html` — ✅ DONE (56 lines)

The DOM has a `<main id="viewer-container">` containing `<canvas id="viewer-canvas">` and
`<canvas id="nav-cube-canvas">`. xeokit targets the `viewer-canvas` canvas element, not a `<main>`.

### `src/annotations/AnnotationService.ts` — ✅ DONE (do not modify unless extending)
Already implemented: CRUD, localStorage persistence, JSON export, 8/8 tests passing.

---

## XEOKIT-SDK v2.6 API REFERENCE

> **Import pattern:** Use the bare specifier. Vite resolves the `"module"` field in xeokit-sdk's package.json automatically:
> ```typescript
> import { Viewer, ... } from "@xeokit/xeokit-sdk";
> ```
> This works for both dev server and production builds.

### Viewer Initialization
```typescript
import { Viewer } from "@xeokit/xeokit-sdk";

const viewer = new Viewer({
  canvasId: "viewer-canvas",
  transparent: true,
  saoEnabled: false,       // disable SAO for MVP (performance)
  pbrEnabled: false,
  dtxEnabled: true,        // data textures for compression
  antialias: true,
});

// Key accessors
viewer.scene;              // Scene — entities, materials, pick
viewer.camera;             // Camera — eye, look, up, projection
viewer.cameraFlight;       // CameraFlightAnimation — flyTo, jumpTo
viewer.cameraControl;      // CameraControl — orbit, pan, zoom
viewer.metaScene;          // MetaScene — IFC metadata
```

### GLTFLoaderPlugin
```typescript
import { GLTFLoaderPlugin } from "@xeokit/xeokit-sdk";

const gltfLoader = new GLTFLoaderPlugin(viewer);

const sceneModel = gltfLoader.load({
  id: "myModel",
  src: "./data/sample/model.glb",
  metaModelSrc: "./data/sample/metadata.json",
  edges: true,
  autoMetaModel: true,
});

sceneModel.on("loaded", () => {
  viewer.cameraFlight.flyTo(sceneModel);
});
```

### SectionPlanesPlugin
```typescript
import { SectionPlanesPlugin } from "@xeokit/xeokit-sdk";

const sectionPlanes = new SectionPlanesPlugin(viewer);

const plane = sectionPlanes.createSectionPlane({
  id: "clip-1",
  pos: [0, 0, 0],
  dir: [1, 0, 0],
});

sectionPlanes.showControl(plane.id);    // interactive gizmo
sectionPlanes.hideControl();
sectionPlanes.destroySectionPlane("clip-1");
sectionPlanes.clear();
```

### DistanceMeasurementsPlugin
```typescript
import {
  DistanceMeasurementsPlugin,
  DistanceMeasurementsMouseControl,
  PointerLens,
} from "@xeokit/xeokit-sdk";

const distPlugin = new DistanceMeasurementsPlugin(viewer, {
  defaultColor: "#00BBFF",
});

// Interactive mode with snapping
const pointerLens = new PointerLens(viewer);
const mouseControl = new DistanceMeasurementsMouseControl(distPlugin, { pointerLens });
mouseControl.snapping = true;
mouseControl.activate();

distPlugin.on("measurementCreated", (m) => { /* m.id, m.origin, m.target */ });
```

### TreeViewPlugin
```typescript
import { TreeViewPlugin } from "@xeokit/xeokit-sdk";

const treeView = new TreeViewPlugin(viewer, {
  containerElementId: "tree-view",    // use containerElementId, not containerElement
  hierarchy: "containment",    // "containment" | "storeys" | "types"
  autoExpandDepth: 3,
  sortNodes: true,
  pruneEmptyNodes: true,
});

treeView.on("nodeTitleClicked", (e) => {
  const objectId = e.treeViewNode.objectId;
  viewer.cameraFlight.flyTo(viewer.scene.objects[objectId]);
});
```

### Object Picking & Selection
```typescript
// Canvas pick with surface coords + snapping
const pickResult = viewer.scene.pick({
  canvasPos: [x, y],
  pickSurface: true,
  snapToVertex: true,
  snapToEdge: true,
  snapRadius: 30,
});

if (pickResult?.entity) {
  pickResult.entity.selected = true;
  pickResult.entity.highlighted = true;
  pickResult.worldPos;  // [x, y, z]
}

// Batch operations
viewer.scene.setObjectsXRayed(viewer.scene.objectIds, true);
viewer.scene.setObjectsSelected(["id1", "id2"], true);
viewer.scene.setObjectsVisible(["id1"], false);
viewer.scene.setObjectsHighlighted(viewer.scene.highlightedObjectIds, false);
```

### Camera Flight + Projection
```typescript
// Fly to model
viewer.cameraFlight.flyTo(sceneModel, () => { /* arrived */ });

// Switch to ortho (2D)
viewer.cameraFlight.flyTo({
  aabb: viewer.scene.getAABB(),
  projection: "ortho",
  duration: 0.5,
});

// Switch to perspective (3D)
viewer.camera.projection = "perspective";

// Jump instantly (no animation)
viewer.cameraFlight.jumpTo({ eye: [0, 10, 0], look: [0, 0, 0], up: [0, 0, -1] });
```

### NavCubePlugin
```typescript
import { NavCubePlugin } from "@xeokit/xeokit-sdk";

// Requires a separate <canvas> element in HTML:
// <canvas id="nav-cube-canvas" width="200" height="200"></canvas>
const navCube = new NavCubePlugin(viewer, {
  canvasId: "nav-cube-canvas",
  visible: true,
  cameraFly: true,
  cameraFlyDuration: 0.5,
});
```

### X-Ray Materials
```typescript
viewer.scene.xrayMaterial.fill = true;
viewer.scene.xrayMaterial.fillAlpha = 0.1;
viewer.scene.xrayMaterial.fillColor = [0, 0, 0];
viewer.scene.xrayMaterial.edgeAlpha = 0.5;
viewer.scene.xrayMaterial.edgeColor = [0, 0, 0];

viewer.scene.highlightMaterial.fill = true;
viewer.scene.highlightMaterial.edges = true;
viewer.scene.highlightMaterial.fillAlpha = 0.3;
viewer.scene.highlightMaterial.edgeColor = [1, 1, 0];
```

---

## CODEBASE CONVENTIONS

### TypeScript
- Strict mode (`"strict": true` in tsconfig.json)
- ES2022 target, ESNext modules, bundler resolution
- No path aliases (use relative imports — `@/*` is NOT configured)
- No unused locals/parameters warnings (disabled for stubs)
- All public APIs must have JSDoc comments

### File Naming
- Source: `PascalCase.ts` for classes (`ViewerCore.ts`, `ModelLoader.ts`)
- Tests: `PascalCase.test.ts` in `tests/unit/`
- E2E: `kebab-case.spec.ts` in `tests/e2e/`
- CSS: `kebab-case.css` in `src/styles/`

### Import Patterns
```typescript
// xeokit: use bare specifier (Vite resolves "module" field automatically)
import { Viewer, GLTFLoaderPlugin } from "@xeokit/xeokit-sdk";

// Internal: relative paths (no @/ alias in source — TypeScript strict)
import type { ViewerCore } from "../viewer/ViewerCore";

// Type-only imports use `import type { ... }`
```

### Test Patterns
```typescript
// Jest with jsdom
import { AnnotationService } from "../../src/annotations/AnnotationService";

// Mock Viewer (since xeokit needs WebGL which jsdom lacks)
const mockViewer = {} as ViewerCore;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });
```

### Commit Messages
```
feat(viewer): initialize xeokit Viewer with orbit/pan/zoom controls
fix(loader): handle 404 when metadata.json is missing
test(viewer): add unit tests for ViewerCore mode switching
docs: update README with accurate badge URLs
refactor(ui): extract PropertiesPanel into separate module
```

### CSS Conventions
- CSS custom properties for all colors/sizes in `:root`
- `.high-contrast` class on `<body>` for accessibility theme
- `.headset-mode` class on `<body>` for Vision Pro
- WCAG 2.5.5: minimum 44×44px button targets
- Use `var(--color-*)` for all colors

---

## PHASE-BY-PHASE IMPLEMENTATION GUIDE

### How to Execute Each Phase

For each phase in the completion plan:

1. **Read the completion plan phase** to understand all tasks
2. **Start with the first task** in dependency order
3. **For each task:**
   a. Read the existing stub code
   b. Implement the feature, preserving the existing public API
   c. Add/update unit tests
   d. Run `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`
   e. Fix any failures
   f. Commit with conventional message
4. **After all tasks in the phase:** run full E2E suite, verify build
5. **Push to GitHub** and confirm CI passes

---

### PHASE 1: xeokit Integration — ✅ COMPLETE

> **Status:** All 6 tasks (1.1–1.6) implemented and validated. See `docs/reports/validation-report-2026-03-01-phase1.md`.
>
> **Post-validation fixes applied:** Multi-listener onSelect, tree→properties sync, search highlight leak,
> orbit disabled in 2D, Tab-key selection, WebGL context loss, max 6 section planes, section plane export,
> right-click tree menu, XSS sanitization, event delegation for section list.

**Implementation summary (for reference by future phases):**

- **Selection API:** `viewer.onSelect(cb)` returns unsubscribe function. Multiple listeners supported.
  `viewer.selectEntity(id)` for programmatic selection (used by TreeView).
- **Section planes:** `addSectionPlane()` returns `string | null` — null when max 6 reached.
  `exportSectionPlanes()` returns `Array<{id, pos, dir}>`.
- **2D mode:** Uses `cameraControl.navMode = "planView"` to disable orbit.
- **Keyboard:** Tab/Shift+Tab cycles objects, Escape deselects, M/A/X trigger buttons.
- **UIController:** Constructor is `(viewer, annotations)` — no ModelLoader param.
- **TreeView:** Node click calls `viewer.selectEntity()`. Right-click has isolate/hide/show all.

---

### PHASE 2: Measurements & Tools — ✅ COMPLETE

> **Status:** All 4 tasks implemented and validated. See `docs/reports/validation-report-2026-03-01-phase2.md`.
> 58 tests passing post-Phase 2. Coverage: ~37% stmts.
>
> **Key implementation details (for Phase 4+ reference):**
> - `MeasurementTool.ts` (371 lines): `DistanceMeasurementsPlugin` + `PointerLens` + `DistanceMeasurementsMouseControl` with snapping. Path mode uses `cameraControl.on("picked")` to collect points. Orange segments (#FF6600) for path, blue (#00BBFF) for two-point.
> - `AnnotationOverlay.ts` (242 lines): `AnnotationsPlugin` with 📌 emoji markers. `markerClicked` toggles labels. Inline creation form (comment + severity). No edit UI (deferred).
> - UIController wires `btn-measure`, `btn-path-measure`, `btn-annotate`, `btn-import-json` with mutual exclusion.
> - `Ctrl+Z`/`Cmd+Z` undoes last path point.
> - Toast notifications via `_showToast()` for import success/error.
> - Tests: `MeasurementTool.test.ts` (27), `AnnotationOverlay.test.ts` (12), `ImportExport.test.ts` (11)

---

### PHASE 3: Civil Features & Accessibility — ✅ COMPLETE

> **Status:** All 4 tasks implemented. 62 tests total. Build: 1,164 kB JS.
>
> **Key implementation details (for Phase 4+ reference):**
> - `FilterPanel.ts` (312 lines): `DISCIPLINE_MAP` maps 80+ IFC types → 6 disciplines. `init()` builds groups from `viewer.metaScene.metaObjects`. Checkboxes toggle `setObjectsVisible()`. X-ray toggle for hidden objects. Show/Hide All buttons.
> - High-contrast: `.high-contrast` class on `<body>`, `btn-high-contrast` button, localStorage persist + restore on load.
> - Keyboard: H (contrast), F (search focus), ? (help overlay with all shortcuts), skip-to-content link, canvas `tabindex="0"`.
> - Performance: `tests/performance/benchmark.spec.ts` — Playwright + CDP measuring `domcontentloaded`, `Performance.getMetrics()` for heap, `beginFrame`/`endFrame` for FPS. CI thresholds: load <5s, FPS ≥30, heap <500 MB.
> - `npm run test:perf` script added to package.json.
>
> **Known gaps carried forward:**
> - No unit tests for FilterPanel or UIController keyboard additions (→ Phase 4.1)
> - No automated axe/Lighthouse audit (→ Phase 4.3)
> - Annotation edit UI still missing (→ Phase 4 or 5)

---

### PHASE 4: Testing & Release (Start Here)

> **Current state entering Phase 4:**
> - 62 tests total: 58 unit (4 suites) + 2 perf + 5 E2E smoke (pre-existing)
> - Coverage: ~37% stmts, ~24% branch, ~45% func, ~37% lines
> - Modules with 0% coverage: ViewerCore, ModelLoader, UIController, FilterPanel, PropertiesPanel, TreeView
> - Build: 1,164 kB JS + 8 kB CSS

#### Task 4.1 — Unit Tests (≥80% coverage)

**New files needed:**
- `tests/unit/ViewerCore.test.ts` — Mock all xeokit classes (Viewer, SectionPlanesPlugin, NavCubePlugin)
- `tests/unit/ModelLoader.test.ts` — Mock GLTFLoaderPlugin
- `tests/unit/UIController.test.ts` — Mock DOM elements + ViewerCore + all tool refs
- `tests/unit/FilterPanel.test.ts` — Mock metaScene with discipline data
- `tests/unit/PropertiesPanel.test.ts` — Test XSS escaping, show/hide
- `tests/unit/TreeView.test.ts` — Mock TreeViewPlugin, test context menu

**xeokit mock pattern (use this for all Phase 4 tests):**
```typescript
jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsVisible: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["obj1", "obj2"],
      objects: { obj1: { id: "obj1" }, obj2: { id: "obj2" } },
      selectedObjectIds: [],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0,0,0,10,10,10]),
      xrayMaterial: { fill: true, fillAlpha: 0.1, fillColor: [0,0,0], edgeAlpha: 0.5, edgeColor: [0,0,0] },
      highlightMaterial: { fill: true, edges: true, fillAlpha: 0.3, edgeColor: [1,1,0] },
      models: {},
      canvas: { canvas: document.createElement("canvas") },
    },
    camera: { projection: "perspective", eye: [0,0,10], look: [0,0,0], up: [0,1,0] },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: { metaObjects: {} },
    destroy: jest.fn(),
  })),
  SectionPlanesPlugin: jest.fn().mockImplementation(() => ({
    createSectionPlane: jest.fn(() => ({ id: "sp-1" })),
    sectionPlanes: {},
    showControl: jest.fn(),
    hideControl: jest.fn(),
    destroySectionPlane: jest.fn(),
    clear: jest.fn(),
  })),
  NavCubePlugin: jest.fn(),
  GLTFLoaderPlugin: jest.fn().mockImplementation(() => ({
    load: jest.fn(() => ({ on: jest.fn(), id: "model-1" })),
  })),
  TreeViewPlugin: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    destroy: jest.fn(),
  })),
  DistanceMeasurementsPlugin: jest.fn().mockImplementation(() => ({
    createMeasurement: jest.fn(),
    on: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
  })),
  DistanceMeasurementsMouseControl: jest.fn().mockImplementation(() => ({
    activate: jest.fn(),
    deactivate: jest.fn(),
    destroy: jest.fn(),
    snapping: false,
  })),
  PointerLens: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
  AnnotationsPlugin: jest.fn().mockImplementation(() => ({
    createAnnotation: jest.fn(),
    annotations: {},
    on: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
  })),
}));
```

**After adding all unit tests, raise `jest.config.js` thresholds:**
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 80,
    statements: 80,
  },
},
```

#### Task 4.2 — E2E Tests

Extend `tests/e2e/viewer.spec.ts`:
- Test model loading (need sample model in `data/`)
- Test object selection (click canvas → properties panel updates)
- Test measurement tool activation
- Test section plane creation
- Test search filtering
- Cross-browser (already configured in playwright.config.ts)

---

## TESTING STRATEGY

### Unit Tests (Jest + jsdom)
- **Mock xeokit entirely** — jsdom has no WebGL
- Test logic: mode switching, data transforms, annotation CRUD, measurement calculations
- Test file per source module: `tests/unit/<ModuleName>.test.ts`
- Always mock Viewer, Scene, Camera as shown above

### E2E Tests (Playwright)
- Need `npm run dev` running (configured in `playwright.config.ts` webServer)
- Test real browser behavior: clicks, keyboard nav, panel visibility
- Screenshot comparison for visual regression
- 3 projects: Chromium, Safari, Mobile Chrome

### Coverage Thresholds (`jest.config.js`)
```javascript
coverageThreshold: {
  global: {
    // Phase 4 (current): 90/70/90/90 — actual: 92.47/75.31/95.12/95.03
    branches: 70,
    functions: 90,
    lines: 90,
    statements: 90,
  },
},
```
Thresholds raised in Phase 4 (Task 4.1). 210 unit tests, 10 suites. Phase 4 actual: 92.47% stmts / 75.31% branch / 95.12% funcs / 95.03% lines.

---

## VITE CONFIGURATION NOTES

### xeokit + Vite Compatibility
xeokit-sdk uses dynamic `new Function()` and `eval()` internally. If you hit CSP or build warnings:

1. **Dev server:** Works out of the box (no CSP in local dev)
2. **Production build:** May need `build.rollupOptions.output.format: "es"` (already default)
3. **If xeokit fails to tree-shake:** Use manual chunks:
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        xeokit: ["@xeokit/xeokit-sdk"],
      },
    },
  },
},
```

### HTML Entry Point
Vite root is `src/`. The entry point is `src/index.html`. The canvas is already set up correctly:

```html
<!-- Already implemented in index.html -->
<canvas id="viewer-canvas" ...></canvas>
<canvas id="nav-cube-canvas" ...></canvas>
```

> **Note:** This was fixed during Phase 1 implementation. No further changes needed.

---

## ERROR HANDLING

### Model Loading Errors
```typescript
sceneModel.on("error", (msg: string) => {
  console.error(`[ModelLoader] ${msg}`);
  // Show user-facing error in properties panel
  const panel = document.getElementById("properties-panel");
  if (panel) {
    panel.innerHTML = `<p class="error">Failed to load model: ${msg}</p>`;
  }
});
```

### WebGL Context Lost
```typescript
// Use document.getElementById — viewer.scene.canvas.canvas is not reliable
const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  console.error("[ViewerCore] WebGL context lost");
});

canvas.addEventListener("webglcontextrestored", () => {
  console.info("[ViewerCore] WebGL context restored — reinitializing");
  // Re-init viewer
});
```

### Graceful Degradation
If WebGL2 is not available, show a message instead of a broken canvas:
```typescript
const canvas = document.getElementById("viewer-canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2");
if (!gl) {
  document.getElementById("properties-panel")!.innerHTML =
    `<p class="error">WebGL 2.0 is required. Please update your browser.</p>`;
  return;
}
```

---

## FILES TO CREATE (New Modules)

| File | Phase | Purpose |
|------|-------|---------|
| `src/ui/PropertiesPanel.ts` | 1.3 | ✅ Done — Display IFC metadata (XSS-escaped) |
| `src/ui/TreeView.ts` | 1.4 | ✅ Done — TreeViewPlugin wrapper + context menu |
| `src/tools/MeasurementTool.ts` | 2.1 | ✅ DONE — Distance measurement + cumulative path (371 lines) |
| `src/annotations/AnnotationOverlay.ts` | 2.3 | ✅ DONE — 3D markers for annotations (242 lines) |
| `src/ui/FilterPanel.ts` | 3.1 | ✅ DONE — Layer/discipline filtering UI (312 lines) |
| `tests/unit/MeasurementTool.test.ts` | 2.1 | ✅ DONE — 27 tests (~98% coverage) |
| `tests/unit/AnnotationOverlay.test.ts` | 2.3 | ✅ DONE — 12 tests (~93% coverage) |
| `tests/unit/ImportExport.test.ts` | 2.4 | ✅ DONE — 11 tests (round-trip validation) |
| `tests/performance/benchmark.spec.ts` | 3.4 | ✅ DONE — Playwright + CDP benchmarks (193 lines) |
| `tests/unit/ViewerCore.test.ts` | 4.1 | ✅ DONE — 28 tests (96.8% coverage) |
| `tests/unit/ModelLoader.test.ts` | 4.1 | ✅ DONE — 8 tests (81.6% coverage) |
| `tests/unit/UIController.test.ts` | 4.1 | ✅ DONE — 46 tests (94.5% coverage) |
| `tests/unit/FilterPanel.test.ts` | 4.1 | ✅ DONE — 35 tests (95.3% coverage) |
| `tests/unit/PropertiesPanel.test.ts` | 4.1 | ✅ DONE — 17 tests (100% coverage) |
| `tests/unit/TreeView.test.ts` | 4.1 | ✅ DONE — 18 tests (95.7% coverage) |
| `tests/e2e/viewer.spec.ts` | 4.2 | ✅ DONE — 50 E2E tests (646 lines) |
| `tests/e2e/accessibility.spec.ts` | 4.3 | ✅ DONE — 7 axe-core tests (104 lines) |
| `CHANGELOG.md` | 4.5 | ✅ DONE — Keep-a-Changelog format (64 lines) |

---

## CHECKLIST PER TASK

Before marking any task complete, verify:

- [ ] Feature code is implemented (not just stubs)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] No lint violations (`npm run lint`)
- [ ] Formatting matches Prettier (`npm run format:check`)
- [ ] Unit tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Committed with conventional commit message
- [ ] E2E tests still pass (run periodically, not after every micro-change)

---

## PHASE EXECUTION CHECKLIST

### Phase 0: Foundation Fixes
- [ ] Task 0.1: README badge URLs fixed
- [ ] Task 0.3: G1, H1, I1, J1, K1 docs extracted
- [ ] Task 0.4: GitHub Pages enabled and deploying

### Phase 1: xeokit Integration — ✅ COMPLETE
- [x] Task 1.1: ViewerCore initializes xeokit Viewer, renders blank scene
- [x] Task 1.2: ModelLoader loads GLB into 3D canvas
- [x] Task 1.3: Click object → highlight + properties panel
- [x] Task 1.4: Tree view + search filtering works bidirectionally
- [x] Task 1.5: Section planes with interactive gizmo
- [x] Task 1.6: 3D↔2D toggle with smooth animation

### Phase 2: Measurements & Tools — ✅ COMPLETE
- [x] Task 2.1: Two-point distance measurement with snapping
- [x] Task 2.2: Cumulative path distance
- [x] Task 2.3: 3D annotation markers (create/delete; edit UI deferred)
- [x] Task 2.4: JSON import UI

### Phase 3: Civil Features & Accessibility — ✅ COMPLETE
- [x] Task 3.1: Layer/discipline filtering (FilterPanel.ts)
- [x] Task 3.2: High-contrast toggle (localStorage persistence)
- [x] Task 3.3: Full keyboard navigation (H/F/? shortcuts, skip-link, help overlay)
- [x] Task 3.4: Performance benchmarks (Playwright + CDP)

### Phase 4: Testing & Release — ✅ COMPLETE
- [x] Task 4.1: ≥80% unit test coverage (210 tests, 93%+ statement coverage)
- [x] Task 4.2: E2E tests for all features (50 tests, 14 feature areas)
- [x] Task 4.3: Accessibility audit passes (axe-core: 0 violations, WCAG 2.1 AA)
- [x] Task 4.4: Docs updated (README, feature-traceability-matrix, rolling-issues-ledger)
- [x] Task 4.5: v0.1.0 released (CHANGELOG.md)

---

## EXECUTION INSTRUCTIONS

**To start implementation, tell Claude:**

> Execute Phase 1 from `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md`. Start with Task 1.1 (initialize xeokit Viewer in ViewerCore.ts). Follow the verification checklist after each task. Commit after each task.

**To continue to the next phase:**

> Execute Phase 2 from the SWE execution prompt. All Phase 1 tasks are complete and verified.

**To execute a single task:**

> Execute Task 2.1 (Distance Measurement Tool) from the SWE execution prompt. Phase 1 is complete.

---

*This prompt provides everything Claude Opus 4.6 needs to act as a senior SWE and implement each phase 100% functional. The completion plan (`docs/reports/completion-plan-2026-03-01.md`) provides task definitions, acceptance criteria, effort estimates, and dependencies. Use both documents together.*
