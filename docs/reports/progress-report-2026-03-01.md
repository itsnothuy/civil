# Civil BIM Viewer — Progress Report

> **Date:** 2026-03-01  
> **Repository:** https://github.com/itsnothuy/civil  
> **Branch:** main (HEAD: `bb3777f`)  
> **Stack:** TypeScript 5.4 · Vite 6.4.1 · xeokit-sdk ^2.6.0 (→ 2.6.106) · Jest 29 · Playwright 1.42

---

## 1. Executive Summary

The Civil BIM Viewer project is a browser-based, open-source BIM/IFC viewer for civil and civic engineering, targeting desktop, mobile, and Apple Vision Pro. The project is currently at the **end of the planning and scaffolding phase**. All planning documents have been reviewed, validated, and revised. A full project scaffold with CI/CD is in place. However, **no actual xeokit integration or real viewer functionality has been implemented yet** — the viewer modules are stubs.

**Overall completion: ~15-20% of MVP.**

| Area | Status |
|------|--------|
| Planning & Documentation | ~85% complete |
| Project Scaffold & Tooling | ~95% complete |
| CI/CD Pipeline | ~90% complete |
| Actual Feature Code (MVP) | ~10% complete |
| Testing | ~5% complete |
| Deployment (Demo Site) | 0% complete |

---

## 2. What Has Been Completed

### 2.1 Planning & Documentation

The original planning document (`Web Apps in Civil Engineering.txt`) was chunked into 18 sections (K0 through Z1) and reviewed in multiple passes. The following authoritative docs now exist in `docs/`:

| Document | Purpose | Status |
|----------|---------|--------|
| [K0-key-decisions.md](../K0-key-decisions.md) | 5 key decisions + Next 10 Tasks | REVISED — fork→SDK dependency, ifcConvert for MVP, WebGL2 claim corrected |
| [A1-product-definition-PRD.md](../A1-product-definition-PRD.md) | Full PRD v2.0: personas, use cases, success metrics, dependency map, risks, data privacy | REVISED — quantified metrics, named benchmarks, P0/P1 priorities within MVP |
| [C1-system-architecture-diagram-modules.md](../C1-system-architecture-diagram-modules.md) | System architecture: 6 modules with sub-components | REVISED — fixed numbering (was 1-17), MongoDB→PostgreSQL, ifcConvert primary |
| [C2-system-architecture-api-boundaries.md](../C2-system-architecture-api-boundaries.md) | API boundaries: static vs server-assisted | Original (thin — needs expansion before V1) |
| [DR-001-repo-rendering-engine-selection.md](../DR-001-repo-rendering-engine-selection.md) | Decision Record: xeokit-sdk as dependency, not fork. Supersedes A2. | CONFIRMED — includes fallback triggers, license analysis |
| [E1 — Feature Backlog: Basic Viewer Core.md](<../E1 — Feature Backlog: Basic Viewer Core.md>) | 6 viewer features with AC, test approach, effort estimates | REVISED — effort estimates added (§8a): MVP 25-34 dev-days |
| [E2 — Feature Backlog — Civic + Accessibility + Collab.md](<../E2 — Feature Backlog — Civic + Accessibility + Collab.md>) | 14 civil/accessibility/collab features with AC, test approach, effort estimates | REVISED — effort estimates added (§8a): MVP 14-22 dev-days |
| [F1-F2-xr-ar-glasses-track.md](../F1-F2-xr-ar-glasses-track.md) | Vision Pro: headset-friendly UI (Track 1) + WebXR prototype (Track 2) | Original |
| [feature-traceability-matrix.md](../feature-traceability-matrix.md) | Maps PRD use cases → E1/E2 features → code locations → status | Current as of scaffold |
| [final-rolling-issues-ledger.md](../final-rolling-issues-ledger.md) | Authoritative issue tracker: 31 issues, risks, assumptions, open questions | UPDATED — 17 RESOLVED, 14 remaining |

**Archived (superseded):** 6 files moved to `docs/_archive/` — original A1 v1, A2, three interim review docs, and the one-time Claude prompt.

### 2.2 Issues Resolved (from Rolling Ledger)

| ID | Issue | Resolution |
|----|-------|------------|
| I-1 | CLA needed for dual-licensing | CLA.md + .clabot + cla.yml workflow + CONTRIBUTING.md |
| I-2 | Conversion pipeline ambiguity | ifcConvert (IfcOpenShell, LGPL-3.0) for MVP |
| I-3 | WebGL2 "~54%" figure outdated | Corrected: WebGL2 >96% per caniuse.com |
| I-5 | "Typical civil models" undefined | Named benchmarks in PRD: Duplex (~2 MB), Schependomlaan (~20 MB), bridge (~80 MB) |
| I-6 | Vision Pro frame rate vague | Specified ≥72 fps in PRD |
| I-7 | "Mid-range laptop" undefined | Specified: M1/i5-12400, 8 GB RAM, integrated GPU |
| I-8 | C1 module numbering broken | Rewritten: 6 clear sections with sub-bullets |
| I-9 | MongoDB (SSPL) license issue | Replaced with PostgreSQL |
| I-10 | 3D Tiles not supported by xeokit | Deferred to V2, flagged as aspirational |
| I-15 | Storage details missing for measurements | In-memory for session; export to BCF/JSON |
| I-16 | No effort estimates in backlogs | Added: E1 MVP 25-34d, E2 MVP 14-22d, combined 39-56d |
| I-19 | K0 says "fork" but we use SDK dependency | K0 updated to reflect actual approach |
| I-20 | CI/CD never run on GitHub | Pushed; fixed Prettier + coverage threshold issues |
| I-21 | CONTRIBUTING.md lacks CLA | CLA section added |
| I-22 | xeokit-sdk version uncertain | Verified: v2.6.106 is latest, ^2.6.0 correct |
| I-25 | No data privacy consideration | Data Privacy section added to PRD |
| I-26 | engine_web-ifc license uncertain | Verified: MPL-2.0 (not AGPL-3.0) |

### 2.3 Project Scaffold & Tooling

**Repository structure:**
```
civil/
├── .github/
│   ├── ISSUE_TEMPLATE/          # Bug report + feature request templates
│   ├── PULL_REQUEST_TEMPLATE/   # PR template
│   ├── dependabot.yml           # Dependency auto-updates
│   └── workflows/
│       ├── ci.yml               # Lint → Unit Tests → E2E → Build + Security
│       ├── cla.yml              # CLA Assistant (v2.6.1)
│       └── deploy.yml           # GitHub Pages deployment
├── src/
│   ├── annotations/AnnotationService.ts  ← IMPLEMENTED (CRUD + localStorage + JSON export)
│   ├── loader/ModelLoader.ts             ← STUB (xeokit GLTFLoaderPlugin not wired)
│   ├── viewer/ViewerCore.ts              ← STUB (xeokit Viewer not initialized)
│   ├── ui/UIController.ts                ← STUB (toolbar wired to stubs)
│   ├── styles/main.css                   ← PARTIAL (high-contrast vars, basic layout)
│   ├── main.ts                           ← Entry point (wires modules together)
│   └── index.html                        ← ARIA toolbar, canvas, search input
├── tests/
│   ├── unit/AnnotationService.test.ts    ← 8 tests, all passing
│   └── e2e/viewer.spec.ts               ← Placeholder Playwright spec
├── scripts/convert-ifc.mjs              ← IFC→GLB conversion script (uses ifcconvert CLI)
├── data/sample-models/                   ← Empty (no models converted yet)
├── docs/                                 ← 10 authoritative documents
├── CLA.md                                ← Contributor License Agreement v1.0
├── CONTRIBUTING.md                       ← Contributor guide with CLA section
├── CODE_OF_CONDUCT.md                    ← Contributor Covenant
├── SECURITY.md                           ← Security policy
├── README.md                             ← Quick start, scripts, license info
├── package.json                          ← Dependencies, scripts, metadata
├── tsconfig.json                         ← TypeScript 5.4 config
├── vite.config.ts                        ← Vite 6.4.1 build config
├── jest.config.js                        ← Jest 29 + ts-jest, coverage thresholds
├── playwright.config.ts                  ← Playwright 1.42 config
└── .eslintrc.json / .prettierrc.json     ← Lint + format config
```

### 2.4 Code Implementation Status

| Module | File | Status | Details |
|--------|------|--------|---------|
| **AnnotationService** | `src/annotations/AnnotationService.ts` | **IMPLEMENTED** | CRUD operations, localStorage persistence, JSON export. 94% test coverage (8/8 tests). Schema v1.0 with BCF-compatible viewpoint. |
| **ViewerCore** | `src/viewer/ViewerCore.ts` | **STUB** | Class exists with correct API surface (`setMode`, `setXray`, `addSectionPlane`, `destroy`). All methods log to console. xeokit `Viewer` import is commented out. |
| **ModelLoader** | `src/loader/ModelLoader.ts` | **STUB** | `loadProject()` and `unloadAll()` exist. Fetches metadata.json. xeokit `GLTFLoaderPlugin` import is commented out. |
| **UIController** | `src/ui/UIController.ts` | **STUB** | Toolbar buttons wired to ViewerCore stubs. Search input logs queries. Vision Pro headset detection exists. Measure + annotate buttons have TODO comments. |
| **Styles** | `src/styles/main.css` | **PARTIAL** | CSS custom properties for theming, `.high-contrast` class, basic responsive layout. No toggle UI for high-contrast. |
| **HTML** | `src/index.html` | **PARTIAL** | ARIA toolbar with buttons (3D, 2D, X-ray, Section, Export), search input, canvas. Missing: annotation creation UI, measurement UI, filter panel. |

### 2.5 CI/CD Status

| Workflow | File | Status |
|----------|------|--------|
| **CI** | `.github/workflows/ci.yml` | Working. 5 jobs: Lint & Format → Unit Tests → E2E → Build + Security Audit. Fixed Prettier + coverage threshold issues this session. |
| **Deploy** | `.github/workflows/deploy.yml` | Configured for GitHub Pages. Has never deployed successfully (needs working build + Pages enabled). |
| **CLA** | `.github/workflows/cla.yml` | Configured. Uses `contributor-assistant/github-action@v2.6.1`. Dependabot + Renovate allowlisted. |

- **Local test results:** format ✅, lint ✅, typecheck ✅, 8/8 tests ✅, build ✅ (4.81 kB JS, 2.38 kB CSS)
- **Test coverage:** ~30% overall (AnnotationService 94%, all others 0%)
- **CI thresholds:** Statements 25%, Branches 10%, Functions 20%, Lines 25% (targets: 80/70/70/80 for V1)

### 2.6 Git History (4 commits this session)

| Commit | Description |
|--------|-------------|
| `1e395c2` | docs: resolve P0/P1 issues — CLA, C1 fix, K0 update, effort estimates |
| `f578005` | style: fix Prettier formatting in 3 source files |
| `d55e568` | fix(ci): lower coverage thresholds to match stub-heavy codebase |
| `bb3777f` | docs: update rolling issues ledger — resolve I-1, I-8, I-16, I-20, I-21, I-22, I-26 |

---

## 3. What Has NOT Been Done

### 3.1 Critical Gaps (Must Be Addressed for MVP)

1. **xeokit Integration (THE main blocker)**
   - The `@xeokit/xeokit-sdk` package is installed (v2.6.106) but **never imported or initialized**
   - `ViewerCore.ts` has all xeokit calls commented out with `// TODO (Task 1)` markers
   - No 3D rendering happens in the application — it's a non-functional UI shell
   - This single gap blocks: orbit/pan/zoom, object selection, search/tree, section planes, measurement, X-ray, model loading

2. **No IFC Models Converted**
   - `data/sample-models/` is empty
   - `scripts/convert-ifc.mjs` exists but has never been run with real IFC files
   - Need to obtain and convert benchmark models (Duplex, Schependomlaan, etc.)

3. **Missing MVP Features (not started)**
   - Distance Measurement tool (no `MeasurementTool.ts` exists)
   - Cumulative Path Distance tool
   - Layer/Discipline Filtering (no filtering UI or logic)
   - JSON Import UI (export works, import file picker missing)

4. **Incomplete MVP Features**
   - High-contrast mode: CSS variables exist, no toggle button/UI
   - Keyboard navigation: ARIA on toolbar buttons, no comprehensive keyboard nav testing
   - Section planes: stub only
   - X-ray toggle: stub only

### 3.2 Documentation Gaps

- **G1 (Security/Privacy/Compliance):** Exists in source document but not extracted as a doc
- **H1 (Testing & Quality Plan):** Exists in source document but not extracted as a doc
- **I1 (CI/CD & Release Engineering):** Exists in source document but not extracted as a doc
- **J1 (Documentation & Community):** Exists in source document but not extracted as a doc
- **K1 (Roadmap & Timeline):** Exists in source document but not extracted as a doc
- **API documentation:** No OpenAPI spec for V1 server endpoints
- **Architecture diagrams:** Textual only — no visual diagram (Mermaid, draw.io, etc.)
- **README.md:** Badge URLs still point to `YOUR_ORG/civil-bim-viewer` instead of `itsnothuy/civil`

### 3.3 Testing Gaps

- Only 1 test file with 8 tests (AnnotationService)
- No tests for ViewerCore, ModelLoader, UIController
- E2E test is a placeholder — doesn't test real functionality
- No performance benchmarks
- No accessibility audit (axe/Lighthouse)
- No cross-browser testing matrix

### 3.4 Deployment Gaps

- GitHub Pages deployment workflow exists but has never succeeded
- No demo site with sample models
- No preview deployments for PRs

---

## 4. Remaining Issues (from Rolling Ledger)

### OPEN Issues

| ID | Priority | Description |
|----|----------|-------------|
| I-4 | P1 | Next 10 Tasks lack owners and exit criteria |
| I-11 | P1 | No error handling, logging, or monitoring strategy |
| I-12 | P1 | GitHub PR annotation workflow is developer-centric |
| I-13 | P1 | No error handling or security validation for IFC uploads (V1) |
| I-14 | P1 | No conversion time estimates or async job queue design (V1) |
| I-17 | P1 | Accessibility requirements need detailed AC for keyboard nav/ARIA |
| I-18 | P1 | Measurement tool numeric tolerance not specified |
| I-23 | P1 | ThatOpen Components as potential MIT competitor — monitor |
| I-24 | P1 | visionOS WebXR status unknown as of March 2026 |
| I-27 | P2 | Terminology inconsistency: "Cumulative Path Distance" vs "Chain/Stationing" |
| I-28 | P2 | "annotations" vs "markups" used inconsistently |
| I-29 | P2 | glTF vs GLB vs XKT used interchangeably |
| I-30 | P2 | BCF version not specified in E2 (recommended: 2.1 for MVP) |
| I-31 | P2 | Plugin System (V2) too vague |

### Effort Estimate Summary

| Scope | Dev-days | With 2 Devs |
|-------|----------|-------------|
| E1 MVP (viewer core) | 25-34 | 2-3 weeks |
| E2 MVP (civil + accessibility) | 14-22 | 1-2 weeks |
| **Combined MVP** | **39-56** | **4-6 weeks** |
| Realistic estimate (with integration risks) | 50-70 | **7-8 weeks** |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| xeokit integration harder than expected | Medium | High | **UNMITIGATED — not started** |
| IFC conversion fails on large civil models | Medium | Medium | Unmitigated — no models tested |
| 6-week timeline exceeded | High | Medium | Acknowledged — 7-8 weeks more realistic |
| AGPL deters public agency adoption | Medium | High | Mitigated — CLA + dual-license ready |
| Test coverage too low for production | High | Medium | Acknowledged — 30% actual, 80% target |

---

*This report reflects the state of the project as of 2026-03-01, commit `bb3777f`.*
