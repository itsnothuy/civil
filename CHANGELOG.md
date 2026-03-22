# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — V1 Release

### Added

#### Storey Navigator (Task 5.1)
- Plan-level navigation from IfcBuildingStorey metadata
- Click-to-isolate storeys with camera flyTo animation
- Storey list panel with elevation labels

#### Chain/Stationing Tool (Task 5.2)
- Auto-detect IfcAlignment entities in loaded models
- Station lookup by cumulative distance along alignment
- Chainage label rendering with configurable interval
- Station coordinate format display

#### BCF 2.1 Export/Import (Task 5.3)
- Full BCF 2.1 zip generation (bcf.version, markup.bcf, viewpoints, snapshots)
- BCF import supporting File, Blob, Uint8Array, and ArrayBuffer inputs
- Viewpoint round-trip with camera restoration and object selection
- Severity ↔ priority mapping for interoperability
- One-click BCF download from toolbar

#### Utilities Panel (Task 5.4)
- Pipe/duct metadata extraction from Pset_* property sets
- Underground context detection by IFC type + AABB below grade
- Semi-transparent X-ray rendering toggle for underground elements
- Utility detail view with diameter, material, length, elevation

#### Collaboration Client (Task 5.5)
- GitHub OAuth authentication flow
- Remote annotation save/load with offline fallback to localStorage
- Shareable viewpoints via URL hash encoding (works without server)
- Event system for connection state changes
- Optional Express backend with CORS, rate limiting, input validation

#### Internationalization (Task 5.6)
- I18nService with locale detection (localStorage → browser → default)
- Translation interpolation with `{{param}}` syntax
- English, Vietnamese, and French translations (~80 keys each)
- Locale persistence and `document.documentElement.lang` sync

#### Performance Hardening (Task 5.7)
- PerformanceOptimizer: LOD culling by camera distance to objects
- IndexedDB model caching (up to 500 MB)
- FPS measurement and performance metrics capture
- Profiling report generation with before/after comparison
- Lazy loading toggle for off-screen elements

### Infrastructure
- 389 unit tests across 17 test suites
- JSZip dependency for BCF zip serialization
- `resolveJsonModule` and `esModuleInterop` for JSON/CJS interop
- Optional `server/` directory with Express collaboration backend

## [0.1.0] — MVP Release

### Added

#### Viewer Core (Phase 1)
- 3D model viewing with xeokit-sdk (orbit, pan, zoom, NavCube)
- GLB/glTF model loading via GLTFLoaderPlugin with timeout protection
- Object selection with highlight and multi-listener pattern
- Properties panel displaying IFC metadata (XSS-safe rendering)
- Hierarchical tree view (TreeViewPlugin wrapper) with context menu (isolate/hide/show all)
- 3D ↔ 2D camera toggle with smooth animation
- Section planes (up to 6) with interactive gizmos and chip UI
- Search filtering with real-time object highlighting

#### Measurements & Tools (Phase 2)
- Two-point distance measurement with snapping and metric/imperial toggle
- Cumulative path distance measurement with undo (Ctrl+Z)
- 3D annotation markers with severity levels (create/delete via inline form)
- Annotation service with CRUD, localStorage persistence
- JSON export/import for annotations with full round-trip fidelity

#### Civil Features & Accessibility (Phase 3)
- Layer/discipline filtering panel with checkboxes and Show/Hide All
- X-ray toggle for transparent rendering of hidden objects
- High-contrast mode (WCAG 2.1 AA compliant) with localStorage persistence
- Full keyboard navigation: M (measure), A (annotate), H (contrast), F (search), X (x-ray), ? (help), Tab (cycle), Escape (cancel)
- Skip-to-content link for screen reader users
- Keyboard shortcuts help overlay
- Vision Pro headset-friendly UI with enlarged touch targets
- Performance benchmarks (Playwright + Chrome DevTools Protocol)

#### Testing & Quality (Phase 4)
- 210 unit tests across 10 test suites (93%+ statement coverage)
- 50 E2E tests across 14 feature areas (Playwright + Chromium)
- 7 accessibility tests with axe-core (0 critical/serious WCAG 2.1 AA violations)
- SwiftShader support for WebGL in headless Chromium E2E tests
- Performance benchmarks for load time, FPS, and heap monitoring

### Fixed
- Annotation form CSS `display: flex` overriding `hidden` attribute
- Color contrast violations (accent colors updated for WCAG AA compliance)
- Export anchor element appended to DOM for reliable download triggering
- Model loading timeout to prevent hanging on missing model files
- UI initialization before model loading for graceful degradation

### Infrastructure
- TypeScript 5.9.3 (strict mode, ES2022 target)
- Vite 6.4.1 dev server and production build
- Jest 29 + ts-jest + jsdom for unit tests
- Playwright 1.42 for E2E + accessibility tests
- ESLint 8.57 + Prettier 3.2.5 for code quality
- IFC → GLB conversion script (`scripts/convert-ifc.mjs`)
- GitHub Actions CI (lint → unit → E2E → build → security)
- CLA workflow for dual licensing (AGPL-3.0 + commercial)

[1.0.0]: https://github.com/itsnothuy/civil/releases/tag/v1.0.0
[0.1.0]: https://github.com/itsnothuy/civil/releases/tag/v0.1.0
