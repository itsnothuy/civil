# Validation Prompt — Phase 4: Testing & MVP Release

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Validate Phase 4 implementation — unit test coverage, E2E tests, accessibility audit, documentation, and MVP release  
> **Companion docs:**  
> - `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC)  
> - `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` (conventions, API reference)  
> - Previous validation reports: `phase1.md`, `phase2.md`, `phase3.md`

---

## Instructions

Execute all 7 steps below **in order**. Output the complete report as `docs/reports/validation-report-phase4.md`.

**Rules:**
1. Every claim must cite a specific file + line range, terminal output, or git hash.
2. Do not assume code works — read it. Do not assume tests pass — run them.
3. Grade on a 100-point scale: A (≥90), B (≥80), C (≥70), D (≥60), F (<60).
4. List ALL issues found, even LOW severity.
5. Be direct. If something is missing or wrong, say so.

---

## Step 0 — Environment Verification

Run the full verification suite:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
npm run test:coverage
npm audit --production
git status && git log --oneline -15
```

Record in the standard table. Phase 4 is the testing/quality gate — **all checks MUST pass with high coverage**.

Expected state entering Phase 4:
- 62+ tests (from Phases 1-3)
- Coverage ~37% stmts (to be raised to ≥80%)
- Build: ~1,164 kB JS

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 4

| Planned File | Expected Status | Actual | Notes |
|---|---|---|---|
| `tests/unit/ViewerCore.test.ts` | NEW (Task 4.1) | ? | Core viewer tests |
| `tests/unit/ModelLoader.test.ts` | NEW (Task 4.1) | ? | Model loading tests |
| `tests/unit/UIController.test.ts` | NEW (Task 4.1) | ? | Toolbar + search + keyboard tests |
| `tests/unit/FilterPanel.test.ts` | NEW (Task 4.1) | ? | Layer filtering tests |
| `tests/unit/PropertiesPanel.test.ts` | NEW (Task 4.1) | ? | Properties display + XSS tests |
| `tests/unit/TreeView.test.ts` | NEW (Task 4.1) | ? | Tree navigation + context menu tests |
| `tests/e2e/viewer.spec.ts` | MODIFIED (Task 4.2) | ? | Extended E2E suite |
| `tests/e2e/measurement.spec.ts` | NEW (Task 4.2) | ? | Measurement E2E (if separate file) |
| `tests/e2e/annotation.spec.ts` | NEW (Task 4.2) | ? | Annotation E2E (if separate file) |
| `README.md` | MODIFIED (Task 4.4) | ? | Updated docs |
| `CHANGELOG.md` | NEW (Task 4.5) | ? | Release changelog |
| `jest.config.js` | MODIFIED (Task 4.1) | ? | Raised coverage thresholds |

### 1b. Coverage Thresholds

Read `jest.config.js` and verify coverage thresholds were raised:

| Threshold | Phase 3 Value | Phase 4 Expected | Actual |
|---|---|---|---|
| Statements | 5 | ≥80 | ? |
| Branches | 2 | ≥70 | ? |
| Functions | 5 | ≥70 | ? |
| Lines | 5 | ≥80 | ? |

---

## Step 2 — Task-by-Task AC Verification

### Task 4.1 — Comprehensive Unit Tests

**AC (verbatim):**
> ≥80% unit test coverage across all source modules.

**Verify:**

| Module | Unit Test File | Test Count | Stmt % | Branch % | Func % | Line % |
|---|---|---|---|---|---|---|
| `ViewerCore.ts` | `ViewerCore.test.ts` | ? | ? | ? | ? | ? |
| `ModelLoader.ts` | `ModelLoader.test.ts` | ? | ? | ? | ? | ? |
| `UIController.ts` | `UIController.test.ts` | ? | ? | ? | ? | ? |
| `FilterPanel.ts` | `FilterPanel.test.ts` | ? | ? | ? | ? | ? |
| `PropertiesPanel.ts` | `PropertiesPanel.test.ts` | ? | ? | ? | ? | ? |
| `TreeView.ts` | `TreeView.test.ts` | ? | ? | ? | ? | ? |
| `MeasurementTool.ts` | `MeasurementTool.test.ts` | pre-existing | ~98% | ~71% | 100% | 100% |
| `AnnotationOverlay.ts` | `AnnotationOverlay.test.ts` | pre-existing | ~93% | ~61% | ~94% | ~98% |
| `AnnotationService.ts` | `AnnotationService.test.ts` | pre-existing | ~96% | ~88% | 100% | ~97% |
| **Global** | — | ? | **≥80?** | **≥70?** | **≥70?** | **≥80?** |

**Critical xeokit mocking checks:**
- All xeokit classes mocked properly (Viewer, Scene, Camera, CameraControl, CameraFlight, etc.)
- Mock returns correct shapes for all accessed properties
- Event registration (`on()`) and firing works in mocks
- `SectionPlanesPlugin`, `NavCubePlugin`, `GLTFLoaderPlugin` properly mocked

**Key scenarios that MUST be tested (check for each):**

ViewerCore:
- [ ] Constructor initializes xeokit Viewer with correct options
- [ ] `setMode("2d")` changes navMode to planView
- [ ] `setMode("3d")` restores orbit mode
- [ ] `setXray(true/false)` calls batch `setObjectsXRayed`
- [ ] `addSectionPlane()` returns ID, null when max (6) reached
- [ ] `removeSectionPlane(id)` cleans up
- [ ] `clearSectionPlanes()` removes all
- [ ] `exportSectionPlanes()` returns correct format
- [ ] `onSelect(cb)` returns unsubscribe function
- [ ] Multiple selection listeners fire independently
- [ ] `selectEntity(null)` deselects
- [ ] `cycleSelection()` advances through entity list
- [ ] `destroy()` cleans up everything
- [ ] WebGL context loss handler attached

ModelLoader:
- [ ] Constructor creates `GLTFLoaderPlugin`
- [ ] `loadProject()` constructs correct path
- [ ] `loadProject()` resolves on "loaded" event
- [ ] `loadProject()` rejects on "error" event with XSS-safe message
- [ ] `unloadAll()` destroys all models

UIController:
- [ ] Constructor binds all toolbar buttons
- [ ] Search filters model tree (x-ray non-matching)
- [ ] Keyboard: Tab cycles selection
- [ ] Keyboard: Escape deselects / closes panels
- [ ] Keyboard: M toggles measurement, A toggles annotation
- [ ] Keyboard: H toggles high-contrast
- [ ] Keyboard: F focuses search
- [ ] Keyboard: ? opens help overlay
- [ ] Mutual exclusion: measure/annotate modes
- [ ] Section plane add/remove/clear
- [ ] `_showToast()` creates and auto-removes toast
- [ ] High-contrast persists to localStorage

FilterPanel:
- [ ] `init()` builds groups from metaScene
- [ ] Discipline mapping covers expected IFC types
- [ ] `toggleGroup()` shows/hides objects
- [ ] `setXrayMode(true)` xrays instead of hiding
- [ ] `showAll()` makes all objects visible
- [ ] `hideAll()` hides all objects
- [ ] `destroy()` cleans up

### Task 4.2 — E2E Tests

**AC (verbatim):**
> All E2E tests pass on CI. No visual regressions.

**Verify:**

Run `npm run test:e2e` and record:

| E2E Scenario | Status | Notes |
|---|---|---|
| Page loads without errors | ? | Pre-existing |
| Toolbar buttons present | ? | Pre-existing — should include ALL buttons now |
| Model loads in viewer canvas | ? | Requires sample model in `data/` |
| Object click → selection highlight | ? | |
| Properties panel shows metadata on selection | ? | |
| Tree view navigation → selection sync | ? | |
| Measurement tool: two-point measurement | ? | |
| Path measurement: multi-point | ? | |
| Annotation creation flow | ? | |
| JSON export → import round-trip | ? | |
| Filter panel: toggle discipline visibility | ? | |
| High-contrast mode toggle | ? | |
| Section plane create/remove/clear | ? | |
| Keyboard shortcuts (M, A, H, F, ?) | ? | |
| Camera 3D ↔ 2D toggle | ? | |
| Cross-browser: Chrome | ? | |
| Cross-browser: Safari/WebKit | ? | |
| Cross-browser: Mobile Chrome | ? | |

**Screenshot tests:**
- [ ] Visual regression baseline established
- [ ] Comparison configured in CI

**Sample model requirement:**
- [ ] `data/sample-models/` contains at least one converted model for E2E
- [ ] If empty, which E2E tests are blocked?

### Task 4.3 — Accessibility Audit

**AC (verbatim):**
> Lighthouse accessibility score ≥90. axe violations = 0 critical.

**Verify:**

| Audit Type | Tool | Score/Result | Notes |
|---|---|---|---|
| Automated axe audit | @axe-core/playwright or axe-core | ? violations | 0 critical required |
| Lighthouse accessibility | lighthouse-ci or manual | Score: ? | ≥90 required |
| Color contrast (AA) | axe or manual | ? | 4.5:1 minimum for normal text |
| Focus management | Manual review | ? | All interactions keyboard-accessible |
| Screen reader basics | VoiceOver manual test | ? | Required by AC |

**Critical a11y checks:**
- [ ] All `<img>` have `alt` attributes
- [ ] All `<button>` have accessible names (`aria-label` or text content)
- [ ] All form inputs have labels
- [ ] Skip-to-content link works
- [ ] Focus order is logical (top→bottom, left→right)
- [ ] No keyboard traps
- [ ] `aria-live` regions for dynamic content (toast notifications)
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Color is not the only visual indicator for any state

### Task 4.4 — Documentation Update

**AC (verbatim):**
> A new developer can set up and run the project in <15 minutes using the docs.

**Verify:**

| Doc Check | Status | Notes |
|---|---|---|
| README.md — accurate badge URLs | ? | |
| README.md — screenshots/GIFs of actual app | ? | |
| README.md — correct quick start (verified by running it) | ? | |
| Getting Started guide exists | ? | |
| Architecture overview with diagram | ? | |
| `feature-traceability-matrix.md` updated | ? | |
| `final-rolling-issues-ledger.md` updated | ? | |
| All internal links in docs resolve | ? | |

**Test the quick start:**
```bash
git clone <repo>
cd civil
npm install
npm run dev
# Open http://localhost:3000 — does it work?
```

### Task 4.5 — MVP Release (v0.1.0)

**AC (verbatim):**
> Release tagged. Demo site accessible. CHANGELOG complete.

**Verify:**

| Release Check | Status | Notes |
|---|---|---|
| `CHANGELOG.md` exists and is complete | ? | |
| Git tag `v0.1.0` exists | ? | |
| GitHub Release created with notes | ? | |
| All Phases 1-4 changes included in release | ? | |
| Demo site (`itsnothuy.github.io/civil`) accessible | ? | |


---

## Step 3 — Cross-Cutting Concerns

### 3a. Test Quality

| Check | Status | Notes |
|---|---|---|
| Tests are deterministic (no flaky tests) | ? | Run suite 3× |
| Tests are independent (no shared state leaking) | ? | Check `beforeEach` cleanup |
| Mock objects match real xeokit API shapes | ? | Spot-check key mocks |
| Edge cases tested (null, undefined, empty arrays) | ? | |
| Error paths tested (throw, reject) | ? | |
| No `test.skip` or `test.todo` left unresolved | ? | List any |

### 3b. Type Safety (Phase 4 focus: test files)

| Check | Status | Notes |
|---|---|---|
| Test files compile with `npm run typecheck` | ? | |
| Mock types are compatible with real types | ? | |
| No `// @ts-ignore` or `// @ts-expect-error` in tests | ? | |

### 3c. CI Integration

| Check | Status | Notes |
|---|---|---|
| `.github/workflows/ci.yml` runs unit tests | ? | |
| CI runs E2E tests | ? | |
| CI runs accessibility audit | ? | |
| CI enforces coverage thresholds | ? | |
| CI publishes coverage artifacts | ? | |

---

## Step 4 — Test Coverage Audit

This is THE critical step for Phase 4. Run `npm run test:coverage` and create the definitive coverage table.

### Global Coverage

| Metric | Phase 3 Actual | Phase 4 Actual | Target | Met? |
|---|---|---|---|---|
| Statements | ~37% | ? | ≥80% | ? |
| Branches | ~24% | ? | ≥70% | ? |
| Functions | ~45% | ? | ≥70% | ? |
| Lines | ~37% | ? | ≥80% | ? |

### Per-Module Coverage

| Module | Stmts | Branch | Funcs | Lines | Sufficient? |
|---|---|---|---|---|---|
| `ViewerCore.ts` | ? | ? | ? | ? | |
| `ModelLoader.ts` | ? | ? | ? | ? | |
| `UIController.ts` | ? | ? | ? | ? | |
| `FilterPanel.ts` | ? | ? | ? | ? | |
| `PropertiesPanel.ts` | ? | ? | ? | ? | |
| `TreeView.ts` | ? | ? | ? | ? | |
| `MeasurementTool.ts` | ~98% | ~71% | 100% | 100% | ✅ |
| `AnnotationOverlay.ts` | ~93% | ~61% | ~94% | ~98% | ✅ |
| `AnnotationService.ts` | ~96% | ~88% | 100% | ~97% | ✅ |
| `main.ts` | ? | ? | ? | ? | |

### Coverage Gaps

For any module below 80% statements, list the specific uncovered lines/branches.

---

## Step 5 — Execution Prompt Accuracy

After Phase 4, the execution prompt should be fully updated through MVP:

| Section | Accurate? | Required Update |
|---|---|---|
| Phase 4 checklist all `[x]` | ? | |
| Coverage thresholds in Testing Strategy section | ? | Should show new thresholds |
| FILE MAP shows all test files | ? | |
| FILES TO CREATE — all Phase 4 files marked done | ? | |
| Phase 5 guidance is clear and actionable | ? | |

---

## Step 6 — Dependency & Security

| Check | Status | Notes |
|---|---|---|
| `npm audit` 0 vulnerabilities | ? | |
| No new production dependencies | ? | Only dev deps (axe-core, etc.) |
| License compatibility maintained | ? | |
| No test fixtures contain real project data | ? | |

---

## Step 7 — Phase Readiness Assessment

### 7a. Is Phase 4 (MVP) fully done?

| Task | AC Met? | Notes |
|---|---|---|
| 4.1 Unit test coverage ≥80% | ? | |
| 4.2 E2E tests all features | ? | |
| 4.3 Accessibility audit ≥90 | ? | |
| 4.4 Documentation updated | ? | |
| 4.5 v0.1.0 released | ? | |

### 7b. MVP Quality Gates

| Gate | Status | Notes |
|---|---|---|
| All unit tests pass | ? | |
| All E2E tests pass | ? | |
| Coverage thresholds enforced | ? | |
| 0 critical a11y violations | ? | |
| Build succeeds without warnings (except known xeokit chunk) | ? | |
| README quick start verified | ? | |
| CHANGELOG complete | ? | |
| Git tag v0.1.0 exists | ? | |

### 7c. Known issues to carry into Phase 5 (V1)

Consolidate ALL remaining issues from Phases 1-4 that will be addressed in V1:

| # | From Phase | Description | Severity |
|---|---|---|---|
| 1 | 2 | No annotation edit UI | MEDIUM |
| 2 | 2 | Path total not shown in DOM | MEDIUM |
| 3 | 2 | 11× `any` casts at xeokit boundaries | LOW |
| 4 | 0 | `data/sample-models/` still empty | LOW |
| 5+ | ? | (Add any new issues found) | ? |

### 7d. Codebase health snapshot (MVP state)

| Metric | Value |
|---|---|
| Total source lines | ? |
| Total test files | ? |
| Total unit tests | ? |
| Total E2E tests | ? |
| Global coverage | ?% stmts |
| Build size | ? kB |
| Lighthouse a11y score | ? |
| npm vulnerabilities | ? |

### 7e. Overall Grade

**Grade: ? (?%)**

This is the **MVP quality gate**. Grade ≥B required to proceed.

---

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|---|---|---|---|---|
| ? | ? | ? | ? | ? | ? |

---

## Recommendations

1. **Is the MVP ready for release?** Yes/No + conditions.
2. **Blocking items** that must be fixed before tagging v0.1.0.
3. **Phase 5 readiness:** Are all V1 dependencies met?
