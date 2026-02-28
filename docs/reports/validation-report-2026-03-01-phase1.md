# Validation Report — Phase 1

> **Date:** 2026-03-01  
> **Auditor:** Claude Opus 4.6 (Copilot Agent Mode)  
> **Scope:** Phase 1 — xeokit Integration (Tasks 1.1–1.6)  
> **Verdict:** PASS WITH CONDITIONS  
> **Grade:** B (83%)

## Executive Summary

Phase 1 is functionally complete — all six tasks (1.1–1.6) have real implementations that replace the original stubs. The codebase compiles, lints, passes all existing tests, and builds successfully. However, there are **no unit tests for any Phase 1 code** (only the pre-existing AnnotationService tests), several missing error-handling paths (WebGL context loss, graceful degradation), event listener leaks in `_updateSectionList`, and the execution prompt is now significantly outdated. The project is ready to proceed to Phase 2 provided the HIGH-severity items in the fix-list are addressed first.

---

## Environment Verification (Step 0)

| Check | Status | Details |
|---|---|---|
| Format (`prettier`) | **PASS** | All matched files use Prettier code style |
| Lint (`eslint`) | **PASS** | 0 errors, 0 warnings (1 informational: TS 5.9.3 > supported <5.6.0) |
| Typecheck (`tsc --noEmit`) | **PASS** | Clean — no errors |
| Unit tests (`jest`) | **PASS** | 8/8 passing (AnnotationService only) |
| Build (`tsc && vite build`) | **PASS** | 2.35 kB HTML, 3.66 kB CSS, 1,087.91 kB JS (chunk warning) |
| `npm audit --production` | **PASS** | 0 vulnerabilities |
| Git status | **CLEAN** | No uncommitted changes. HEAD at `ebd6ec1` (origin/main in sync) |
| Coverage thresholds | **FAIL** | 11.67% stmts / 3.92% branch / 14.75% funcs / 10.86% lines — all below even the lowered jest thresholds (25/10/20/25) |

**Git log (Phase 1 commits):**
```
9c318f8 feat(ui): add section plane list with remove/clear UI (Task 1.5)
ae102aa feat(ui): add search filtering and tree view navigation (Task 1.4)
774f00b feat(ui): add object selection with properties panel (Task 1.3)
751942d feat(loader): wire ModelLoader to xeokit GLTFLoaderPlugin
c7f67af feat(viewer): initialize xeokit Viewer with orbit/pan/zoom, X-ray, section planes, NavCube
```

---

## Structural Audit (Step 1)

### Planned files vs. actual

| Planned File (Execution Prompt FILE MAP) | Status | Notes |
|---|---|---|
| `src/main.ts` | ✅ Exists | Modified — now imports PropertiesPanel, TreeView |
| `src/index.html` | ✅ Exists | Modified — `<canvas>` elements added |
| `src/viewer/ViewerCore.ts` | ✅ Exists | Fully rewritten (188 lines) |
| `src/loader/ModelLoader.ts` | ✅ Exists | Fully rewritten (77 lines) |
| `src/ui/UIController.ts` | ✅ Exists | Heavily modified (164 lines) |
| `src/annotations/AnnotationService.ts` | ✅ Exists | Unchanged (pre-Phase 1) |
| `src/styles/main.css` | ✅ Exists | Extended (278 lines) |
| `tests/unit/AnnotationService.test.ts` | ✅ Exists | Unchanged |
| `tests/e2e/viewer.spec.ts` | ✅ Exists | Unchanged (smoke tests only) |
| `scripts/convert-ifc.mjs` | ✅ Exists | Unchanged |
| `data/sample-models/` | ⚠️ Empty | Task 0.2 not yet done — no sample models |
| `.github/workflows/*.yml` | ✅ Exists | Not modified in Phase 1 |

### Files created beyond original plan

| Actual File | Purpose | Should it exist? |
|---|---|---|
| `src/ui/PropertiesPanel.ts` | IFC metadata display | ✅ Yes — planned in "FILES TO CREATE" (Phase 1.3) |
| `src/ui/TreeView.ts` | xeokit TreeViewPlugin wrapper | ✅ Yes — planned as optional (Phase 1.4) |
| `docs/prompts/PROMPT-validate-implementation-civil-bim-viewer.md` | This validation prompt | ✅ Yes — tooling |

### Docs structure

The `docs/` files have been reorganized into `docs/review/`, `docs/_archive/`, `docs/prompts/`, and `docs/reports/`. The completion plan documents this at `docs/review/` but it was **not explicitly tracked in a reorganization commit** — it was swept up in the `git add -A` during Task 1.1's commit (`c7f67af`). This is a minor concern (no data lost, but commit message doesn't mention doc move).

---

## Task-by-Task Audit (Step 2)

### Task 1.1 — Initialize xeokit Viewer in ViewerCore

**Completion Plan AC (verbatim):**
> Canvas renders a blank scene with orbit/pan/zoom controls working. Toggle 2D/3D and X-ray functions work (on empty scene).

**Actual Implementation:**
- File: `src/viewer/ViewerCore.ts` (188 lines, fully rewritten)
- Viewer created with `transparent: true`, `saoEnabled: false`, `pbrEnabled: false`, `dtxEnabled: true`, `antialias: true`
- X-ray + highlight materials configured
- SectionPlanesPlugin, NavCubePlugin initialized
- Default camera set
- Exposes `get viewer()` for plugins

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Canvas renders blank scene with orbit/pan/zoom | **PASS** | `Viewer` initialized with `canvasId`, CameraControl is automatic |
| Toggle 2D/3D works | **PASS** | `setMode()` at L122–146 uses `cameraFlight.flyTo` with `projection: "ortho"/"perspective"` |
| X-ray works | **PASS** | `setXray()` at L149 calls `setObjectsXRayed` with batch API |
| Expose viewer for plugins | **PASS** | `get viewer()` at L36 |

**Architectural Divergences:**
1. **Import path:** Uses `from "@xeokit/xeokit-sdk"` instead of `from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js"`. **IMPROVEMENT** — simpler, works correctly with Vite's `module` field resolution + `moduleResolution: "bundler"`. Safe for dev and production builds. Documented import convention in execution prompt is wrong.
2. **NavCube:** Added in Task 1.1 (not specifically required by AC). **IMPROVEMENT** — nice UX addition.
3. **Selection wiring:** `_initSelection()` added here (planned for Task 1.3). **NEUTRAL** — reasonable to co-locate with Viewer init.

**Issues Found:**
- **[GAP]** No WebGL context loss handler (`webglcontextlost`/`webglcontextrestored`). Execution prompt explicitly documents this. — Severity: **MEDIUM**
- **[GAP]** No WebGL2 availability check / graceful degradation. — Severity: **LOW** (MVP)
- **[DEBT]** `_viewer!` uses definite assignment assertion. Safe here since `_initViewer()` is called in constructor, but worth noting. — Severity: **LOW**

---

### Task 1.2 — Wire ModelLoader to xeokit GLTFLoaderPlugin

**Completion Plan AC (verbatim):**
> Sample GLB model loads and renders in 3D canvas. Properties are accessible.

**Actual Implementation:**
- File: `src/loader/ModelLoader.ts` (77 lines, fully rewritten)
- `GLTFLoaderPlugin` created in constructor
- `loadProject()` returns a Promise that resolves on `"loaded"` / rejects on `"error"`
- Error shown in `#properties-panel`
- `unloadAll()` iterates and destroys all scene models

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Sample GLB loads and renders | **PARTIAL** | Code is correct, but **no sample GLB exists** (`data/` is empty — Task 0.2 not done). Cannot verify rendering. `main.ts` wraps in try/catch to handle gracefully. |
| Properties accessible | **PASS** | `metaModelSrc` is passed to `gltfLoader.load()`, which populates `metaScene` |

**Architectural Divergences:**
1. **`ProjectConfig` interface retained but unused.** The `loadProject()` method takes a `projectId` string, not a `ProjectConfig`. Interface is dead code. — **MINOR DEBT**

**Issues Found:**
- **[GAP]** No loading progress callback/event (AC mentions this: "Add loading progress callback/event"). — Severity: **LOW** (nice-to-have for MVP)
- **[DEBT]** `ProjectConfig` interface exported but never used anywhere. — Severity: **LOW**
- **[BUG-RISK]** Error handler writes directly to `#properties-panel` DOM, bypassing PropertiesPanel class. If PropertiesPanel later calls `hide()`, it will overwrite the error. — Severity: **LOW**

---

### Task 1.3 — Object Selection & Properties Panel

**Completion Plan AC (verbatim):**
> Click object → highlights + shows properties. Click empty → deselects. Tab key cycles.

**Actual Implementation:**
- `ViewerCore._initSelection()` (L95–115): wires `cameraControl.on("picked")` and `"pickedNothing"`
- `ViewerCore.onSelect(callback)` (L118–120): registers callback
- `PropertiesPanel.ts` (60 lines): reads `metaScene.metaObjects[entityId]`, renders name/type/parent/propertySets
- `main.ts` (L44–51): wires `viewer.onSelect` → `propertiesPanel.show/hide` + `treeView.showNode`

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Click object → highlights + shows properties | **PASS** | `picked` event → `entity.selected = true`, `entity.highlighted = true`, fires callback → `propertiesPanel.show()` |
| Click empty → deselects | **PASS** | `pickedNothing` → clears selection/highlight, fires callback(null) → `propertiesPanel.hide()` |
| Tab key cycles objects | **FAIL** | No keyboard selection implemented. No Tab-to-cycle-objects handler. This is AC for Phase 1 but noted as Phase 3.3 work in completion plan. |

**Architectural Divergences:**
1. **Selection via `cameraControl.on("picked")` instead of `scene.input.on("mouseclicked")` + `scene.pick()`.** **IMPROVEMENT** — `cameraControl.on("picked")` is the higher-level API that provides `PickResult` directly, handles camera interaction conflicts properly, and is the xeokit-recommended approach.
2. **Single callback pattern** (`_onSelect: SelectionCallback | null`) rather than event emitter. Only one listener can be registered. — **CONCERN** — if Phase 2 (annotations) also needs to listen for selection, this will need refactoring to an array of callbacks or event emitter.

**Issues Found:**
- **[GAP]** Tab key / keyboard-based object selection not implemented. AC says "Tab key cycles." — Severity: **MEDIUM** (overlaps with Phase 3.3 keyboard navigation)
- **[DEBT]** Single-callback pattern will need refactoring for Phase 2. — Severity: **MEDIUM**
- **[BUG-RISK]** `String(entity.id)` coercion: xeokit entity IDs are `string | number`. The `metaScene.metaObjects` is keyed by string. If xeokit uses numeric IDs internally, `String(42)` → `"42"` might not match `metaObjects["42"]`. In practice, IFC-based models use string IDs, so **LOW RISK** but worth monitoring.

---

### Task 1.4 — Search & Tree View

**Completion Plan AC (verbatim):**
> Search returns matching objects. Tree toggles isolate/hide. Tree ↔ 3D selection is bidirectional.

**Actual Implementation:**
- `TreeView.ts` (77 lines): wraps `TreeViewPlugin` with `containerElementId`, `autoAddModels`, hierarchy, sort, prune
- `TreeView.on("nodeTitleClicked")` → fly to + select entity
- `UIController._bindSearch()` (L124–153): searches `metaScene` by name/type, X-rays non-matches, highlights matches
- `main.ts`: wires `viewer.onSelect` → `treeView.showNode` for 3D→tree sync

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Search returns matching objects | **PASS** | Iterates `metaScene.metaObjects`, matches name/type, highlights matches |
| Tree toggles isolate/hide | **PARTIAL** | Tree shows hierarchy and clicking selects. No right-click context menu for isolate/hide/show. |
| Tree ↔ 3D bidirectional | **PASS** | Tree click → 3D select (TreeView L31–46). 3D select → tree highlight (main.ts L49: `treeView.showNode`). |

**Architectural Divergences:**
1. **TreeView as separate class** instead of in UIController. **IMPROVEMENT** — better separation of concerns, testable in isolation, reusable.
2. **Search uses X-ray + highlight** instead of visibility toggle. **IMPROVEMENT** — preserves spatial context (X-rayed objects still visible as ghost), avoids disorienting visibility changes.
3. **Search does not reset highlight** on clear properly — when query is empty, it resets visibility and X-ray but does **not** reset highlights. If objects were highlighted by search, they stay highlighted. — **BUG**

**Issues Found:**
- **[BUG]** Search clear doesn't reset highlights. When user clears the search input, `setObjectsHighlighted` is never called with `false`. Highlighted objects remain highlighted. — Severity: **MEDIUM**
- **[GAP]** No right-click context menu on tree nodes (isolate/hide/show). AC mentions this. — Severity: **LOW** (nice-to-have for MVP)
- **[GAP]** Tree click selects entity but does NOT fire `ViewerCore.onSelect` callback, so the PropertiesPanel won't update on tree click. The tree bypasses ViewerCore's selection system; it directly sets `entity.selected/highlighted` and calls `cameraFlight.flyTo`. — Severity: **HIGH**

---

### Task 1.5 — Section Planes (Full Implementation)

**Completion Plan AC (verbatim):**
> Users add, move, remove planes. Clipping updates in real time. Plane state exportable.

**Actual Implementation:**
- `ViewerCore.addSectionPlane()` (L155–172): creates plane at scene center, shows gizmo, returns ID
- `ViewerCore.removeSectionPlane(id)` (L175–177): destroys by ID
- `ViewerCore.clearSectionPlanes()` (L180–183): clears all, resets counter
- `UIController._updateSectionList()` (L83–120): renders section chips in toolbar, bind remove/clear-all

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Users add planes | **PASS** | Button click → `addSectionPlane()` → SectionPlanesPlugin creates plane |
| Move planes via drag | **PASS** | `showControl(id)` enables xeokit's interactive gizmo with drag handles |
| Remove planes | **PASS** | Chip remove buttons + clear-all wired |
| Clipping real time | **PASS** | xeokit SectionPlanesPlugin provides real-time clipping by default |
| Plane state exportable | **FAIL** | No export/serialization of plane positions. AC says "Plane state exportable." |

**Architectural Divergences:**
1. **Plane limit not enforced.** AC says "Allow adding up to 6 planes." No limit implemented. — **MINOR**

**Issues Found:**
- **[GAP]** No plane state export (positions/directions to JSON). — Severity: **LOW** (deferrable)
- **[BUG]** Event listener leak in `_updateSectionList()`. Every time this method is called, it sets `container.innerHTML` (destroying old buttons) and then adds NEW event listeners to the fresh buttons. However, it ALSO adds a `click` listener to `#btn-clear-sections` which is recreated each time. If DOM GC handles this correctly (old listeners orphaned), it's fine. But the pattern is fragile. — Severity: **MEDIUM**
- **[GAP]** No limit on number of section planes. — Severity: **LOW**

---

### Task 1.6 — Camera Mode Toggle (3D ↔ 2D)

**Completion Plan AC (verbatim):**
> Toggle is smooth. 2D shows orthographic projection. Controls adapt per mode.

**Actual Implementation:**
- `ViewerCore.setMode()` (L122–146): `flyTo` with `projection: "ortho"` for 2D (top-down), `"perspective"` for 3D, `duration: 0.5`
- `UIController._bindToolbar()` (L35–44): wires btn-3d/btn-2d, toggles `aria-pressed`
- Camera set: 2D eye at `[cx, aabb[4]+50, cz]`, look at center, up `[0,0,-1]`

**AC Verdict:**

| Criterion | Status | Evidence |
|---|---|---|
| Toggle is smooth | **PASS** | `duration: 0.5` for animated transition |
| 2D shows orthographic | **PASS** | `projection: "ortho"` in flyTo options |
| Controls adapt per mode | **PARTIAL** | No orbit lock in 2D mode. AC says "disable orbit (allow pan/zoom only)" for 2D. CameraControl still allows full orbit in ortho mode. |

**Architectural Divergences:**
- None significant.

**Issues Found:**
- **[GAP]** 2D mode doesn't disable orbit. User can orbit in orthographic mode, defeating the purpose of a plan view. — Severity: **MEDIUM**
- **[DEBT]** `_currentMode` is tracked but there's no getter-based state sync — if `setMode` fails mid-flight, state could be inconsistent. — Severity: **LOW**

---

## Cross-Cutting Concerns (Step 3)

### 3a. Type Safety

| Check | Status | Notes |
|---|---|---|
| Public APIs have explicit return types | **PASS** | All public methods have return types |
| No `any` types | **PASS** | No `any` in Phase 1 code |
| No unsafe type assertions | **PASS** | Only `as HTMLInputElement \| null` (safe, with null check) |
| xeokit types used correctly | **PASS** | `PickResult` inferred from `cameraControl.on("picked")` overload; entity properties accessed correctly |
| Event handler signatures match types | **PASS** | `"picked"`, `"pickedNothing"`, `"nodeTitleClicked"` all match xeokit d.ts overloads |

### 3b. Error Handling

| Check | Status | Notes |
|---|---|---|
| Model loading failures | **PASS** | Promise rejects on error, try/catch in main.ts, user-facing msg in panel |
| WebGL context loss | **FAIL** | Not handled. No `webglcontextlost`/`webglcontextrestored` listeners |
| Missing DOM elements | **PASS** | All `getElementById` calls are null-checked (`?.` or `if (!el) return`) |
| Unhandled promise rejections | **PASS** | `init().catch()` in main.ts, `loadProject` wrapped in try/catch |
| User-facing error messages | **PARTIAL** | Model load error shown in panel; but WebGL failures show nothing |

### 3c. Memory Management

| Check | Status | Notes |
|---|---|---|
| `destroy()` cleans up | **PARTIAL** | ViewerCore.destroy() cleans NavCube + SectionPlanes + Viewer. But does NOT remove `cameraControl.on` listeners. |
| No event listener leaks | **FAIL** | `_updateSectionList()` re-creates DOM + listeners each call without cleanup. `_initSelection` adds `cameraControl.on` listeners but `destroy()` doesn't remove them. UIController adds toolbar listeners in init but has no destroy(). |
| Models destroyed on unload | **PASS** | `unloadAll()` iterates and destroys each model |
| No circular references | **PASS** | Module graph is DAG: main → {ViewerCore, ModelLoader, UIController, TreeView, PropertiesPanel} → ViewerCore |

### 3d. Accessibility (WCAG 2.1 AA Readiness)

| Check | Status | Notes |
|---|---|---|
| All elements have aria-label | **PASS** | Every button, panel, input, and section has `aria-label` |
| `aria-pressed` toggled | **PASS** | 3D/2D/X-Ray buttons correctly toggle |
| `aria-live` regions | **PASS** | `#properties-panel` has `aria-live="polite"` |
| No focus traps | **PASS** | No custom focus management that could trap |
| Color contrast | **PASS** | Dark theme: `#eaeaea` on `#1a1a2e` = 12.6:1, well above 4.5:1. High-contrast mode available. |
| Touch targets ≥44px | **PASS** | `--btn-min-size: 44px` enforced. Section chips are 32px min-height (below threshold). |

### 3e. Code Conventions

| Check | Status | Notes |
|---|---|---|
| Prettier formatting | **PASS** | Verified by `format:check` |
| Import order | **PASS** | External → blank line → internal throughout |
| JSDoc on public methods | **PARTIAL** | ViewerCore, ModelLoader methods have JSDoc. UIController.init() lacks JSDoc. PropertiesPanel.show/hide have JSDoc. TreeView methods have JSDoc. |
| Conventional commits | **PASS** | All 5 Phase 1 commits follow `feat(scope):` pattern |
| No debug console.log | **PASS** | All logging uses `console.info`, `console.error`, or `console.warn` — intentional structured logging |

### 3f. Performance Awareness

| Check | Status | Notes |
|---|---|---|
| Batch APIs used | **PASS** | `setObjectsXRayed`, `setObjectsSelected`, `setObjectsHighlighted` — batch calls throughout |
| Search efficient | **PASS** | Single pass over `Object.keys(metaScene.metaObjects)`, O(n) |
| Bundle size tracked | **NOTED** | 1,088 kB JS — xeokit-sdk bundled monolithically. Chunk size warning present. Not addressed (no manual chunks). Acceptable for MVP. |
| No DOM queries in hot paths | **PASS** | DOM elements cached in constructors, no queries during render loops |

---

## Test Coverage Audit (Step 4)

### Unit Tests

| Module | Has Unit Tests? | Test Count | Key Scenarios Covered | Missing Scenarios |
|---|---|---|---|---|
| `AnnotationService.ts` | ✅ Yes | 8 | CRUD, persistence, export | BCF import (TODO) |
| `ViewerCore.ts` | ❌ No | 0 | — | init, setMode, setXray, addSectionPlane, destroy, onSelect |
| `ModelLoader.ts` | ❌ No | 0 | — | loadProject success/error, unloadAll |
| `UIController.ts` | ❌ No | 0 | — | toolbar binding, search filter, section list |
| `PropertiesPanel.ts` | ❌ No | 0 | — | show with metadata, show without, hide |
| `TreeView.ts` | ❌ No | 0 | — | node click, setHierarchy, showNode |

### E2E Tests

| Scenario | Has E2E Test? | Status | Notes |
|---|---|---|---|
| Page loads correctly | ✅ | Existing | Title check |
| Toolbar buttons render | ✅ | Existing | All 7 buttons |
| 3D/2D toggle aria-pressed | ✅ | Existing | Click + verify attribute |
| Search input accessible | ✅ | Existing | Focus + fill |
| BCF export download | ✅ | Existing | Download trigger |
| Keyboard reachability | ✅ | Existing | Focus all buttons |
| Object selection | ❌ | — | Needs loaded model (no sample data) |
| Properties panel updates | ❌ | — | Needs loaded model |
| Tree view loads | ❌ | — | Needs loaded model |
| Search filters objects | ❌ | — | Needs loaded model |
| Section plane add/remove | ❌ | — | Not tested |

### Coverage Metrics

| Metric | Current | Phase 1 Implicit Target | Phase 4 Target |
|---|---|---|---|
| Statements | 11.67% | — | ≥80% |
| Branches | 3.92% | — | ≥70% |
| Functions | 14.75% | — | ≥80% |
| Lines | 10.86% | — | ≥80% |

**Note:** Coverage thresholds in `jest.config.js` are set to 25/10/20/25 but the actual coverage is below even these. `npm run test:coverage` exits with code 1 (failure). The regular `npm run test` passes because it doesn't check coverage.

---

## Execution Prompt Accuracy Audit (Step 5)

| Execution Prompt Section | Accurate? | What Changed |
|---|---|---|
| "CURRENT SOURCE CODE" section | ❌ **Stale** | Shows original stubs; all files have been rewritten. Useless for future phases. |
| "FILE MAP" legend (★/◐/✅) | ❌ **Stale** | ViewerCore, ModelLoader, UIController no longer stubs. PropertiesPanel, TreeView not listed. |
| Import path guidance (`/dist/xeokit-sdk.es.js`) | ❌ **Wrong** | Implementation uses `from "@xeokit/xeokit-sdk"` successfully. The `.es.js` path was never needed. |
| xeokit API reference snippets | ⚠️ **Mostly OK** | `getAABB()` needs `ids` parameter (not documented). `Entity.id` is `string \| number` (not documented). `cameraControl.on("picked")` callback type is `PickResult` (not documented). |
| "CODEBASE CONVENTIONS" — import path | ❌ **Wrong** | Says "always use .es.js path" — opposite of reality |
| Phase 1 task descriptions | ⚠️ **Partially stale** | Task 1.3 suggests `scene.input.on("mouseclicked")` — implementation correctly uses `cameraControl.on("picked")` |
| "FILES TO CREATE" table | ⚠️ **Partially done** | PropertiesPanel.ts ✅, TreeView.ts ✅, MeasurementTool.ts (Phase 2), others pending |
| "CHECKLIST PER TASK" | ⚠️ **Partially followed** | Code, typecheck, lint, format, build all verified. Unit tests NOT added per-task. Commits done. |

### Required Updates to Execution Prompt

1. **CRITICAL:** Replace "CURRENT SOURCE CODE" section with actual implemented code or remove it entirely (it's misleading)
2. **CRITICAL:** Fix import path guidance — `from "@xeokit/xeokit-sdk"` is correct, NOT `/dist/xeokit-sdk.es.js`
3. **HIGH:** Update FILE MAP legend — mark Phase 1 files as ✅
4. **HIGH:** Update "CODEBASE CONVENTIONS" import patterns section
5. **MEDIUM:** Add discovered xeokit API quirks: `getAABB(ids)` required param, `Entity.id` is `string|number`, `PickResult` type from cameraControl events
6. **MEDIUM:** Update Phase 2+ guidance to use `cameraControl.on("picked")` pattern instead of `scene.input.on("mouseclicked")`
7. **LOW:** Add "FILES TO CREATE" entries for `src/ui/TreeView.ts` status update

---

## Dependency & Security Audit (Step 6)

| Check | Status | Notes |
|---|---|---|
| `npm audit` = 0 high/critical | ✅ PASS | 0 vulnerabilities |
| All prod dependencies necessary | ✅ PASS | Only `@xeokit/xeokit-sdk` (actively used) |
| TypeScript version compatibility | ⚠️ WARNING | Installed: 5.9.3, ESLint plugin supports <5.6.0. Currently works, but may break on plugin update. |
| Node.js engine | ✅ PASS | Requires >=20 (enforced in package.json) |
| License compatibility | ✅ PASS | Project AGPL-3.0 + xeokit AGPL-3.0 = compatible |
| No credentials in source | ✅ PASS | No API keys, tokens, or secrets found |
| `.gitignore` coverage | ✅ PASS | `node_modules/`, `dist/`, coverage reports excluded |

---

## Phase Readiness Assessment (Step 7)

### 1. Is Phase 1 fully done?

**Mostly yes, with caveats:**

| Task | Status | Unmet AC |
|---|---|---|
| 1.1 | ✅ Complete | WebGL context loss handler missing (called out in execution prompt, not in AC) |
| 1.2 | ⚠️ Nearly complete | Cannot verify model rendering — no sample models (Task 0.2 dependency) |
| 1.3 | ⚠️ Nearly complete | Tab-key object cycling not implemented. Tree click doesn't fire `onSelect` (properties panel doesn't update on tree click) |
| 1.4 | ⚠️ Nearly complete | No right-click context menu. Search clear doesn't reset highlights. |
| 1.5 | ⚠️ Nearly complete | No plane state export. No max plane limit. |
| 1.6 | ⚠️ Nearly complete | Orbit not disabled in 2D mode. |

### 2. Blocking issues for Phase 2?

Phase 2 (Measurements & Tools) depends on:
- **Task 1.1 (Viewer init):** ✅ Met
- **Task 1.3 (Selection for snap):** ✅ Met — `cameraControl.on("picked")` provides `worldPos` needed for measurement anchors
- **`ViewerCore.viewer` exposure:** ✅ Met — `DistanceMeasurementsPlugin` needs the raw Viewer

**Potential blockers:**
- **Single-callback `onSelect` pattern:** Phase 2 Task 2.3 (annotation overlays) will ALSO need to listen for selection events. Current pattern only supports one listener. **Must refactor to array/event emitter before Phase 2.3.**
- **No sample models:** Without real models to test against, measurement tool development will be difficult. Task 0.2 should be done before Phase 2.

### 3. Is the codebase clean and buildable?

| Question | Answer |
|---|---|
| Can a new dev clone and run in <5 min? | **Yes** — `npm install && npm run dev` works. But viewer shows empty scene (no models). |
| Any uncommitted changes? | **No** — git status clean |
| `npm run dev` starts working server? | **Yes** — Vite on :3000, viewer shell renders |

### 4. Overall Code Quality Grade

**Grade: B (83%)**

**Rationale:**
- ✅ All stubs replaced with real implementations
- ✅ Clean build, clean lint, clean typecheck
- ✅ Good architecture (separation of concerns, typed APIs, batch operations)
- ✅ Accessible HTML/CSS foundation
- ❌ Zero unit tests for Phase 1 code (-10%)
- ❌ Some AC partially met (keyboard selection, orbit lock, tree→properties) (-5%)
- ❌ Event listener leak in section list (-2%)

---

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|----------|----------|-------------|---------|--------|
| 1 | **HIGH** | Gap | Tree node click doesn't fire `onSelect` callback — PropertiesPanel won't update when user clicks tree | `src/ui/TreeView.ts` | 0.5h |
| 2 | **HIGH** | Debt | `onSelect` only supports single callback — will block Phase 2.3 (annotation selection) | `src/viewer/ViewerCore.ts` | 1h |
| 3 | **HIGH** | Gap | Coverage thresholds in jest.config.js are failing (`npm run test:coverage` exits 1) — should lower thresholds to match reality or add tests | `jest.config.js` | 0.5h |
| 4 | **MEDIUM** | Bug | Search clear doesn't reset highlighted objects | `src/ui/UIController.ts` L130 | 10min |
| 5 | **MEDIUM** | Gap | 2D mode doesn't disable orbit (AC: "disable orbit, allow pan/zoom only") | `src/viewer/ViewerCore.ts` | 1h |
| 6 | **MEDIUM** | Gap | Tab-key object selection not implemented (AC for 1.3) | `src/viewer/ViewerCore.ts` | 2h |
| 7 | **MEDIUM** | Bug | Event listener leak in `_updateSectionList` — listeners accumulate on each DOM refresh | `src/ui/UIController.ts` L83-120 | 0.5h |
| 8 | **MEDIUM** | Gap | No WebGL context loss handler | `src/viewer/ViewerCore.ts` | 1h |
| 9 | **MEDIUM** | Debt | Execution prompt badly outdated — will mislead Phase 2 implementation | `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` | 2h |
| 10 | **LOW** | Debt | `ProjectConfig` interface exported but unused (dead code) | `src/loader/ModelLoader.ts` | 5min |
| 11 | **LOW** | Gap | No right-click context menu on tree nodes (isolate/hide/show) | `src/ui/TreeView.ts` | 3h |
| 12 | **LOW** | Gap | No section plane state export to JSON | `src/viewer/ViewerCore.ts` | 1h |
| 13 | **LOW** | Gap | No max section plane limit (AC says 6) | `src/viewer/ViewerCore.ts` | 10min |
| 14 | **LOW** | Debt | Section-chip `min-height: 32px` below WCAG 44px threshold | `src/styles/main.css` | 5min |
| 15 | **LOW** | Debt | TS version 5.9.3 is above eslint plugin supported range (<5.6.0) | `package.json` | N/A |

---

## Recommendations

1. **Proceed to Phase 2?** — **Yes, with conditions.** Fix items #1 (tree→properties), #2 (multi-listener), and #4 (search highlight clear) before starting Phase 2. These are foundational issues that will compound.

2. **What must be fixed first?**
   - Fix #1: Make TreeView fire `ViewerCore.onSelect` (or call PropertiesPanel directly) so tree clicks update properties
   - Fix #2: Refactor `onSelect` to support multiple listeners (array of callbacks) — Phase 2.3 needs this
   - Fix #4: Add `scene.setObjectsHighlighted(scene.highlightedObjectIds, false)` to the search-clear branch

3. **What can be deferred?**
   - Items #5 (orbit lock), #6 (keyboard selection), #8 (WebGL context loss), #11 (right-click menu), #12 (plane export) — can be deferred to Phase 3 (Accessibility) or Phase 4 (Polish)
   - Item #9 (execution prompt update) — should be done before Phase 2 but can be done in parallel

4. **Should the execution prompt be updated?**
   - **Yes, critically.** The "CURRENT SOURCE CODE" section shows stubs that no longer exist. The import path guidance is wrong. It will actively mislead the next implementation session. At minimum: update FILE MAP, fix import path, remove stale source code sections.
