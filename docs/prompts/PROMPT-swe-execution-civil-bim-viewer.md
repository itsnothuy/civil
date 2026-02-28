# Civil BIM Viewer — SWE Execution Prompt

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Act as a senior full-stack software engineer to implement the Civil BIM Viewer phase-by-phase until 100% functional  
> **Companion doc:** `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC, dependencies)  
> **Last updated:** 2026-03-01

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
| TypeScript | 5.4 (strict mode) | `tsconfig.json` |
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
│   ├── main.ts                              # Entry point — bootstraps all modules
│   ├── index.html                           # ARIA toolbar, canvas, panels, search
│   ├── viewer/ViewerCore.ts                 # ★ STUB — xeokit Viewer wrapper
│   ├── loader/ModelLoader.ts                # ★ STUB — GLTFLoaderPlugin wrapper
│   ├── ui/UIController.ts                   # ★ STUB — toolbar + search + headset
│   ├── annotations/AnnotationService.ts     # ✅ DONE — CRUD, localStorage, JSON export
│   └── styles/main.css                      # ◐ PARTIAL — layout, colors, high-contrast
├── tests/
│   ├── unit/AnnotationService.test.ts       # ✅ 8/8 passing (94% coverage)
│   └── e2e/viewer.spec.ts                   # ◐ PARTIAL — smoke tests only
├── scripts/convert-ifc.mjs                  # ✅ Ready (needs ifcconvert on PATH)
├── data/sample-models/                      # ★ EMPTY — no models converted yet
├── .github/workflows/
│   ├── ci.yml                               # ✅ Lint→Unit→E2E→Build→Security
│   ├── deploy.yml                           # ◐ Configured, never deployed
│   └── cla.yml                              # ✅ CLA Assistant
├── docs/                                    # 10 authoritative docs
│   └── reports/
│       ├── progress-report-2026-03-01.md
│       └── completion-plan-2026-03-01.md
├── package.json                             # Dependencies + scripts
├── tsconfig.json                            # ES2022, strict, bundler resolution
├── vite.config.ts                           # root: src, base: ./, outDir: ../dist
├── jest.config.js                           # ts-jest, jsdom, coverage thresholds
└── playwright.config.ts                     # Chromium + Safari + Mobile Chrome
```

Legend: ★ = stub/empty, ◐ = partial, ✅ = done

---

## CURRENT SOURCE CODE (Verbatim)

### `src/viewer/ViewerCore.ts` — THE MAIN STUB TO REPLACE
```typescript
// TODO (Task 1): Replace stub with real xeokit Viewer after `npm install`
// import { Viewer } from "@xeokit/xeokit-sdk";

export type ViewMode = "3d" | "2d";

export class ViewerCore {
  private canvasId: string;
  // viewer: Viewer;  // uncomment after installing @xeokit/xeokit-sdk

  constructor(canvasId: string) {
    this.canvasId = canvasId;
    this._initViewer();
  }

  private _initViewer(): void {
    // TODO (Task 1): Initialize xeokit Viewer
    console.info(`[ViewerCore] Canvas target: #${this.canvasId}`);
  }

  setMode(mode: ViewMode): void {
    console.info(`[ViewerCore] Mode → ${mode}`);
  }

  setXray(enabled: boolean): void {
    console.info(`[ViewerCore] X-ray → ${enabled}`);
  }

  addSectionPlane(): void {
    console.info("[ViewerCore] Section plane added.");
  }

  destroy(): void {
    console.info("[ViewerCore] Destroyed.");
  }
}
```

### `src/loader/ModelLoader.ts` — STUB
```typescript
import type { ViewerCore } from "../viewer/ViewerCore";

export interface ProjectConfig {
  id: string;
  name: string;
  modelUrl: string;
  metadataUrl: string;
}

export class ModelLoader {
  private _viewer: ViewerCore;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  async loadProject(projectId: string): Promise<void> {
    const basePath = `./data/${projectId}`;
    const metadataUrl = `${basePath}/metadata.json`;
    const modelUrl = `${basePath}/model.glb`;

    let metadata: Record<string, unknown> = {};
    try {
      const res = await fetch(metadataUrl);
      if (res.ok) {
        metadata = await res.json();
      } else {
        console.warn(`[ModelLoader] No metadata found at ${metadataUrl}`);
      }
    } catch {
      console.warn(`[ModelLoader] Failed to fetch metadata for project "${projectId}"`);
    }

    // TODO (Task 1): Load model via xeokit GLTFLoaderPlugin
    console.info(`[ModelLoader] Loading project "${projectId}" from ${modelUrl}`, metadata);
  }

  unloadAll(): void {
    console.info("[ModelLoader] All models unloaded.");
  }
}
```

### `src/ui/UIController.ts` — STUB
```typescript
import type { ViewerCore } from "../viewer/ViewerCore";
import type { ModelLoader } from "../loader/ModelLoader";
import type { AnnotationService } from "../annotations/AnnotationService";

export class UIController {
  private viewer: ViewerCore;
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
      this.viewer.addSectionPlane();
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
      console.info(`[UIController] Search: "${query}"`);
    });
  }

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
```

### `src/main.ts` — Entry Point
```typescript
import { ViewerCore } from "./viewer/ViewerCore";
import { ModelLoader } from "./loader/ModelLoader";
import { AnnotationService } from "./annotations/AnnotationService";
import { UIController } from "./ui/UIController";

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId") ?? "sample";

  const viewer = new ViewerCore("viewer-canvas");
  const loader = new ModelLoader(viewer);
  await loader.loadProject(projectId);

  const annotations = new AnnotationService(viewer);
  annotations.loadFromLocalStorage(projectId);

  const ui = new UIController(viewer, loader, annotations);
  ui.init();

  console.info(`[CivilBIMViewer] Project "${projectId}" loaded.`);
}

init().catch((err) => {
  console.error("[CivilBIMViewer] Initialization failed:", err);
});
```

### `src/index.html` — DOM Structure
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Open-source BIM/IFC viewer for civil and civic engineering" />
    <title>Civil BIM Viewer</title>
    <link rel="stylesheet" href="./styles/main.css" />
  </head>
  <body>
    <div id="app">
      <header id="toolbar" role="banner" aria-label="Viewer toolbar">
        <button id="btn-3d" aria-label="Switch to 3D view" aria-pressed="true">3D</button>
        <button id="btn-2d" aria-label="Switch to 2D plan view" aria-pressed="false">2D</button>
        <button id="btn-measure" aria-label="Activate measurement tool">Measure</button>
        <button id="btn-annotate" aria-label="Add annotation">Annotate</button>
        <button id="btn-section" aria-label="Add section plane">Section</button>
        <button id="btn-xray" aria-label="Toggle X-ray mode">X-Ray</button>
        <button id="btn-export-bcf" aria-label="Export issues as BCF">Export BCF</button>
      </header>

      <aside id="panel-tree" role="complementary" aria-label="Model tree">
        <input id="search-input" type="search" placeholder="Search objects…"
               aria-label="Search model objects" />
        <nav id="tree-view" aria-label="Model hierarchy tree"></nav>
      </aside>

      <main id="viewer-canvas" role="main" aria-label="3D model viewer"></main>

      <aside id="panel-properties" role="complementary" aria-label="Object properties">
        <section id="properties-panel" aria-live="polite" aria-label="Selected object properties">
          <p>Select an object to view properties.</p>
        </section>
        <section id="annotations-panel" aria-label="Annotations list"></section>
      </aside>
    </div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

### `src/annotations/AnnotationService.ts` — DONE (do not modify unless extending)
Already implemented: CRUD, localStorage persistence, JSON export, 8/8 tests passing.

---

## XEOKIT-SDK v2.6 API REFERENCE

> **Critical: All imports must use the full path:**
> ```typescript
> import { Viewer, ... } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
> ```
> **NOT** `from "@xeokit/xeokit-sdk"` — that points to CommonJS which doesn't work with Vite's ESM bundler.

### Viewer Initialization
```typescript
import { Viewer } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
import { GLTFLoaderPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
import { SectionPlanesPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
import { TreeViewPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

const treeView = new TreeViewPlugin(viewer, {
  containerElement: document.getElementById("tree-view")!,
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
import { NavCubePlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
// xeokit: always use .es.js path
import { Viewer, GLTFLoaderPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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

### PHASE 1: xeokit Integration (Start Here)

**Goal after this phase:** A functional 3D viewer that loads GLB models, supports orbit/pan/zoom, object selection, X-ray, section planes, search/tree, and 3D↔2D camera toggle.

#### Task 1.1 — Initialize xeokit Viewer

**What to change in `src/viewer/ViewerCore.ts`:**

1. Uncomment and fix the import:
```typescript
import {
  Viewer,
  SectionPlanesPlugin,
  NavCubePlugin,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
```

2. Replace `_initViewer()` stub:
```typescript
private _initViewer(): void {
  this.viewer = new Viewer({
    canvasId: this.canvasId,
    transparent: true,
    saoEnabled: false,
    pbrEnabled: false,
    dtxEnabled: true,
    antialias: true,
  });

  // Configure X-ray appearance
  this.viewer.scene.xrayMaterial.fill = true;
  this.viewer.scene.xrayMaterial.fillAlpha = 0.1;
  this.viewer.scene.xrayMaterial.fillColor = [0, 0, 0];
  this.viewer.scene.xrayMaterial.edgeAlpha = 0.3;

  // Configure highlight appearance
  this.viewer.scene.highlightMaterial.fill = true;
  this.viewer.scene.highlightMaterial.edges = true;
  this.viewer.scene.highlightMaterial.fillAlpha = 0.3;
  this.viewer.scene.highlightMaterial.edgeColor = [1, 1, 0];

  // Section planes plugin
  this._sectionPlanes = new SectionPlanesPlugin(this.viewer);
}
```

3. Implement all methods:
- `setMode("3d")` → `viewer.camera.projection = "perspective"` + flyTo scene AABB
- `setMode("2d")` → flyTo with `projection: "ortho"`, top-down view
- `setXray(enabled)` → `viewer.scene.setObjectsXRayed(viewer.scene.objectIds, enabled)`
- `addSectionPlane()` → `_sectionPlanes.createSectionPlane(...)` with scene center
- `destroy()` → `viewer.destroy()`

4. Expose `viewer` as a readonly property for ModelLoader and plugins

**Test approach:** 
- Unit tests in jsdom can't use WebGL. Mock `Viewer` constructor.
- Test that `setMode` calls are dispatched. Test destroy cleans up.
- Integration tests (Playwright) verify the canvas renders.

**Add to `src/index.html`:**
```html
<!-- NavCube canvas (bottom-right of viewer) -->
<canvas id="nav-cube-canvas" width="200" height="200"
        style="position:absolute; bottom:50px; right:10px; z-index:200000;"></canvas>
```

#### Task 1.2 — Wire ModelLoader

**What to change in `src/loader/ModelLoader.ts`:**

```typescript
import { GLTFLoaderPlugin } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

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
      autoMetaModel: true,
    });

    return new Promise((resolve, reject) => {
      sceneModel.on("loaded", () => {
        this._viewer.viewer.cameraFlight.flyTo(sceneModel);
        resolve();
      });
      sceneModel.on("error", (msg: string) => {
        console.error(`[ModelLoader] Load failed: ${msg}`);
        reject(new Error(msg));
      });
    });
  }

  unloadAll(): void {
    const models = this._viewer.viewer.scene.models;
    for (const id in models) {
      models[id].destroy();
    }
  }
}
```

#### Task 1.3 — Object Selection & Properties Panel

**New file:** `src/ui/PropertiesPanel.ts`

**Wire in ViewerCore:**
```typescript
// In ViewerCore or main.ts — add input handler
viewer.scene.input.on("mouseclicked", (coords: number[]) => {
  const pickResult = viewer.scene.pick({
    canvasPos: coords,
    pickSurface: true,
  });

  // Clear previous selection
  viewer.scene.setObjectsSelected(viewer.scene.selectedObjectIds, false);
  viewer.scene.setObjectsHighlighted(viewer.scene.highlightedObjectIds, false);

  if (pickResult?.entity) {
    pickResult.entity.selected = true;
    pickResult.entity.highlighted = true;
    // Show properties in panel
    propertiesPanel.show(pickResult.entity.id);
  } else {
    propertiesPanel.hide();
  }
});
```

**PropertiesPanel reads metadata:**
```typescript
const metaObject = viewer.metaScene.metaObjects[entityId];
if (metaObject) {
  metaObject.name;           // "Wall_001"
  metaObject.type;           // "IfcWall"
  metaObject.propertySets;   // IFC property sets
  metaObject.parent;         // parent MetaObject
  metaObject.children;       // child MetaObjects
}
```

#### Task 1.4 — Search & Tree View

**Wire in UIController:**
```typescript
// In init():
this._treeView = new TreeViewPlugin(this._viewer.viewer, {
  containerElement: document.getElementById("tree-view")!,
  hierarchy: "containment",
  autoExpandDepth: 1,
  sortNodes: true,
  pruneEmptyNodes: true,
});

// Tree node click → fly to object
this._treeView.on("nodeTitleClicked", (e) => {
  const entity = this._viewer.viewer.scene.objects[e.treeViewNode.objectId];
  if (entity) {
    this._viewer.viewer.cameraFlight.flyTo(entity);
    entity.selected = true;
  }
});

// Search filter
const input = document.getElementById("search-input") as HTMLInputElement;
input.addEventListener("input", () => {
  const query = input.value.toLowerCase();
  const metaObjects = this._viewer.viewer.metaScene.metaObjects;
  for (const id in metaObjects) {
    const name = metaObjects[id].name?.toLowerCase() ?? "";
    const type = metaObjects[id].type?.toLowerCase() ?? "";
    const visible = name.includes(query) || type.includes(query);
    const entity = this._viewer.viewer.scene.objects[id];
    if (entity) entity.visible = visible || query === "";
  }
});
```

#### Task 1.5 — Section Planes (already started in 1.1)

Expand `addSectionPlane()` to track planes and expose removal:
```typescript
private _planeCounter = 0;

addSectionPlane(): string {
  const aabb = this.viewer.scene.getAABB();
  const center = [
    (aabb[0] + aabb[3]) / 2,
    (aabb[1] + aabb[4]) / 2,
    (aabb[2] + aabb[5]) / 2,
  ];
  const id = `section-${++this._planeCounter}`;
  this._sectionPlanes.createSectionPlane({ id, pos: center, dir: [0, -1, 0] });
  this._sectionPlanes.showControl(id);
  return id;
}

removeSectionPlane(id: string): void {
  this._sectionPlanes.destroySectionPlane(id);
}

clearSectionPlanes(): void {
  this._sectionPlanes.clear();
}
```

#### Task 1.6 — Camera Mode Toggle

Already covered in Task 1.1 `setMode()`. Ensure smooth animation:
```typescript
setMode(mode: ViewMode): void {
  if (mode === "2d") {
    // Top-down orthographic
    const aabb = this.viewer.scene.getAABB();
    const center = [(aabb[0]+aabb[3])/2, (aabb[1]+aabb[4])/2, (aabb[2]+aabb[5])/2];
    this.viewer.cameraFlight.flyTo({
      eye: [center[0], aabb[4] + 50, center[2]],
      look: center,
      up: [0, 0, -1],
      projection: "ortho",
      duration: 0.5,
    });
  } else {
    this.viewer.cameraFlight.flyTo({
      aabb: this.viewer.scene.getAABB(),
      projection: "perspective",
      duration: 0.5,
    });
  }
}
```

---

### PHASE 2: Measurements & Tools

#### Task 2.1 — Distance Measurement Tool

**New file:** `src/tools/MeasurementTool.ts`

```typescript
import {
  DistanceMeasurementsPlugin,
  DistanceMeasurementsMouseControl,
  PointerLens,
} from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";
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
jest.mock("@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js", () => ({
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

**Coverage target:** ≥80% statements, ≥70% branches.

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
    // Current (stubs): 25/10/20/25
    // Target (V1):     80/70/70/80
    branches: 70,
    functions: 70,
    lines: 80,
    statements: 80,
  },
},
```
Raise thresholds incrementally as implementation progresses.

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
        xeokit: ["@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js"],
      },
    },
  },
},
```

### HTML Entry Point
Vite root is `src/`. The entry point is `src/index.html`. The `<main id="viewer-canvas">` element serves as the xeokit canvas target, but **xeokit needs a `<canvas>` element, not a `<main>` element**.

**Important fix needed in index.html:**
```html
<!-- Change <main> to contain a <canvas> -->
<main role="main" aria-label="3D model viewer" style="position: relative;">
  <canvas id="viewer-canvas" style="width: 100%; height: 100%;"></canvas>
  <canvas id="nav-cube-canvas" width="200" height="200"
          style="position:absolute; bottom:10px; right:10px; z-index:200;"></canvas>
</main>
```

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
viewer.scene.canvas.canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  console.error("[ViewerCore] WebGL context lost");
});

viewer.scene.canvas.canvas.addEventListener("webglcontextrestored", () => {
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
| `src/ui/PropertiesPanel.ts` | 1.3 | Display IFC metadata for selected object |
| `src/ui/TreeView.ts` | 1.4 | Optional wrapper around xeokit TreeViewPlugin |
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

### Phase 1: xeokit Integration
- [ ] Task 1.1: ViewerCore initializes xeokit Viewer, renders blank scene
- [ ] Task 1.2: ModelLoader loads GLB into 3D canvas
- [ ] Task 1.3: Click object → highlight + properties panel
- [ ] Task 1.4: Tree view + search filtering works bidirectionally
- [ ] Task 1.5: Section planes with interactive gizmo
- [ ] Task 1.6: 3D↔2D toggle with smooth animation

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
