# Civil BIM Viewer

> Open-source, browser-based BIM/IFC viewer for civil and civic engineering.
> Desktop · Mobile · Apple Vision Pro

[![CI](https://github.com/YOUR_ORG/civil-bim-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/civil-bim-viewer/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## Features (MVP)

- 🏗️ Load and navigate IFC models (converted to glTF/GLB)
- 📐 Linear measurements and annotations pinned to objects
- 🔍 Object search and hierarchical tree view
- ✂️ Section planes (up to 6)
- 📋 Annotation export/import (JSON; BCF in V1)
- ♿ Keyboard navigation, ARIA labels, high-contrast mode
- 🥽 Apple Vision Pro headset-friendly UI

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

See [`docs/C1-system-architecture-diagram-modules.md`](docs/C1-system-architecture-diagram-modules.md).

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
