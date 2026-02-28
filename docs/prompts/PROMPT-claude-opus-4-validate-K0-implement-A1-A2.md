# Claude Opus 4 Prompt — Validate K0 Work + Implement A1 & A2 in Entirety

> **How to use this prompt:** Copy everything from the `---BEGIN PROMPT---` marker to the `---END PROMPT---` marker and paste it directly into Claude Opus 4 as the first message. Do not truncate or summarise any section.

---BEGIN PROMPT---

## Role and Operating Contract

You are acting simultaneously as:
1. **Senior PM** — responsible for product definition accuracy, scope integrity, and traceability from persona → use case → acceptance criteria.
2. **Solution Architect** — responsible for system-level decisions, technology selection rationale, licensing compatibility, and long-term architectural fitness.
3. **Tech Lead** — responsible for code quality, implementation fidelity, test coverage, build correctness, and honest gap analysis.

**Operating rules that I require you to follow absolutely:**
- Be completely honest at every step. If something is ambiguous, wrong, partially correct, or unknown to you, say so immediately and explicitly before continuing.
- Do not skip, simplify, summarise, or gloss over any detail without first telling me that you are doing so and why.
- If you are confused or uncertain about something — a technology decision, a code pattern, a licensing claim, a feasibility claim — stop and tell me at that moment before proceeding.
- I do not prioritise completion. I prioritise accuracy. A shorter, correct answer is worth more than a longer answer with hidden assumptions.
- Do not invent claims you cannot verify. If a claim requires external lookup or real-world verification that you cannot perform, say "I cannot verify this claim with certainty" and state your best estimate with confidence level.
- Use a rolling issues ledger throughout your response. Every identified flaw, gap, ambiguity, or risk gets a unique ID (I-n), severity (P0/P1/P2), description, and status (OPEN/RESOLVED/DEFERRED). Carry all items forward; never silently drop them.

---

## Context: What Has Already Been Done

### The Source Document
The project is an **open-source Civil Engineering BIM Viewer** described in a planning document called "Web Apps in Civil Engineering.txt". This document contains sections K0 through Z1 covering the full execution plan.

### What Was Already Extracted (docs/ folder)
The following markdown files already exist and were extracted word-for-word from the source document:
- `docs/K0-key-decisions.md` — Key Decisions (5 decisions) + Next 10 Tasks
- `docs/A1-product-definition-personas-use-cases.md` — Section A) Product Definition (PRD): Personas, Use Cases, Non-Goals, Success Metrics
- `docs/A2-repo-selection-decision.md` — Section B) Repo Selection Decision: Decision Matrix, Recommendation, License Implications
- `docs/C1-system-architecture-diagram-modules.md` — Section C) System Architecture: High-Level Diagram + Modules
- `docs/C2-system-architecture-api-boundaries.md` — Section C) API Boundaries
- `docs/E1 — Feature Backlog: Basic Viewer Core.md` — Section E) Basic Viewer Core features
- `docs/E2 — Feature Backlog — Civic + Accessibility + Collab.md` — Section E) Civil features, Accessibility, Collaboration
- `docs/F1-F2-xr-ar-glasses-track.md` — Section F) XR/AR Glasses Track (Vision Pro)
- `docs/review-C1-C2-system-architecture.md` — Prior review of C1+C2
- `docs/review-D1-model-ingestion-pipeline.md` — Prior review of D1
- `docs/review-A1-C1-C2-batch.md` — Prior batch review of A1, C1, C2

**Important naming note:** The file labelled `A2-repo-selection-decision.md` corresponds to what the source document calls "B) Repo Selection Decision". It was re-labelled A2 to complete a chunking scheme. This is a documentation inconsistency you should note in your ledger.

### What Was Already Scaffolded (K0 Next 10 Tasks)
A full project scaffold was completed. Here is the exact current state of every relevant file:

#### `package.json` (key fields only — ask for full file if needed)
```json
{
  "name": "civil-bim-viewer",
  "version": "0.1.0",
  "license": "AGPL-3.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit",
    "convert": "node scripts/convert-ifc.mjs"
  },
  "dependencies": {
    "@xeokit/xeokit-sdk": "^2.6.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.4.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.4",
    "@playwright/test": "^1.42.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5"
  }
}
```

#### `tsconfig.json` (key settings)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```
**Note on `noUnusedLocals: false`:** This was intentionally set to `false` because multiple source files have stub fields that reference types but do not yet use them (e.g., `_viewer: ViewerCore` in classes where xeokit integration is pending). This was an intentional trade-off, not an oversight. However, it reduces TypeScript's ability to catch real unused variable bugs.

#### `jest.config.js` (CommonJS — important, not ESM)
```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  }
};
```
**History note:** Originally scaffolded as `jest.config.ts` but that required `ts-node` which was not installed. Converted to CommonJS `jest.config.js`. This is a permanent decision.

#### `tsconfig.test.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

#### `src/viewer/ViewerCore.ts` — STUB, xeokit NOT yet integrated
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
    // TODO (Task 1): this.viewer = new Viewer({ canvasId: this.canvasId, transparent: true });
    console.info(`[ViewerCore] Canvas target: #${this.canvasId}`);
  }

  setMode(mode: ViewMode): void {
    // TODO (Task 1): Use xeokit CameraFlightAnimation + ortho projection
    console.info(`[ViewerCore] Mode → ${mode}`);
  }

  setXray(enabled: boolean): void {
    // TODO: viewer.scene.setObjectsXRayed(viewer.scene.objectIds, enabled);
    console.info(`[ViewerCore] X-ray → ${enabled}`);
  }

  addSectionPlane(): void {
    // TODO: new SectionPlanesPlugin(viewer).createSectionPlane(...)
    console.info("[ViewerCore] Section plane added.");
  }

  destroy(): void {
    // TODO: this.viewer.destroy();
    console.info("[ViewerCore] Destroyed.");
  }
}
```

#### `src/loader/ModelLoader.ts` — STUB, xeokit NOT yet integrated
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

    // TODO (Task 1): const gltfLoader = new GLTFLoaderPlugin(this.viewer.viewer);
    // const model = gltfLoader.load({ id: projectId, src: modelUrl, metaModelSrc: metadataUrl });
    console.info(`[ModelLoader] Loading project "${projectId}" from ${modelUrl}`, metadata);
  }

  unloadAll(): void {
    // TODO: this.viewer.viewer.scene.models.forEach(m => m.destroy());
    console.info("[ModelLoader] All models unloaded.");
  }
}
```

#### `src/annotations/AnnotationService.ts` — FULLY IMPLEMENTED (no stubs)
```typescript
export type AnnotationSeverity = "info" | "warning" | "error" | "critical";

export interface AnnotationAnchor {
  type: "object" | "world";
  objectId?: string;
  worldPos?: [number, number, number];
}

export interface Annotation {
  id: string;
  schemaVersion: "1.0";
  type: "text" | "measurement" | "markup";
  anchor: AnnotationAnchor;
  author: string;
  createdAt: string;
  updatedAt: string;
  comment: string;
  severity: AnnotationSeverity;
  status: "open" | "in-progress" | "resolved" | "closed";
  viewpoint?: {
    eye: [number, number, number];
    look: [number, number, number];
    up: [number, number, number];
    selectedObjects: string[];
  };
}

const STORAGE_KEY_PREFIX = "civil-bim-annotations";

export class AnnotationService {
  private _viewer: ViewerCore;
  private annotations: Map<string, Annotation> = new Map();

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  loadFromLocalStorage(projectId: string): void { /* loads from localStorage */ }
  add(projectId: string, annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt" | "schemaVersion">): Annotation { /* adds with UUID + ISO timestamps */ }
  update(projectId: string, id: string, patch: Partial<Annotation>): Annotation | null { /* updates + persists */ }
  delete(projectId: string, id: string): boolean { /* deletes + persists */ }
  list(): Annotation[] { /* returns all */ }
  exportJSON(): string { /* returns JSON string */ }
  // TODO (V1): importBCF()
  // TODO (V1): exportBCF()
}
```

#### `src/ui/UIController.ts` — IMPLEMENTED (partial stubs for Task 8)
```typescript
export class UIController {
  private viewer: ViewerCore;
  private _loader: ModelLoader;
  private annotations: AnnotationService;

  init(): void {
    this._bindToolbar();
    this._bindSearch();
    this._detectHeadsetMode();
  }

  // Bound buttons: btn-3d, btn-2d, btn-xray, btn-section, btn-export-bcf
  // TODO (Task 8): btn-measure → MeasurementTool
  // TODO (Task 8): btn-annotate → annotation creation flow

  private _detectHeadsetMode(): void {
    // Checks for visionOS/headset user agent; adds body.headset-mode class
    // NOTE: Detection heuristic is imperfect (see issues ledger)
  }
}
```

#### `src/main.ts`
```typescript
import { ViewerCore } from "./viewer/ViewerCore";
import { ModelLoader } from "./loader/ModelLoader";
import { AnnotationService } from "./annotations/AnnotationService";
import { UIController } from "./ui/UIController";

const viewer = new ViewerCore("viewer-canvas");
const loader = new ModelLoader(viewer);
const annotations = new AnnotationService(viewer);
const ui = new UIController(viewer, loader, annotations);

ui.init();

const params = new URLSearchParams(location.search);
const projectId = params.get("projectId");
if (projectId) {
  annotations.loadFromLocalStorage(projectId);
  loader.loadProject(projectId).catch(console.error);
}
```

#### `tests/unit/AnnotationService.test.ts` — 8/8 PASSING
All 8 tests pass: add() creates with UUID + ISO timestamps, add() persists to localStorage, update() changes status + bumps updatedAt, delete() removes annotation, loadFromLocalStorage() restores annotations after simulated reload, list() returns all annotations, exportJSON() produces parseable JSON with correct schema fields.

#### `scripts/convert-ifc.mjs`
```javascript
// CLI wrapper: node scripts/convert-ifc.mjs <input.ifc> [projectId]
// Checks for `ifcconvert` binary on PATH (IfcOpenShell)
// Output: data/<projectId>/model.glb + data/<projectId>/metadata.json
// Does NOT bundle ifcconvert — it must be installed separately by the user
```

#### `.github/workflows/ci.yml`
5 jobs: `lint` (ESLint + Prettier + typecheck) → `unit-tests` (Jest + coverage) → `e2e-tests` (Playwright chromium) + `build` → `security` (npm audit --audit-level=high).

#### Community files created
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `README.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md`, `.github/dependabot.yml`, `.github/workflows/deploy.yml`.

### Current Validated Build State
```
npm test    →  PASS  tests/unit/AnnotationService.test.ts
               8 passed, 8 total  (1.261s)

npm run build →  vite v6.4.1 building for production...
                 ✓ 8 modules transformed.
                 dist/index.html                2.11 kB │ gzip: 0.82 kB
                 dist/assets/main-BzIsdxfb.css  2.38 kB │ gzip: 0.83 kB
                 dist/assets/main-B3H9nl0L.js   4.81 kB │ gzip: 1.96 kB
                 ✓ built in 69ms
npm audit   →  0 vulnerabilities
```

### Rolling Issues Ledger (inherited from prior reviews — carry these forward)

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| I-1 | P0 | Dual-license claim: K0 says "distribute under AGPL and explore dual-license/commercial option" but does not address AGPL fork copyright obligations for contributions — any contributor's code becomes AGPL and cannot be re-licensed without their consent | OPEN |
| I-2 | P0 | Conversion pipeline tool ambiguity: K0 mentions engine_web-ifc in decision #4 as the conversion pipeline tool, but D1 recommends ifcConvert (IfcOpenShell), and C1 mentions cxConverter. Three different tools cited for the same job; no decision recorded for which is authoritative | OPEN |
| I-3 | P1 | WebGL2 "~54% browser support" figure in K0 decision #2 is likely stale (2024 data shows >97% WebGL2 support globally) | OPEN |
| I-4 | P1 | K0 Next 10 Tasks have no owners, no time estimates, no exit criteria — tasks were scaffolded but not validated against the plan's own definition of done | OPEN |
| I-5 | P1 | "Typical civil models (<100 MB)" in A1 success metrics is underspecified — no representative benchmark IFC files named, no test device defined | OPEN |
| I-6 | P1 | A1 Vision Pro "comfortable frame rate and avoid nausea" is not quantified. Desktop 30 fps target is completely inadequate for VR/AR. visionOS display refresh is 90 Hz; Apple recommends ≥90 fps for comfort | OPEN |
| I-7 | P1 | A1 "mid-range laptop" is not defined (no CPU, GPU, RAM, OS spec) — success metric is untestable | OPEN |
| I-8 | P0 | Module numbering in C1 is broken: uses 1–17 flat list instead of 6 logical modules — harms implementation clarity | OPEN |
| I-9 | P0 | MongoDB (SSPL) mentioned in C1 storage module — SSPL is not OSI-approved; conflicts with open-source-first principle | OPEN |
| I-10 | P1 | 3D Tiles mentioned in C1 as a large-model strategy but xeokit-sdk does not natively support OGC 3D Tiles — would require a custom loader or different rendering engine | OPEN |
| I-11 | P1 | No observability strategy: no structured logging, no error tracking, no health-check endpoints defined anywhere in the plan | OPEN |
| I-12 | P1 | GitHub PR annotation workflow (C2, D1) is developer-centric; non-technical users (Inspector, Stakeholder personas) cannot use it | OPEN |
| I-13 | P1 | No file size limits defined for IFC upload in server mode — denial-of-service risk | OPEN |
| I-14 | P1 | A1 priority conflict: "switch between 3D and 2D floor/plan views" is listed as MVP in A1 but as V1 in E1 backlog | OPEN |
| I-15 | P1 | A1 priority conflict: "chain measurements along roads/bridges" is listed in MVP use cases but "Chain/Stationing Measurement" is V1 in E1 backlog | OPEN |
| I-16 | P1 | noUnusedLocals: false in tsconfig.json reduces TypeScript's dead-code detection across the entire project, not just the stub files that need it | OPEN |
| I-17 | P1 | visionOS headset detection heuristic in UIController._detectHeadsetMode() is unreliable: it checks for standalone===undefined + coarse pointer, which could match non-Vision Pro devices (e.g., iOS Safari). No official JS API exists to detect Vision Pro | OPEN |
| I-18 | P1 | C2 API Boundaries section is too thin for implementation: no endpoint list, no request/response schemas, no error codes, no pagination strategy, no OpenAPI spec | OPEN |

---

## Task 1: Validate K0 Work

### What I need from you:

**1A. Validate all 10 K0 tasks against the scaffolded codebase described above.**

For each of the 10 tasks, answer:
- Was it scaffolded? (yes / partial / no)
- Is the scaffolded implementation correct relative to what the task description asks?
- What is missing, wrong, or only partially done?
- What would "done" look like (specific exit criteria)?

The 10 tasks from `docs/K0-key-decisions.md` are:
1. Fork and review the selected repository (xeokit-bim-viewer). Verify build, run the demo, and document the current feature set.
2. Develop a decision report comparing xeokit vs BIMSurfer vs build-from-scratch, using the decision matrix in section B.
3. Set up a prototype pipeline: convert a sample IFC file to glTF using CLI tools recommended in xeokit docs and host it in a local static server.
4. Draft the system architecture diagram and identify module boundaries (viewer core, UI, annotation service, conversion service).
5. Design the data schema for annotations/issues, including BCF compatibility.
6. Write the initial PRD capturing user personas, core use cases, non-goals, and success metrics (section A).
7. Create the CI/CD pipeline skeleton with linting, unit tests, and deployment to GitHub Pages.
8. Implement basic measurement and annotation tools within the viewer core.
9. Draft the Vision Pro friendly UI guidelines, including larger hit targets and simplified controls.
10. Prepare community documentation, including CONTRIBUTING, code of conduct, and roadmap drafts.

**1B. For any task you assess as incomplete, provide a concrete, specific completion plan:**
- What file(s) need to be created or modified?
- What exact code, content, or configuration is needed?
- What is the definition of done for that specific task?

**1C. Validate the 5 Key Decisions in K0 against current knowledge:**

Decision 1: xeokit-bim-viewer as primary codebase (AGPL-3.0)
Decision 2: BIMSurfer v3 as fallback (MIT, WebGL2-only)
Decision 3: AGPL licensing strategy with dual-license exploration
Decision 4: IFC → glTF/GLB conversion using engine_web-ifc
Decision 5: Vision Pro via headset-friendly web UI first, WebXR later

For each decision:
- Is the decision still sound today?
- Are there new facts (as of early 2026) that change the assessment?
- Is the decision faithfully reflected in the scaffolded code?
- Any risks introduced by this decision that are not yet tracked in the ledger?

**1D. Add any new issues discovered during Task 1 validation to the rolling ledger.**

---

## Task 2: Implement A1 (Product Definition / PRD) in Its Entirety

### Full text of A1 for reference:

```
# A) Product Definition (PRD)

## Target Users / Personas

| Persona | Goals | Pain Points |
|---------|-------|-------------|
| Civil/Civic Engineer | Inspect and coordinate 3D models of bridges, roads, utilities; measure distances; annotate issues; plan maintenance | Existing viewers are generic and lack civil-oriented features (chain measurements, utilities filtering); tools may not work offline on tablets or headsets. |
| Public Works Reviewer / Inspector | Review as-built vs design, mark defects, export issues (BCF) for contractors, use on-site (field tablets or Vision Pro) | Viewers are not optimised for field use; annotations don't sync to issue trackers; UI controls are too small for headsets. |
| Project Manager / Consultant | Navigate models on desktop and mobile; filter by discipline (structures, MEP, utilities); review markups; monitor issue status | Complex software requires steep learning; license fees; no open, extendable solution. |
| Stakeholder / Citizen | Understand proposed infrastructure projects through a simplified viewer; provide feedback | Hard to access heavy BIM viewers; need intuitive UI and ability to view on phones or headsets. |

## Core Use Cases & User Journeys

### MVP (Weeks 0-6)
* Model viewing and navigation: Users open a converted model, orbit/pan/zoom, switch between 3D and 2D floor/plan views, inspect object properties and search via tree. Journey: import IFC → convert to glTF → open in viewer → navigate.
* Measurements: Linear and angular measurements; selection of objects; ability to measure chain distances along roads/bridges. Acceptable tolerance and unit settings.
* Annotations & issue export: Users create annotations pinned to objects or coordinates; export issues to BCF or JSON; import existing issues. Initial implementation stores annotations locally.
* Civil-specific filtering: Layer/discipline filters (e.g., surfaces, utilities, structures) to isolate parts of the model; X-ray/hide functions.

### V1 (Weeks 7-10)
* Stationing/chain measurements: Provide stationing or chainage tools for linear infrastructure (e.g., alignments). When geometry doesn't support a parametric alignment, approximate chainage along polylines.
* Utilities and underground context: Display metadata (pipe diameters, material) from IFC property sets; implement "what's below/behind" toggles to show hidden infrastructure.
* Markup collaboration: Allow saving markups to remote storage (GitHub or custom service) and sharing links; support import/export of BCF viewpoints.
* Internationalisation/accessibility: Provide UI in multiple languages, high-contrast mode, keyboard navigation.

### V2 (Weeks 11-14 and beyond)
* Real-time collaboration: Multi-user annotation sessions with WebRTC or WebSocket back-end. Role-based permissions (viewer vs reviewer).
* WebXR immersive mode: Provide optional fully immersive viewing using WebXR on Vision Pro. Support natural input (gaze + pinch) based on transient-pointer input mode.
* Mobile offline sync: Cache models and markups for offline viewing on tablets; sync when online.

## Non-Goals
* Authoring or editing models (i.e., no direct geometry creation or modification).
* Replacing commercial BIM platforms; the focus is on viewing/reviewing models.
* Support for proprietary file formats (e.g., DWG) outside of the IFC-glTF conversion pipeline.
* Real-time sensor data streaming; this may be added later.

## Success Metrics
* Performance: Model load time < 5 s for typical civil models (<100 MB), average frame rate > 30 fps on mid-range laptops; memory footprint below 500 MB. For Vision Pro, maintain comfortable frame rate and avoid nausea.
* Adoption: >100 GitHub stars and at least two external contributions within three months; adoption by one civic engineering organisation by V1.
* Contribution velocity: Merged PRs per month; number of issues closed vs opened.
* User outcomes: Engineers report faster review cycles, fewer mis-measurements, and improved clarity on underground utilities.
```

### What "implement A1 in its entirety" means:

"Implement" for a PRD document does not mean writing application code — it means making the PRD **fully operational, complete, and actionable** as a planning artefact that engineers can actually build from. This includes:

**2A. PRD Gap Analysis:**
Identify every claim, metric, scope item, or user journey in A1 that is currently:
- Ambiguous (cannot be implemented without further clarification)
- Underspecified (missing detail that a developer would need)
- Contradicted (conflicts with another document: E1, E2, C1, C2, K0)
- Missing (things a production PRD must have that A1 omits)

Do not simply repeat the issues already in the ledger — add new ones and cross-reference existing ones.

**2B. Resolve or escalate every conflict:**
For each issue identified (new or inherited), either:
- **Resolve it** with a concrete decision (explain your reasoning)
- **Escalate it** with a clear question that the project owner must answer (no vague "TBD")

For the inherited conflicts from the ledger (I-5, I-6, I-7, I-14, I-15), provide your concrete recommendation for how to resolve each one, with the full reasoning behind it.

**2C. Rewrite the A1 PRD to production quality:**
Produce a complete, revised version of `docs/A1-product-definition-personas-use-cases.md` that:
- Fixes all identified gaps
- Resolves all resolvable conflicts
- Adds the missing sections a production PRD needs (see below)
- Keeps every original word that is still correct — do not rewrite for style, only for correctness and completeness
- Explicitly annotates every change you made with a brief inline note: `<!-- REVISED: reason -->`

A production PRD for this project must include (add these if missing):
1. **Document metadata:** version, date, status (Draft/Review/Approved), authors
2. **Personas table** — add a "Key Features Used" column linking each persona to specific feature IDs from E1/E2
3. **Prioritised feature list within MVP** — if time runs short, which feature gets cut first? (MoSCoW or P0/P1/P2 ranking)
4. **Testable success metrics** — every metric must have: value, measurement method, measurement frequency, and responsible party
5. **Clarified scope boundaries** — for each MVP use case, state explicitly: "In scope for MVP: X. Out of scope until V1: Y."
6. **Dependency map** — which use cases depend on others? (e.g., Annotations depends on Object Selection)
7. **Known risks** — at least one risk per phase (MVP, V1, V2) with a mitigation

**2D. Create a feature traceability matrix:**
Produce a markdown table mapping: Feature Name → PRD Use Case → E1/E2 Backlog Item → Acceptance Criteria source → Current Code Location (file/class/method or "NOT YET IMPLEMENTED"). This is the bridge between the PRD and the codebase.

---

## Task 3: Implement A2 (Repo Selection Decision) in Its Entirety

### Full text of A2 for reference:

```
## Decision Matrix

| Criterion | xeokit-bim-viewer (AGPL) | BIMSurfer v3 (MIT) | Build-from-Toolkit (e.g., engine_web-ifc + Three.js) |
|-----------|--------------------------|---------------------|-------------------------------------------------------|
| License | AGPL-3.0 (copyleft); modifications and hosted services must be open-sourced or require commercial license | MIT (permissive) | Depends on choice of libraries (MIT for Three.js, MPL for engine_web-ifc) |
| Maturity / Adoption | Mature; integrated into OpenProject BIM 10.4+; >500 stars and >400 forks | Beta; no official release; WebGL2-only; ~416 stars | Requires building viewer from scratch; high flexibility but long time to MVP |
| Features | 3D/2D views, load multiple models, X-ray/hide, section planes, tree views, BCF viewpoint support | Partial support for 3D tiles, measurements, up to 6 section planes | Only basic parsing; all viewer features must be built; can be tailored to specific needs |
| Performance | Optimised for large models; uses double-precision geometry | High performance due to custom WebGL2 pipeline | Dependent on developer implementation and chosen rendering engine |
| Conversion Pipeline | Requires converting IFC to glTF/XKT; documented in README | Typically paired with BIMServer; supports glTF via IfcOpenShell | Developer must design pipeline; can leverage engine_web-ifc |
| Extensibility | Built on xeokit SDK; provides programming API for custom functions | Codebase still evolving; may require deep familiarity with WebGL2; limited docs | Maximum flexibility; but high development cost |
| Time-to-MVP | Fastest: just fork, convert sample models and add features; ready-to-use structure | Medium: needs stabilization and missing features; risk due to beta state | Slowest: months of development to reach parity |

## Recommendation
* Primary path: xeokit-bim-viewer. It provides a solid foundation, well-documented features, and an active community. The AGPL license aligns with the goal of keeping the project open source, and a commercial license is available for organizations requiring proprietary usage.
* Fallback path: BIMSurfer v3. Should xeokit prove unsuitable (e.g., licensing conflicts or performance issues), BIMSurfer offers MIT freedom and high performance but requires addressing its beta state and WebGL2 limitation.
* Toolkit approach: Use engine_web-ifc and build a custom viewer if both repositories fail to meet requirements or if a specialized architecture is desired. The library can read/write IFC at native speeds and could be combined with Three.js or Babylon.js for rendering.

## License Implications
* AGPL-3.0: If users modify the viewer and make it available over a network (e.g., SaaS), they must provide their source code under the AGPL. This encourages contributions but deters proprietary use. Companies can purchase a commercial license from xeokit maintainers.
* MIT: Allows use, modification and distribution in proprietary projects without obligation to share changes. This may encourage broader adoption but reduces guarantee of community contributions. Using BIMSurfer (MIT) or building from scratch with permissive libraries may attract organizations wanting closed extensions.
```

### What "implement A2 in its entirety" means:

"Implement" for a decision document means making it **complete, verified, and decision-locked** — not a planning artefact but a **final decision record** that the team can point to as authoritative. This includes:

**3A. Validate every factual claim in A2 against your knowledge:**

For each row in the decision matrix and each claim in Recommendation and License Implications:
- Is the claim accurate as of early 2026?
- Has anything changed (new releases, license changes, community activity changes, WebGL2 support figures)?
- Is the claim sufficiently precise for decision-making, or is it vague/unverifiable?
- Flag anything you cannot verify with certainty, and give your confidence level

Specific claims to scrutinize:
- "xeokit >500 stars and >400 forks" — is this still accurate? (You may not be able to verify real-time GitHub stats; say so)
- "BIMSurfer v3 ~416 stars, WebGL2-only, beta" — still accurate?
- "WebGL2 ~54% browser support" — this was flagged as I-3; what is the correct figure?
- "engine_web-ifc MPL license" — is this correct? (The ThatOpen/engine_web-ifc repo; check what MPL means for this use case)
- "Commercial license available from xeokit maintainers" — note any uncertainty about whether this is still offered and at what terms
- "BIMSurfer typically paired with BIMServer" — is BIMServer still actively maintained and recommended?
- AGPL "modifications and hosted services must be open-sourced" — is this a complete and accurate description of AGPL §13?

**3B. Assess whether the decision (xeokit as primary) is still correct:**
Given the scaffolded codebase, the feature requirements in A1/E1/E2, the licensing context from I-1 and I-9, and your current knowledge of the ecosystem:
- Is xeokit-bim-viewer still the right choice?
- Are there any alternatives that emerged since the plan was written (e.g., IFC.js / web-ifc-viewer from ThatOpen, OpenBIM Components, xeokit SDK v4)?
- What would it take to switch? Provide a switching cost estimate.
- State clearly: CONFIRM DECISION or RECOMMEND REVISIT, with full reasoning.

**3C. Complete the License Implications section:**
The current License Implications section only covers AGPL and MIT at a surface level. A production decision record needs:
- What AGPL-3.0 §13 (network use provision) specifically requires — be precise, not paraphrased
- What the dual-license commercial option entails — what does the commercial license grant that AGPL does not? Who are the xeokit maintainers (Xeolabs)? Is this still the correct entity?
- What MPL-2.0 means for engine_web-ifc — specifically: can you link to it from an AGPL project without issues? (File-level copyleft: yes, compatible)
- What the AGPL means for **contributors** — every contributor's code becomes AGPL; they cannot later claim proprietary rights. Is this spelled out in the project's CONTRIBUTING.md?
- Conflict with I-1: The dual-license plan requires getting contributor license agreements (CLAs) from all contributors so Xeolabs (or this project's maintainers) can re-license contributions commercially. Is a CLA mechanism in place?

**3D. Produce a final, locked decision record:**
Rewrite `docs/A2-repo-selection-decision.md` as a **Decision Record (DR-001)** in the following format:

```
# DR-001: Primary Viewer Library Selection

**Status:** [PROPOSED / ACCEPTED / SUPERSEDED]
**Date:** [date]
**Deciders:** [who made this decision]
**Reviewed by:** [architect, PM, tech lead]

## Context
[Why this decision was needed]

## Decision
[The decision, stated in one sentence]

## Decision Matrix
[Updated table with verified claims]

## Consequences
### Positive
### Negative / Risks
### Mitigation

## License Implications
[Complete, precise section]

## Fallback Trigger Conditions
[Specific, measurable conditions that would cause us to switch to BIMSurfer or toolkit approach]

## Review Date
[When this decision should be re-evaluated]
```

---

## Task 4: Cross-Document Consistency Check

After completing Tasks 1–3, perform a full cross-document consistency check across **all** extracted documents (K0, A1, A2, C1, C2, E1, E2):

**4A. Scope conflicts:** List every place where the same feature is assigned a different priority in two different documents.

**4B. Technology conflicts:** List every place where two different technologies are recommended for the same job.

**4C. Timeline conflicts:** List every place where timing or phasing is contradicted between documents.

**4D. Terminology conflicts:** List every place where the same concept is called by different names in different documents (e.g., "chain measurement" vs "stationing" vs "chainage").

**4E. Produce an updated rolling ledger** incorporating all new issues discovered in Tasks 1–4, with all prior issues carried forward and their statuses updated.

---

## Output Format Requirements

Structure your entire response as follows:

### Section 1: K0 Validation (Task 1)
- Subsections: 1A (10-task audit), 1B (completion plans), 1C (5-decision audit), 1D (new issues)

### Section 2: A1 Implementation (Task 2)
- Subsections: 2A (gap analysis), 2B (conflict resolutions), 2C (revised PRD, full text), 2D (traceability matrix)

### Section 3: A2 Implementation (Task 3)
- Subsections: 3A (factual validation), 3B (decision reassessment), 3C (complete license implications), 3D (Decision Record DR-001, full text)

### Section 4: Cross-Document Consistency (Task 4)
- Subsections: 4A–4E

### Section 5: Final Rolling Issues Ledger
A single consolidated table of all issues with columns: ID, Severity, Description, Status, First Seen In, Resolution/Next Action.

---

## What I Expect You to Be Honest About

The following are areas where I explicitly expect you to say "I don't know" or "I cannot verify" rather than fabricating a confident answer:

1. **Real-time GitHub stats** — you cannot look up current star counts, fork counts, or commit activity. Say so and use your training data with a stated confidence level.
2. **xeokit SDK v4 / current API** — if your knowledge of the xeokit API is based on training data that may be stale, say so. Do not invent API method names.
3. **Current xeokit commercial license terms** — you do not have access to Xeolabs' current pricing or CLA requirements. Say so.
4. **BIMSurfer current state** — if you are unsure whether BIMSurfer is still in active development, say so.
5. **WebGL2 browser support figures** — give your best estimate with a date and source citation if available; do not present stale data as current.
6. **AGPL §13 legal interpretation** — you are not a lawyer. State your understanding and explicitly say it is not legal advice.
7. **Apple Vision Pro visionOS WebXR status** — this is a fast-moving target. State what you know and when your knowledge cuts off.

---END PROMPT---

---

## Meta-notes for the human reading this prompt before use

### What this prompt does
This prompt asks Claude Opus 4 to do four things in one session:
1. Audit the K0 scaffolding work against what the plan actually specified
2. Take the A1 PRD from a rough planning doc to a production-quality, fully actionable document
3. Take the A2 decision matrix from a planning sketch to a locked architectural decision record
4. Find every consistency problem across all planning documents

### What it does NOT do
- It does not ask Claude to write application code. The K0 scaffolding work is described, not re-done.
- It does not ask Claude to perform live GitHub lookups or read external URLs.
- It does not ask for implementation of E1/E2/F1/F2/G/H/I/J/K sections — those are separate prompts.

### Known limitations to brief Claude about before use
- The `A2` label is a naming inconsistency: the source document calls this section "B) Repo Selection Decision". Claude should be aware.
- The xeokit SDK version in `package.json` is `^2.6.0`. As of early 2026, xeokit may have released newer versions (possibly a v3 or v4 SDK). Claude should flag if it has knowledge of a breaking version change.
- All existing stubs use `console.info` as placeholders — Claude should not mistake these for real implementations.
- The `noUnusedLocals: false` setting in `tsconfig.json` is intentional but risky (I-16). Claude should acknowledge this without changing it unless asked.

### Expected output length
This prompt will produce a very long response from Claude. Expect 4,000–8,000 words minimum. If Claude truncates or says "I'll summarise the rest", push back and ask for the full output. The operating contract at the top of the prompt explicitly forbids simplification without disclosure.

### How to proceed after this prompt
After Claude completes this session:
1. Save the revised A1 and A2 documents to `docs/`
2. Save the final rolling issues ledger to `docs/rolling-issues-ledger.md`
3. Use a separate prompt (not included here) to move to C1/C2 implementation and then D1 implementation
4. Do not start E1/E2 feature implementation until A1/A2 inconsistencies are resolved, especially I-14 and I-15 (priority conflicts for 2D/plan view and chain measurement)
