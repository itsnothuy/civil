# Contributing to Civil BIM Viewer

Thank you for your interest in contributing! This project is an open-source BIM/IFC viewer for civil and civic engineering, licensed under AGPL-3.0.

## Getting Started

### Prerequisites
- Node.js ≥ 20, npm ≥ 10
- Git
- `ifcconvert` (IfcOpenShell) — for model conversion: `brew install ifcopenshell` (macOS)

### Setup

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/civil-bim-viewer.git
cd civil-bim-viewer

# 2. Install dependencies
npm install

# 3. Install Playwright browsers (for E2E tests)
npx playwright install --with-deps chromium

# 4. Convert a sample IFC model (optional)
node scripts/convert-ifc.mjs path/to/your-model.ifc my-project

# 5. Start the development server
npm run dev
# → Opens http://localhost:3000?projectId=sample
```

## Development Workflow

### Branch naming
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/chain-measurement` |
| Bug fix | `fix/<short-description>` | `fix/annotation-anchor-drift` |
| Chore / docs | `chore/<description>` | `chore/update-readme` |

### Commit messages (Conventional Commits)
```
feat: add chain/stationing measurement tool
fix: correct BCF export viewpoint orientation
docs: update getting started guide
test: add unit tests for AnnotationService.update
chore: bump @xeokit/xeokit-sdk to 2.7.0
```

### Running checks locally

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # TypeScript
npm test              # Jest unit tests
npm run test:e2e      # Playwright E2E tests
npm run build         # Production build
```

All checks must pass before a PR is merged.

## Pull Request Process

1. Open an issue first for non-trivial changes to discuss the approach.
2. Create a branch from `main`.
3. Write or update tests for your change.
4. Ensure all CI checks pass (`npm test`, `npm run lint`, `npm run build`).
5. Fill in the PR template completely.
6. Request a review from a maintainer.

## Code Style

- TypeScript strict mode is enforced.
- ESLint + Prettier config is checked on CI — run `npm run format` to auto-fix.
- Prefer explicit return types on public functions.
- Add JSDoc comments to all exported classes and functions.

## Reporting Issues

Use the GitHub Issue templates:
- **Bug report** — for unexpected behaviour
- **Feature request** — for new capabilities

Please include reproduction steps and, where possible, a sample IFC file (keep it small — <5 MB).

## License

By contributing, you agree your changes will be licensed under the project's AGPL-3.0 license.
