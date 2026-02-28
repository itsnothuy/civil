# Civil BIM Viewer — 100% Completion Plan

> **Date:** 2026-03-01  
> **Source:** Original plan (`Web Apps in Civil Engineering.txt`), all `docs/` files, current codebase  
> **Goal:** Complete implementation of ALL features and infrastructure defined in the original plan, through MVP → V1 → V2

---

## How to Use This Document

This is a **Claude Opus 4.6 prompt-ready execution plan**. Each phase is broken into numbered tasks with:
- **Inputs** (what's needed before starting)
- **Outputs** (what's delivered when done)
- **Acceptance criteria** (how to verify completion)
- **Estimated effort** (dev-days for 1 developer)
- **Dependencies** (which tasks must complete first)

Phases are sequential. Tasks within a phase can often be parallelized. File references point to actual codebase locations.

---

## Phase 0: Foundation Fixes (Week 1 — 3-5 dev-days)

> **Goal:** Fix remaining scaffold issues so real development can begin on a solid base.

### Task 0.1 — Fix README Badge URLs and Content
- **File:** `README.md`
- **Work:** Replace `YOUR_ORG/civil-bim-viewer` with `itsnothuy/civil` in badge URLs. Add link to DR-001. Add format glossary (IFC → GLB → XKT). Add link to demo site (placeholder).
- **AC:** Badge URLs resolve correctly. No broken links.
- **Effort:** 0.25 days
- **Dependencies:** None

### Task 0.2 — Obtain and Convert Benchmark IFC Models
- **Files:** `data/sample-models/`, `scripts/convert-ifc.mjs`
- **Work:** 
  1. Download benchmark models: IFC Schependomlaan (~3 MB), IfcOpenShell Duplex (~2 MB), a bridge model (~50-80 MB) from Open IFC Model Database or similar
  2. Install ifcconvert (IfcOpenShell) locally
  3. Run `node scripts/convert-ifc.mjs <model.ifc> <projectId>` for each model
  4. Verify output: `data/<projectId>/model.glb` + `metadata.json`
  5. Commit converted models (or add to `.gitignore` and provide download script)
- **AC:** At least 2 GLB models loadable from `data/`. Conversion script runs without errors.
- **Effort:** 1 day
- **Dependencies:** None

### Task 0.3 — Extract Remaining Planning Sections as Docs
- **Source:** `Web Apps in Civil Engineering.txt` sections G, H, I, J, K
- **Work:** Extract and save as standalone docs (preserving original text + adding revision notes where decisions have changed):
  - `docs/G1-security-privacy-compliance.md` — Section G
  - `docs/H1-testing-quality-plan.md` — Section H
  - `docs/I1-cicd-release-engineering.md` — Section I
  - `docs/J1-documentation-community.md` — Section J
  - `docs/K1-roadmap-timeline.md` — Section K
- **AC:** All 5 files created. Each has a header noting extraction date and any revisions.
- **Effort:** 1 day
- **Dependencies:** None

### Task 0.4 — Enable GitHub Pages Deployment
- **Work:**
  1. Go to GitHub repo Settings → Pages → Enable from GitHub Actions
  2. Verify `deploy.yml` workflow triggers on push to main
  3. Verify the Vite build output deploys correctly
  4. Confirm demo site is accessible at `https://itsnothuy.github.io/civil/`
- **AC:** Demo site loads in browser. Shows the viewer UI shell (even without 3D content).
- **Effort:** 0.5 days
- **Dependencies:** Task 0.1

### Task 0.5 — Address Dependabot PRs
- **Work:** The 10 open Dependabot PRs (#1-#10) all fail CI due to issues now fixed on main. Rebase each PR on main and verify CI passes. Merge safe upgrades; close those requiring major version bumps with a note.
- **AC:** All safe PRs merged. No high-severity vulnerabilities in `npm audit`.
- **Effort:** 0.5 days
- **Dependencies:** None

---

## Phase 1: xeokit Integration — The Core (Weeks 1-3 — 12-18 dev-days)

> **Goal:** Replace all stubs with real xeokit Viewer functionality. After this phase, users can load and navigate 3D models.
>
> **This is the single most critical phase.** Everything else depends on it.

### Task 1.1 — Initialize xeokit Viewer in ViewerCore
- **File:** `src/viewer/ViewerCore.ts`
- **Work:**
  1. Uncomment xeokit imports: `import { Viewer } from "@xeokit/xeokit-sdk"`
  2. Initialize `Viewer` in `_initViewer()` with canvas, transparent background, SAO disabled (MVP)
  3. Implement `setMode()`: switch between perspective (3D) and ortho (2D) camera using `CameraFlightAnimation`
  4. Implement `setXray()`: use `viewer.scene.setObjectsXRayed()`
  5. Implement `addSectionPlane()`: use `SectionPlanesPlugin`
  6. Implement `destroy()`: call `viewer.destroy()`
  7. Expose `viewer` instance for use by ModelLoader and plugins
- **AC:** Canvas renders a blank scene with orbit/pan/zoom controls working. Toggle 2D/3D and X-ray functions work (on empty scene).
- **Test:** Update ViewerCore unit tests — verify init, mode switching, destroy.
- **Effort:** 3-4 days
- **Dependencies:** None
- **Source refs:** E1 Orbit/Pan/Zoom, E1 Section Planes, `ViewerCore.ts` TODO comments

### Task 1.2 — Wire ModelLoader to xeokit GLTFLoaderPlugin  
- **File:** `src/loader/ModelLoader.ts`
- **Work:**
  1. Import `GLTFLoaderPlugin` from xeokit-sdk
  2. Create plugin instance in constructor
  3. Implement `loadProject()`: load `model.glb` via `gltfLoader.load()` with metadata
  4. Implement `unloadAll()`: destroy all scene models
  5. Handle loading errors gracefully (model not found, corrupt file)
  6. Add loading progress callback/event
- **AC:** Sample GLB model loads and renders in 3D canvas. Properties are accessible.
- **Test:** Integration test — load a model, verify scene has entities.
- **Effort:** 2-3 days
- **Dependencies:** Task 1.1, Task 0.2 (need sample models)
- **Source refs:** D1 Pipeline 1, `ModelLoader.ts` TODO comments

### Task 1.3 — Object Selection & Properties Panel
- **File:** `src/viewer/ViewerCore.ts`, new `src/ui/PropertiesPanel.ts`
- **Work:**
  1. Add click handler on canvas for object picking (`viewer.scene.pick()`)
  2. Highlight selected object (change material color or use `setObjectsHighlighted`)
  3. Create PropertiesPanel component that displays IFC metadata for selected object
  4. Wire to UIController — clicking object opens panel, clicking empty space closes it
  5. Support keyboard selection (Tab to cycle objects, Enter to select)
- **AC:** Click object → highlights + shows properties. Click empty → deselects. Tab key cycles.
- **Test:** Unit test for pick logic. E2E test for select/deselect flow.
- **Effort:** 2-3 days
- **Dependencies:** Task 1.2 (need loaded model to select from)
- **Source refs:** E1 Object Selection & Properties

### Task 1.4 — Search & Tree View
- **File:** `src/ui/UIController.ts`, new `src/ui/TreeView.ts`
- **Work:**
  1. Use xeokit's `TreeViewPlugin` or build custom tree from model metadata
  2. Display hierarchical structure by IFC type / storey / layer
  3. Wire search input to filter tree nodes by name or IFC type
  4. Clicking tree node → selects object in 3D (fly-to + highlight)
  5. Right-click tree node → isolate/hide/show options
- **AC:** Search returns matching objects. Tree toggles isolate/hide. Tree ↔ 3D selection is bidirectional.
- **Test:** Integration test for search. Snapshot test for tree.
- **Effort:** 3-4 days
- **Dependencies:** Task 1.3 (builds on selection)
- **Source refs:** E1 Search & Tree View

### Task 1.5 — Section Planes (Full Implementation)
- **File:** `src/viewer/ViewerCore.ts`
- **Work:**
  1. Replace stub with `SectionPlanesPlugin` from xeokit
  2. Allow adding up to 6 planes with visual handles
  3. Support moving/rotating planes via drag
  4. Save plane positions to viewer state (in-memory JSON)
  5. Add UI buttons for add/remove/toggle planes
- **AC:** Users add, move, remove planes. Clipping updates in real time. Plane state exportable.
- **Test:** Unit test for plane matrix. UI test for add/remove.
- **Effort:** 2-3 days
- **Dependencies:** Task 1.1
- **Source refs:** E1 Section Planes

### Task 1.6 — Camera Mode Toggle (3D ↔ 2D Orthographic)
- **File:** `src/viewer/ViewerCore.ts`, `src/ui/UIController.ts`
- **Work:**
  1. Implement proper 3D↔2D toggle using `viewer.camera.projection = "ortho" | "perspective"`
  2. Use `CameraFlightAnimation` for smooth transition
  3. In 2D mode: lock to top-down or front view, disable orbit (allow pan/zoom only)
  4. Wire btn-3d and btn-2d to updated logic
- **AC:** Toggle is smooth. 2D shows orthographic projection. Controls adapt per mode.
- **Test:** E2E test toggling modes with screenshot comparison.
- **Effort:** 1-2 days
- **Dependencies:** Task 1.1
- **Source refs:** E1 basic 3D↔2D toggle (MVP), A1 PRD

---

## Phase 2: Measurements & Tools (Weeks 3-4 — 8-12 dev-days)

> **Goal:** Implement distance measurement, annotations overlay in 3D, and export/import.

### Task 2.1 — Distance Measurement Tool
- **File:** New `src/tools/MeasurementTool.ts`
- **Work:**
  1. Use xeokit's `DistanceMeasurementsPlugin` or implement custom:
     - User clicks two points → measurement line with label showing distance
     - Support snap-to-vertex (object corners/edges)
     - Display in meters or feet (user preference)
     - Tolerance: ±1mm or ±0.1%, whichever is greater
  2. Measurements persist in session (in-memory, lost on reload)
  3. Can be exported via JSON
  4. Wire to `btn-measure` in UIController
- **AC:** Two-point measurement works. Value accurate to ±1mm. Unit toggle works.
- **Test:** Unit test for distance calculation. Integration test for snap accuracy.
- **Effort:** 3-5 days
- **Dependencies:** Task 1.1, Task 1.3 (selection for snap)
- **Source refs:** E1 Measurement Tool

### Task 2.2 — Cumulative Path Distance
- **File:** Extend `src/tools/MeasurementTool.ts`
- **Work:**
  1. Allow user to click multiple points sequentially
  2. Display cumulative distance along the path
  3. Show per-segment distances as labels
  4. Total displayed in measurement panel
  5. Clear path / undo last point
- **AC:** Multi-point path with cumulative distance. Undo works. Export to JSON.
- **Test:** Unit test for polyline length. Integration test with sample path.
- **Effort:** 2-3 days
- **Dependencies:** Task 2.1
- **Source refs:** E2 Chain/Stationing (MVP portion)

### Task 2.3 — 3D Annotation Overlays
- **File:** `src/annotations/AnnotationService.ts`, new `src/annotations/AnnotationOverlay.ts`
- **Work:**
  1. Render annotation markers in 3D scene at anchor positions (object or world coords)
  2. Click marker → show annotation tooltip/panel
  3. "Add Annotation" mode: click object/point → annotation form (comment, severity, status)
  4. Real-time sync between AnnotationService data and 3D overlays
  5. Wire to `btn-annotate` in UIController
- **AC:** Annotations appear as markers in 3D. Click to read. Create/edit/delete from UI.
- **Test:** E2E test for create → verify marker → delete flow.
- **Effort:** 3-4 days
- **Dependencies:** Task 1.3 (need selection for anchoring)
- **Source refs:** E2 Annotations/Markups

### Task 2.4 — JSON Import UI
- **File:** `src/ui/UIController.ts`
- **Work:**
  1. Add file picker button (or drag-and-drop zone) for importing annotation JSON
  2. Parse JSON, validate against schema v1.0
  3. Load annotations into AnnotationService
  4. Update 3D overlays
  5. Handle errors (invalid JSON, schema mismatch)
- **AC:** Import a previously exported JSON file → annotations appear in viewer.
- **Test:** Round-trip test: export → import → verify identical data.
- **Effort:** 1 day
- **Dependencies:** Task 2.3
- **Source refs:** E2 Issue Export/Import

---

## Phase 3: Civil-Specific Features & Accessibility (Weeks 4-5 — 8-12 dev-days)

> **Goal:** Layer filtering, high-contrast toggle, keyboard navigation compliance.

### Task 3.1 — Layer/Discipline Filtering
- **File:** New `src/ui/FilterPanel.ts`
- **Work:**
  1. Parse model metadata to extract discipline/layer information (IFC ObjectType, Pset_Common.Category)
  2. Build filter panel UI with checkboxes per discipline (structural, mechanical, electrical, plumbing, utilities)
  3. Toggling filter → hide/show objects of that discipline via `viewer.scene.setObjectsVisible()`
  4. X-ray mode: unselected disciplines shown as transparent instead of hidden
  5. "Show all" / "Hide all" quick buttons
- **AC:** Filter by discipline. Selected layers visible, others hidden or X-rayed. Quick toggles work.
- **Test:** Integration test with multi-discipline model.
- **Effort:** 3-5 days
- **Dependencies:** Task 1.2 (need model metadata), Task 1.1 (X-ray)
- **Source refs:** E2 Utility & Layer Filtering, A1 MVP civil-specific filtering

### Task 3.2 — High-Contrast Mode Toggle
- **File:** `src/styles/main.css`, `src/ui/UIController.ts`
- **Work:**
  1. Add toggle button in toolbar (or settings panel)
  2. Toggle `.high-contrast` class on `<body>`
  3. Verify CSS custom properties provide WCAG 2.1 AA ratios (4.5:1 normal, 3:1 large)
  4. Persist preference in localStorage
- **AC:** Toggle switches theme. Contrast ratios pass Lighthouse audit.
- **Test:** Automated Lighthouse/axe audit. Visual regression test.
- **Effort:** 1 day
- **Dependencies:** None
- **Source refs:** E2 High-contrast mode

### Task 3.3 — Keyboard Navigation (WCAG 2.1 AA)
- **File:** `src/ui/UIController.ts`, `src/index.html`
- **Work:**
  1. All UI elements focusable via Tab
  2. Visible focus indicators (outline or highlight)
  3. ARIA labels on all buttons, panels, inputs
  4. Esc key to close panels / cancel operations
  5. Arrow keys for tree navigation
  6. Keyboard shortcuts for common operations (M = measure, A = annotate, etc.)
  7. Screen reader testing with VoiceOver (macOS)
- **AC:** Complete keyboard-only navigation possible. axe audit passes with 0 violations.
- **Test:** Automated axe audit in CI. Manual VoiceOver walkthrough.
- **Effort:** 2-3 days
- **Dependencies:** Task 1.4 (tree), Task 2.3 (annotations panel)
- **Source refs:** E2 Keyboard Navigation

### Task 3.4 — Performance Benchmarks
- **File:** New `tests/performance/benchmark.ts`
- **Work:**
  1. Create automated benchmark script using Playwright + Chrome DevTools Protocol
  2. Measure: model load time, FPS during orbit, memory footprint
  3. Test with each benchmark model (Duplex 2 MB, Schependomlaan 20 MB, bridge 80 MB)
  4. Define CI budget thresholds (load <5s, FPS >30, memory <500 MB for 100 MB model)
  5. Add to CI pipeline as optional job
- **AC:** Benchmark results published to CI artifacts. Thresholds enforced.
- **Test:** The benchmark IS the test.
- **Effort:** 2-3 days
- **Dependencies:** Task 1.2 (need working viewer + models)
- **Source refs:** H1 Performance Testing, A1 Success Metrics

---

## Phase 4: Testing, Polish & MVP Release (Week 5-6 — 8-10 dev-days)

> **Goal:** Raise test coverage to 80%, fix bugs, polish UI, cut MVP release.

### Task 4.1 — Unit Tests for All Modules
- **Files:** `tests/unit/ViewerCore.test.ts`, `tests/unit/ModelLoader.test.ts`, `tests/unit/UIController.test.ts`, `tests/unit/MeasurementTool.test.ts`
- **Work:** Write comprehensive unit tests for all modules. Target: ≥80% statement coverage.
- **AC:** `npm run test:coverage` reports ≥80% statements, ≥70% branches.
- **Effort:** 3-4 days
- **Dependencies:** Phases 1-3 (need implemented code)

### Task 4.2 — E2E Tests with Playwright
- **File:** `tests/e2e/viewer.spec.ts` + new spec files
- **Work:**
  1. Test full user journey: open viewer → load model → orbit → select → measure → annotate → export
  2. Test filter panel, section planes, camera toggle
  3. Cross-browser: Chrome, Firefox, Safari (Webkit)
  4. Screenshot comparison for visual regression
- **AC:** All E2E tests pass on CI. No visual regressions.
- **Effort:** 2-3 days
- **Dependencies:** Phases 1-3

### Task 4.3 — Accessibility Audit
- **Work:**
  1. Run axe audit on all pages/states
  2. Run Lighthouse accessibility audit
  3. Manual VoiceOver walkthrough
  4. Fix all critical/serious violations
- **AC:** Lighthouse accessibility score ≥90. axe violations = 0 critical.
- **Effort:** 1-2 days
- **Dependencies:** Task 3.3

### Task 4.4 — Documentation Update
- **Files:** `README.md`, `docs/` various
- **Work:**
  1. Update README with actual screenshots, accurate badge URLs, verified quick start
  2. Write Getting Started guide with step-by-step (clone → convert → run → view)
  3. Write Architecture overview with Mermaid diagram
  4. Update feature-traceability-matrix.md to reflect current state
  5. Update final-rolling-issues-ledger.md
- **AC:** A new developer can set up and run the project in <15 minutes using the docs.
- **Effort:** 1-2 days
- **Dependencies:** Phases 1-3

### Task 4.5 — MVP Release (v0.1.0)
- **Work:**
  1. Create CHANGELOG.md with all changes
  2. Tag `v0.1.0` in git
  3. Create GitHub Release with release notes
  4. Verify demo site (`itsnothuy.github.io/civil`) works with sample models
  5. Post announcement to OSArch forum and relevant communities
- **AC:** Release tagged. Demo site accessible. CHANGELOG complete.
- **Effort:** 0.5 days
- **Dependencies:** All Phase 4 tasks

---

## Phase 5: V1 Features (Weeks 7-10 — 20-30 dev-days)

> **Goal:** Civil-specific features, BCF interoperability, collaboration, i18n.
> **Source:** Sections A (V1), E1 (V1), E2 (V1), K1 (Weeks 7-10)

### Task 5.1 — Floor/Storey-Aware 2D Plan Navigation
- **Work:** Plan view shows storey outlines. Click objects in plan → focus in 3D. Navigate floors via selector.
- **Effort:** 4-6 days
- **Dependencies:** Task 1.6 (basic 2D toggle)
- **Source refs:** E1 2D/Plan Navigation (V1)

### Task 5.2 — Chain/Stationing Measurement (Alignment-Aware)
- **Work:** Alignment-aware stationing with station numbers. Auto-detect IfcAlignment when available; manual polyline selection as fallback. Export as CSV/JSON.
- **Effort:** 4-5 days
- **Dependencies:** Task 2.2 (cumulative path)
- **Source refs:** E2 Chain/Stationing Measurement (V1)

### Task 5.3 — BCF 2.1 Export/Import
- **Work:** Full BCF 2.1 zip serialization. Import BCF from third-party tools (BIMcollab, Solibri). Round-trip validation. Camera viewpoints, markups, selected objects.
- **Effort:** 4-5 days
- **Dependencies:** Task 2.3 (annotations)
- **Source refs:** E2 Issue Export/Import (V1), A1 V1

### Task 5.4 — Utilities & Underground Context
- **Work:** Display metadata (pipe diameters, material) from IFC property sets. "What's below/behind" toggles to show hidden infrastructure (semi-transparent rendering).
- **Effort:** 2-3 days
- **Dependencies:** Task 3.1 (layer filtering)
- **Source refs:** A1 V1

### Task 5.5 — Markup Collaboration (Remote Sync)
- **Work:** Optional Node.js backend for annotation storage. GitHub OAuth login. Save/load annotations remotely. Share links to specific viewpoints.
- **Effort:** 4-6 days
- **Dependencies:** Task 2.3, requires backend design (C2 expansion)
- **Source refs:** E2 Markup Collaboration (V1)

### Task 5.6 — Localization (i18n)
- **Work:** Externalize all UI strings. Support EN, VI, FR. Language switch persists in localStorage. Translation files as JSON.
- **Effort:** 2-3 days
- **Dependencies:** None (UI-only)
- **Source refs:** E2 Localization (V1)

### Task 5.7 — Performance Hardening
- **Work:** Profile with large civil models. Implement caching, LOD, lazy loading. Optimize draw calls. WebGL resource management.
- **Effort:** 3-5 days
- **Dependencies:** Phase 1 complete
- **Source refs:** K1 Weeks 7-10, H1 Performance Testing

### Task 5.8 — V1 Release (v1.0.0)
- **Work:** Tag v1.0.0. Full E2E test suite. Updated docs. Demo with civil models. Community outreach.
- **Effort:** 1 day
- **Dependencies:** All V1 tasks

---

## Phase 6: V2 Features (Weeks 11-14+ — 25-40 dev-days)

> **Goal:** Vision Pro, real-time collaboration, plugin system, offline support.
> **Source:** Sections A (V2), E2 (V2), F1-F2, K1 (Weeks 11-14)

### Task 6.1 — Vision Pro Headset-Friendly UI (F1 Track 1)
- **Work:** Large buttons (>10mm targets), simplified HUD, gaze-based focus, pinch selection, radial menus. Test on Vision Pro Simulator.
- **Effort:** 4-5 days
- **Source refs:** F1-F2 Track 1

### Task 6.2 — WebXR Immersive Prototype (F1 Track 2)
- **Work:** Enable WebXR in Safari. Create XR session with glTF model. Map transient-pointer input to selection. Evaluate comfort. May require Three.js bridge.
- **Effort:** 5-8 days (high uncertainty)
- **Source refs:** F1-F2 Track 2

### Task 6.3 — Real-Time Collaboration
- **Work:** WebRTC/WebSocket backend. Multi-user annotation sessions. Role-based permissions. Last-write-wins conflict resolution.
- **Effort:** 6-10 days
- **Source refs:** E2 Real-time Collaboration (V2)

### Task 6.4 — Plugin System
- **Work:** Define plugin API. Hook system for extending viewer. Manifest format. Sandboxing. Sample plugin (IoT sensor overlay).
- **Effort:** 5-8 days
- **Source refs:** E2 Plugin System (V2)

### Task 6.5 — Mobile Offline Support
- **Work:** Service Worker for offline caching. IndexedDB for annotations/models. Background sync. Storage budget management (50 MB-1 GB).
- **Effort:** 4-6 days
- **Source refs:** E2 Mobile Offline Support (V2)

### Task 6.6 — Server-Assisted Pipeline
- **Work:** IFC upload API. Conversion job queue. Docker container running ifcConvert. Object storage. CDN. File size limits. Progress feedback.
- **Effort:** 5-8 days
- **Source refs:** D1 Pipeline 2, C2 API Boundaries

---

## Phase 7: Production Infrastructure (Ongoing — 10-15 dev-days)

> **Goal:** Security, monitoring, release engineering.
> **Source:** Sections G, H, I, J

### Task 7.1 — Security Hardening (G1)
- Content Security Policy (CSP) headers
- HTTPS enforcement
- Metadata sanitization (prevent XSS via IFC properties)
- Rate limiting for server endpoints
- IFC upload validation (file size, schema)
- Dependency audit automation (already have Dependabot)
- **Effort:** 3-4 days

### Task 7.2 — Error Handling & Monitoring (I-11)
- Client-side error boundaries
- Structured logging (console in MVP, Sentry for production)
- Server-side logging (when V1 backend exists)
- Health checks
- **Effort:** 2-3 days

### Task 7.3 — Release Engineering (I1)
- Semantic versioning enforced
- CHANGELOG.md automation (standard-version or similar)
- GitHub Release workflow with artifacts
- Docker images for server-assisted mode
- Preview deployments for PRs
- **Effort:** 2-3 days

### Task 7.4 — Community & Governance (J1)
- Architecture doc with visual diagrams
- Feature guides with screenshots
- GitHub Project board for task tracking
- Issue/PR template refinement
- Governance doc (maintainers, decision process)
- Community engagement (OSArch, Hacker News, social media)
- **Effort:** 3-5 days

---

## Summary: Full Effort Estimate

| Phase | Scope | Dev-Days (1 dev) | With 2 Devs | Target |
|-------|-------|-----------------|-------------|--------|
| 0 | Foundation fixes | 3-5 | 2-3 days | Week 1 |
| 1 | xeokit integration | 12-18 | 1.5-2.5 weeks | Weeks 1-3 |
| 2 | Measurements & tools | 8-12 | 1-1.5 weeks | Weeks 3-4 |
| 3 | Civil features & a11y | 8-12 | 1-1.5 weeks | Weeks 4-5 |
| 4 | Testing & MVP release | 8-10 | 1 week | Weeks 5-6 |
| **MVP Total** | | **39-57** | **5-8 weeks** | **Week 6-8** |
| 5 | V1 features | 20-30 | 2.5-4 weeks | Weeks 7-10 |
| 6 | V2 features | 25-40 | 3-5 weeks | Weeks 11-14+ |
| 7 | Production infra | 10-15 | 1.5-2 weeks | Ongoing |
| **100% Total** | | **94-142** | **12-19 weeks** | |

---

## Critical Path

The critical path to MVP is:

```
Task 0.2 (get models) ──┐
                         ├── Task 1.1 (xeokit init) ── Task 1.2 (model loading)
                         │        │
                         │        ├── Task 1.3 (selection) ── Task 1.4 (search/tree)
                         │        │        │
                         │        │        ├── Task 2.1 (measurement) ── Task 2.2 (cumulative)
                         │        │        └── Task 2.3 (annotation overlay) ── Task 2.4 (import)
                         │        │
                         │        ├── Task 1.5 (section planes)
                         │        └── Task 1.6 (camera toggle)
                         │
                         └── Task 3.1 (layer filtering)
```

**The single bottleneck is Task 1.1 (xeokit initialization).** Everything flows from there.

---

## Recommended Execution Order for Next Claude Session

If starting implementation, execute in this order:

1. **Task 0.1** — Fix README (5 min)
2. **Task 0.2** — Get IFC models (requires manual download)
3. **Task 1.1** — Initialize xeokit Viewer ← **START HERE FOR CODE**
4. **Task 1.2** — Load GLB models into viewer
5. **Task 1.6** — Camera 3D↔2D toggle (quick win after 1.1)
6. **Task 1.3** — Object selection & properties
7. **Task 1.5** — Section planes (quick win with xeokit plugin)
8. **Task 1.4** — Search & tree view
9. **Task 2.1** — Distance measurement
10. **Task 2.2** → Task 2.3 → Task 2.4 → Task 3.1 → Task 3.2 → Task 3.3

---

## Current `docs/` Structure (After Cleanup)

```
docs/
├── A1-product-definition-PRD.md            ← PRD v2.0 (authoritative)
├── C1-system-architecture-diagram-modules.md ← Architecture (revised)
├── C2-system-architecture-api-boundaries.md  ← API boundaries (thin, needs V1 expansion)
├── DR-001-repo-rendering-engine-selection.md ← Decision Record (confirmed)
├── E1 — Feature Backlog: Basic Viewer Core.md ← Viewer features + effort estimates
├── E2 — Feature Backlog — Civic + Accessibility + Collab.md ← Civil + a11y + collab + effort estimates
├── F1-F2-xr-ar-glasses-track.md             ← Vision Pro strategy
├── K0-key-decisions.md                       ← Key decisions + tasks (revised)
├── feature-traceability-matrix.md            ← Feature → code mapping
├── final-rolling-issues-ledger.md            ← Authoritative issue tracker
├── reports/
│   ├── progress-report-2026-03-01.md         ← This session's progress report
│   └── completion-plan-2026-03-01.md         ← THIS DOCUMENT
└── _archive/                                 ← Superseded docs (6 files)
```

---

*This plan is designed to be executed task-by-task in Claude Opus 4.6 sessions. Each task is self-contained with clear inputs, outputs, and acceptance criteria. Start with Phase 0 + Phase 1 to unblock everything else.*
