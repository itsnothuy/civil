# Feature Traceability Matrix

> Maps each feature from PRD use cases → E1/E2 backlog → acceptance criteria → current code location.
> Generated: 2026-03-01 | **Updated: Phase 4 (Task 4.4)**

| Feature Name | PRD Use Case (A1) | E1/E2 Backlog Item | Priority | Acceptance Criteria Source | Current Code Location | Status |
|-------------|-------------------|-------------------|----------|--------------------------|----------------------|--------|
| Orbit/Pan/Zoom | MVP: Model viewing and navigation | E1: Orbit/Pan/Zoom (MVP) | P0 | E1: "rotate, pan, zoom smoothly; no jitter; respects bounding volumes" | `src/viewer/ViewerCore.ts` (302 lines) — xeokit Viewer with NavCube | ✅ IMPLEMENTED |
| Object Selection & Properties | MVP: Model viewing and navigation | E1: Object Selection & Properties (MVP) | P0 | E1: "highlights object, displays IFC properties; deselecting hides panel" | `src/viewer/ViewerCore.ts` → `onSelect()`, `src/ui/PropertiesPanel.ts` (71 lines, XSS-safe) | ✅ IMPLEMENTED |
| Search & Tree View | MVP: Model viewing and navigation | E1: Search & Tree View (MVP) | P0 | E1: "search returns matching objects; tree toggles isolate/hide" | `src/ui/UIController.ts` → `_bindSearch()` + `src/ui/TreeView.ts` (161 lines, hierarchy + context menu) | ✅ IMPLEMENTED |
| 3D↔2D Camera Toggle | MVP: Model viewing and navigation | E1: 2D/Plan Navigation split — basic toggle is MVP | P0 | "Users can toggle between 3D perspective and 2D orthographic projection" | `src/viewer/ViewerCore.ts` → `setMode()` with smooth animation | ✅ IMPLEMENTED |
| Distance Measurement | MVP: Measurements | E1: Measurement Tool (MVP) | P0 | E1: "Users place two points; measurement line appears; value shown" | `src/tools/MeasurementTool.ts` (371 lines) — two-point measurement with snapping, m/ft toggle | ✅ IMPLEMENTED |
| Cumulative Path Distance | MVP: Measurements (chain) | E2: Chain/Stationing — MVP portion = simple cumulative | P0 | "User selects multiple points; cumulative distance displayed" | `src/tools/MeasurementTool.ts` → path mode with undo (Ctrl+Z) | ✅ IMPLEMENTED |
| Text Annotations | MVP: Annotations & issue export | E2: Annotations/Markups (MVP) | P0 | E2: "create, edit, delete; anchor persists relative to object" | `src/annotations/AnnotationOverlay.ts` (242 lines) + `src/annotations/AnnotationService.ts` (199 lines) — CRUD + severity levels | ✅ IMPLEMENTED |
| JSON Export/Import | MVP: Annotations & issue export | E2: Issue Export/Import (MVP) | P0 | E2: "exported file maintains viewpoints; statuses preserved" | `src/annotations/AnnotationService.ts` → `exportJSON()` + `importJSON()`, `src/ui/UIController.ts` → file input handling | ✅ IMPLEMENTED |
| Layer/Discipline Filtering | MVP: Civil-specific filtering | E2: Utility & Layer Filtering (MVP) | P0 | E2: "viewer shows only selected layers; 'below' mode semi-transparent" | `src/ui/FilterPanel.ts` (312 lines) — discipline checkboxes, Show/Hide All, X-ray hidden toggle | ✅ IMPLEMENTED |
| X-ray Toggle | MVP: Civil-specific filtering | E1: (part of viewer core) | P0 | "All objects rendered in X-ray mode" | `src/ui/FilterPanel.ts` → X-ray toggle checkbox | ✅ IMPLEMENTED |
| Section Planes | MVP: (P1) | E1: Section Planes (MVP) | P1 | E1: "add, move, remove planes; update in real time" | `src/viewer/ViewerCore.ts` → `addSectionPlane()` up to 6, with chip UI in toolbar | ✅ IMPLEMENTED |
| High-contrast Mode | MVP: (P1) | E2: High-contrast mode (MVP) | P1 | E2: "WCAG 2.1 AA contrast ratios" | `src/styles/main.css` → CSS custom properties + `body.high-contrast`, `src/ui/UIController.ts` → toggle button + localStorage persistence | ✅ IMPLEMENTED |
| Keyboard Navigation | MVP: (P1) | E2: Keyboard Navigation (MVP) | P1 | E2: "all UI elements reachable; focus indicators; ARIA labels" | `src/ui/UIController.ts` → `_bindKeyboard()` (M/A/H/F/X/?/Tab/Esc), `src/index.html` → full ARIA toolbar, skip-link, help overlay | ✅ IMPLEMENTED |
| Floor/Storey 2D Plan Nav | V1 | E1: 2D/Plan Navigation (V1) | V1 | E1: "plan shows storey outlines; clicking objects focuses in 3D" | NOT YET IMPLEMENTED | — |
| Chain/Stationing (alignment) | V1 | E2: Chain/Stationing Measurement (V1) | V1 | E2: "station numbers and cumulative distances; exports CSV/JSON" | NOT YET IMPLEMENTED | — |
| BCF 2.1 Export/Import | V1 | E2: Issue Export/Import (V1 upgrade) | V1 | E2: "exported file opens in BCF viewer; BCF schema valid" | `AnnotationService.ts` → `// TODO (V1): importBCF(), exportBCF()` | TODO |
| Markup Collaboration | V1 | E2: Markup Collaboration (V1) | V1 | E2: "two users see updates; merge conflicts resolved" | NOT YET IMPLEMENTED | — |
| Localization | V1 | E2: Localization (V1) | V1 | E2: "strings externalized; language switch persists" | NOT YET IMPLEMENTED | — |
| Real-time Collaboration | V2 | E2: Real-time Collaboration (V2) | V2 | E2: "multi-user WebRTC/WebSocket; roles" | NOT YET IMPLEMENTED | — |
| WebXR Immersive Mode | V2 | F1-F2: Track 2 (Stretch) | V2 | F1: "XR session renders glTF; gaze+pinch input" | NOT YET IMPLEMENTED | — |
| Plugin System | V2 | E2: Plugin System (V2) | V2 | E2: "external modules extend viewer; API and hooks" | NOT YET IMPLEMENTED | — |
| Mobile Offline Support | V2 | E2: Mobile Offline Support (V2) | V2 | E2: "cache models/annotations; background sync" | NOT YET IMPLEMENTED | — |

## Summary

- **✅ IMPLEMENTED:** 13 MVP features (all P0 and P1 items complete)
- **TODO (V1):** BCF 2.1 Export/Import (upgrade from JSON to BCF)
- **V1/V2 (not yet due):** 8 features

## Test Coverage

| Test Type | Count | Status |
|-----------|-------|--------|
| Unit Tests (Jest) | 210 tests / 10 suites | ✅ 93%+ statement coverage |
| E2E Tests (Playwright) | 50 tests / 14 describe blocks | ✅ All passing |
| Accessibility (axe-core) | 7 tests / 6 states | ✅ 0 critical/serious violations |
| Performance (CDP) | Playwright benchmarks | ✅ Load time, FPS, heap |
