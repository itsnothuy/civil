# Civil BIM Viewer — SWE Execution Prompt

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Act as a senior full-stack software engineer to implement the Civil BIM Viewer phase-by-phase until 100% functional  
> **Companion doc:** `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC, dependencies)  
> **Last updated:** 2026-03-01 (Phase 1 complete; updated post-validation)

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
│   ├── main.ts                              # ✅ Entry point — bootstraps all modules
│   ├── index.html                           # ✅ ARIA toolbar, canvas, panels, search
│   ├── viewer/ViewerCore.ts                 # ✅ DONE — xeokit Viewer, selection, section planes, modes
│   ├── loader/ModelLoader.ts                # ✅ DONE — GLTFLoaderPlugin, Promise-based load
│   ├── ui/UIController.ts                   # ✅ DONE — toolbar, search, sections, keyboard nav
│   ├── ui/PropertiesPanel.ts                # ✅ DONE — IFC metadata display (XSS-safe)
│   ├── ui/TreeView.ts                       # ✅ DONE — TreeViewPlugin wrapper + context menu
│   ├── annotations/AnnotationService.ts     # ✅ DONE — CRUD, localStorage, JSON export
│   └── styles/main.css                      # ✅ DONE — layout, colors, high-contrast, context menu
├── tests/
│   ├── unit/AnnotationService.test.ts       # ✅ 8/8 passing (94% coverage)
│   └── e2e/viewer.spec.ts                   # ◐ PARTIAL — smoke tests only
├── scripts/convert-ifc.mjs                  # ✅ Ready (needs ifcconvert on PATH)
├── data/sample-models/                      # ★ EMPTY — no models converted yet
├── .github/workflows/
│   ├── ci.yml                               # ✅ Lint→Unit→E2E→Build→Security
│   ├── deploy.yml                           # ◐ Configured, never deployed
│   └── cla.yml                              # ✅ CLA Assistant
├── docs/
│   ├── prompts/                             # Execution & validation prompts
│   ├── reports/                             # Completion plan, validation reports
│   └── review/                              # Architecture, backlog docs
├── package.json                             # Dependencies + scripts
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

### `src/ui/UIController.ts` — ✅ DONE (222 lines)

**Key changes from stub:**
- Constructor takes `(viewer: ViewerCore, annotations: AnnotationService)` — **no ModelLoader param**
- `_bindSearch()`: X-rays non-matching, highlights matching, **clears highlights on empty query**
- `_updateSectionList()`: Uses **event delegation** (single listener) to avoid leaks
- `_bindKeyboard()`: Handles Tab (cycle), Escape (deselect), M/A/X shortcuts
- `addSectionPlane()` returns `string | null` — UIController checks for null

### `src/ui/PropertiesPanel.ts` — ✅ DONE (69 lines)

All dynamic IFC metadata is **HTML-escaped** via `escapeHtml()` to prevent XSS.

### `src/ui/TreeView.ts` — ✅ DONE (167 lines)

- Tree node click calls `viewer.selectEntity(objectId)` — fires all listeners (PropertiesPanel syncs)
- Right-click context menu: Isolate / Hide / Show All
- `destroy()` removes the context menu DOM element

### `src/main.ts` — ✅ DONE (59 lines)

```typescript
import { ViewerCore } from "./viewer/ViewerCore";
import { ModelLoader } from "./loader/ModelLoader";
import { AnnotationService } from "./annotations/AnnotationService";
import { UIController } from "./ui/UIController";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { TreeView } from "./ui/TreeView";

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId") ?? "sample";

  const viewer = new ViewerCore("viewer-canvas");
  const loader = new ModelLoader(viewer);
  try {
    await loader.loadProject(projectId);
  } catch {
    console.warn(`[CivilBIMViewer] Could not load project "${projectId}" — viewer is empty.`);
  }

  const annotations = new AnnotationService(viewer);
  annotations.loadFromLocalStorage(projectId);

  // UIController takes (viewer, annotations) — no loader param
  const ui = new UIController(viewer, annotations);
  ui.init();

  const _treeView = new TreeView(viewer, "tree-view");
  const propertiesPanel = new PropertiesPanel(viewer);

  viewer.onSelect((entityId) => {
    if (entityId) {
      propertiesPanel.show(entityId);
      _treeView.showNode(entityId);
    } else {
      propertiesPanel.hide();
    }
  });
}

init().catch((err) => {
  console.error("[CivilBIMViewer] Initialization failed:", err);
});
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
- Path alias: `@/*` → `src/*`
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

### PHASE 2: Measurements & Tools (Start Here)

#### Task 2.1 — Distance Measurement Tool

**New file:** `src/tools/MeasurementTool.ts`

```typescript
import {
  DistanceMeasurementsPlugin,
  DistanceMeasurementsMouseControl,
  PointerLens,
} from "@xeokit/xeokit-sdk";
import type { ViewerCore } from "../viewer/ViewerCore";

export type MeasurementUnit = "m" | "ft";

export class MeasurementTool {
  private _distPlugin: DistanceMeasurementsPlugin;
  private _mouseControl: DistanceMeasurementsMouseControl;
  private _pointerLens: PointerLens;
  private _unit: MeasurementUnit = "m";
  private _active = false;

  constructor(viewerCore: ViewerCore) {
    const viewer = viewerCore.viewer;
    this._distPlugin = new DistanceMeasurementsPlugin(viewer, {
      defaultColor: "#00BBFF",
    });
    this._pointerLens = new PointerLens(viewer);
    this._mouseControl = new DistanceMeasurementsMouseControl(this._distPlugin, {
      pointerLens: this._pointerLens,
    });
    this._mouseControl.snapping = true;
  }

  activate(): void {
    this._mouseControl.activate();
    this._active = true;
  }

  deactivate(): void {
    this._mouseControl.deactivate();
    this._active = false;
  }

  get isActive(): boolean { return this._active; }

  setUnit(unit: MeasurementUnit): void { this._unit = unit; }

  clearAll(): void { this._distPlugin.clear(); }

  destroy(): void {
    this._mouseControl.destroy();
    this._distPlugin.destroy();
    this._pointerLens.destroy();
  }
}
```

**Wire to UIController:** `btn-measure` toggles `measurementTool.activate()` / `.deactivate()`.

#### Task 2.3 — 3D Annotation Overlays

**New file:** `src/annotations/AnnotationOverlay.ts`

Use xeokit's `AnnotationsPlugin` or custom HTML overlays pinned to world coordinates via `viewer.scene.canvas.canvas2WorldPos()`.

---

### PHASE 3: Civil Features & Accessibility

#### Task 3.1 — Layer/Discipline Filtering

**New file:** `src/ui/FilterPanel.ts`

Read `viewer.metaScene.metaObjects` to extract unique `type` values (IfcWall, IfcBeam, IfcColumn, etc.). Group by discipline. Toggle visibility via `viewer.scene.setObjectsVisible()`.

#### Task 3.2 — High-Contrast Toggle

Add button in toolbar. Toggle `document.body.classList.toggle("high-contrast")`. Persist in localStorage. The CSS is already set up.

#### Task 3.3 — Keyboard Navigation

Add keyboard event listeners:
- `Tab` / `Shift+Tab`: cycle focusable elements
- `Escape`: close panels, cancel measurement mode
- `M`: toggle measurement
- `A`: toggle annotation mode
- Arrow keys in tree view
- Visible focus indicators (already in CSS with `:focus-visible`)

---

### PHASE 4: Testing & Release

#### Task 4.1 — Unit Tests

**For ViewerCore (with mocked xeokit):**
```typescript
// tests/unit/ViewerCore.test.ts
jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      objectIds: [],
      getAABB: () => [0,0,0,10,10,10],
      xrayMaterial: {},
      highlightMaterial: {},
      models: {},
    },
    camera: { projection: "perspective" },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: {},
    metaScene: { metaObjects: {} },
    destroy: jest.fn(),
  })),
  SectionPlanesPlugin: jest.fn().mockImplementation(() => ({
    createSectionPlane: jest.fn(),
    showControl: jest.fn(),
    hideControl: jest.fn(),
    destroySectionPlane: jest.fn(),
    clear: jest.fn(),
  })),
  NavCubePlugin: jest.fn(),
}));
```

**Coverage target:** Raise thresholds incrementally per phase. Phase 1 actual: ~8% stmts / 2% branch / 12% funcs / 7% lines (thresholds: 5/2/5/5).

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
    // Current (Phase 1): 2/5/5/5
    // Target (V1):        80/70/70/80
    branches: 2,
    functions: 5,
    lines: 5,
    statements: 5,
  },
},
```
Raise thresholds incrementally as implementation progresses. Phase 1 actual: ~8% stmts / 2% branch / 12% funcs / 7% lines.

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
| `src/tools/MeasurementTool.ts` | 2.1 | Distance measurement + cumulative path |
| `src/annotations/AnnotationOverlay.ts` | 2.3 | 3D markers for annotations |
| `src/ui/FilterPanel.ts` | 3.1 | Layer/discipline filtering UI |
| `tests/unit/ViewerCore.test.ts` | 4.1 | Unit tests for ViewerCore |
| `tests/unit/ModelLoader.test.ts` | 4.1 | Unit tests for ModelLoader |
| `tests/unit/UIController.test.ts` | 4.1 | Unit tests for UIController |
| `tests/unit/MeasurementTool.test.ts` | 4.1 | Unit tests for measurement |
| `tests/performance/benchmark.ts` | 3.4 | Performance benchmarks |

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

### Phase 2: Measurements & Tools
- [ ] Task 2.1: Two-point distance measurement with snapping
- [ ] Task 2.2: Cumulative path distance
- [ ] Task 2.3: 3D annotation markers
- [ ] Task 2.4: JSON import UI

### Phase 3: Civil Features & Accessibility
- [ ] Task 3.1: Layer/discipline filtering
- [ ] Task 3.2: High-contrast toggle
- [ ] Task 3.3: Full keyboard navigation
- [ ] Task 3.4: Performance benchmarks

### Phase 4: Testing & Release
- [ ] Task 4.1: ≥80% unit test coverage
- [ ] Task 4.2: E2E tests for all features
- [ ] Task 4.3: Accessibility audit passes (≥90 Lighthouse)
- [ ] Task 4.4: Docs updated
- [ ] Task 4.5: v0.1.0 released

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
