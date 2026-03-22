# Civil BIM Viewer

> Open-source, browser-based BIM/IFC viewer for civil and civic engineering.
> Desktop · Mobile · Apple Vision Pro

[![CI](https://github.com/itsnothuy/civil/actions/workflows/ci.yml/badge.svg)](https://github.com/itsnothuy/civil/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Unit Tests](https://img.shields.io/badge/unit%20tests-210%20passing-brightgreen)](tests/unit/)
[![Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen)](coverage/lcov-report/index.html)
[![E2E Tests](https://img.shields.io/badge/e2e%20tests-50%20passing-brightgreen)](tests/e2e/)
[![Accessibility](https://img.shields.io/badge/axe--core-0%20violations-brightgreen)](tests/e2e/accessibility.spec.ts)

## Features (MVP — v0.1.0)

- 🏗️ **3D/2D Model Viewing** — Load glTF/GLB models via xeokit-sdk with NavCube
- 📐 **Measurement Tools** — Two-point distance + cumulative path measurement with snapping
- 📝 **Annotations** — Create, delete, and manage 3D annotations with severity levels
- 📋 **JSON Export/Import** — Annotation data round-trips with full fidelity
- 🔍 **Search & Filter** — Object search, discipline/layer filtering, Show/Hide All
- 🌳 **Model Tree** — Hierarchical tree view with context menu (isolate/hide/show all)
- ✂️ **Section Planes** — Up to 6 section planes with interactive gizmos and chip UI
- 🔬 **X-Ray Mode** — Toggle transparent rendering for hidden objects
- ♿ **Full Accessibility** — Keyboard navigation (10+ shortcuts), ARIA labels, skip-link, axe-core 0 violations
- 🎨 **High-Contrast Mode** — WCAG AA compliant, persisted via localStorage
- 🖥️ **Properties Panel** — IFC metadata display with XSS-safe rendering
- 🥽 **Vision Pro Ready** — Headset-friendly UI with enlarged touch targets

## Quick Start

### 1. Install dependencies

```bash
npm install
npx playwright install --with-deps chromium
```

### 2. Convert a sample IFC model

You need `ifcconvert` from IfcOpenShell on your PATH:

```bash
# macOS
brew install ifcopenshell

# Then convert your IFC file:
node scripts/convert-ifc.mjs path/to/model.ifc my-project
# Output: data/my-project/model.glb + metadata.json
```

### 3. Run the development server

```bash
npm run dev
# → http://localhost:3000?projectId=my-project
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm test` | Jest unit tests |
| `npm run test:coverage` | Unit tests + coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run lint` | ESLint |
| `npm run format` | Prettier auto-fix |
| `npm run typecheck` | TypeScript type-check |
| `npm run convert` | IFC → GLB conversion helper |

## Project Structure

```
civil-bim-viewer/
├── src/
│   ├── index.html              # App shell
│   ├── main.ts                 # Entry point
│   ├── viewer/ViewerCore.ts    # xeokit wrapper
│   ├── loader/ModelLoader.ts   # glTF/GLB model loading
│   ├── annotations/            # Annotation service + schema
│   ├── ui/UIController.ts      # Toolbar + keyboard nav
│   └── styles/main.css         # Responsive + headset styles
├── tests/
│   ├── unit/                   # Jest tests
│   └── e2e/                    # Playwright tests
├── scripts/
│   └── convert-ifc.mjs         # IFC → GLB conversion
├── data/
│   └── sample-models/          # Place IFC source files here
├── docs/                       # Architecture & planning docs
└── .github/
    └── workflows/              # CI + GitHub Pages deploy
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    index.html (App Shell)                 │
├─────────────┬──────────────┬────────────┬───────────────┤
│  UIController│ FilterPanel  │  TreeView  │PropertiesPanel│
│  (toolbar,   │ (discipline  │ (hierarchy,│ (IFC metadata │
│   shortcuts, │  toggle,     │  context   │  display)     │
│   search)    │  x-ray)      │  menu)     │               │
├─────────────┴──────────────┴────────────┴───────────────┤
│  MeasurementTool  │ AnnotationOverlay │AnnotationService│
│  (2-pt, path,     │ (3D markers,      │ (CRUD, storage, │
│   snap, export)   │  inline form)     │  JSON I/O)      │
├───────────────────┴───────────────────┴─────────────────┤
│                  ViewerCore (xeokit Viewer)               │
│         selection · section planes · camera modes         │
├─────────────────────────────────────────────────────────┤
│               ModelLoader (GLTFLoaderPlugin)              │
├─────────────────────────────────────────────────────────┤
│                   xeokit-sdk (WebGL)                      │
└─────────────────────────────────────────────────────────┘
```

See [`docs/review/C1-system-architecture-diagram-modules.md`](docs/review/C1-system-architecture-diagram-modules.md) and [`docs/review/C2-system-architecture-api-boundaries.md`](docs/review/C2-system-architecture-api-boundaries.md) for detailed architecture documentation.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `M` | Toggle measurement tool |
| `A` | Toggle annotation mode |
| `H` | Toggle high-contrast mode |
| `F` | Focus search input |
| `X` | Toggle X-ray mode |
| `?` | Show keyboard help overlay |
| `Tab` | Cycle selection through objects |
| `Escape` | Cancel active tool / deselect |
| `Ctrl+Z` | Undo last path measurement point |

## Testing

| Suite | Status |
|-------|--------|
| **Unit Tests** (Jest) | 210 tests, 10 suites, 93%+ coverage |
| **E2E Tests** (Playwright) | 50 tests across 14 feature areas |
| **Accessibility** (axe-core) | 0 critical/serious WCAG 2.1 AA violations |
| **Performance** (CDP benchmarks) | Load time, FPS, heap monitoring |

```bash
npm test              # Unit tests
npm run test:coverage # Unit tests + coverage
npm run test:e2e      # E2E tests (Playwright)
npm run test:perf     # Performance benchmarks
```

## Roadmap

| Phase | Timeline | Focus |
|-------|----------|-------|
| **MVP** | Weeks 0-6 | Viewer core, measurements, annotations, BCF export |
| **V1** | Weeks 7-10 | Chain/stationing, utilities filtering, remote sync, i18n |
| **V2** | Weeks 11-14 | WebXR (Vision Pro), real-time collab, plugin system |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[AGPL-3.0-or-later](LICENSE) — modifications and hosted deployments must be open-sourced under the same license. A commercial license is available from the xeokit maintainers for proprietary use.
