# Validation Prompt — Phase 3: Civil-Specific Features & Accessibility

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Validate Phase 3 implementation against completion plan AC and codebase conventions  
> **Companion docs:**  
> - `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC)  
> - `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` (conventions, API reference)  
> - `docs/reports/validation-report-2026-03-01-phase1.md` (Phase 1 report — reference for format)  
> - `docs/reports/validation-report-2026-03-01-phase2.md` (Phase 2 report — reference for format)

---

## Instructions

Execute all 7 steps below **in order**. For each step, produce a Markdown section with tables, evidence, and verdicts. Output the complete report as `docs/reports/validation-report-phase3.md`.

**Rules:**
1. Every claim must cite a specific file + line range, terminal output, or git hash.
2. Do not assume code works — read it. Do not assume tests pass — run them.
3. Grade on a 100-point scale: A (≥90), B (≥80), C (≥70), D (≥60), F (<60).
4. List ALL issues found, even LOW severity — nothing is too small to record.
5. Be direct. If something is missing or wrong, say so. No euphemisms.

---

## Step 0 — Environment Verification

Run the full verification suite and record results in a table:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --production
git status
git log --oneline -10
```

| Check | Status | Details |
|---|---|---|
| `npm run format:check` | ? | |
| `npm run lint` | ? | |
| `npm run typecheck` | ? | |
| `npm run test` | ? | Test count, suites, pass/fail |
| `npm run build` | ? | Bundle sizes |
| `npm audit --production` | ? | Vulnerability count |
| Git status | ? | Clean / uncommitted changes |
| Git log | ? | List Phase 3 commits (should be 4) |

**Phase 3 expected commits (verify these exist):**
- `235e142` feat(ui): add layer/discipline filtering panel (Task 3.1)
- `916caed` feat(ui): add high-contrast mode toggle with localStorage persistence (Task 3.2)
- `9517fee` feat(ui): full keyboard navigation with shortcuts help overlay (Task 3.3)
- `77fe8bb` test(perf): add Playwright performance benchmarks for load time, FPS, and heap (Task 3.4)

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 3

Read every file listed below. Record actual line counts. Flag any unexpected files.

| Planned File | Expected Status | Actual Lines | Notes |
|---|---|---|---|
| `src/ui/FilterPanel.ts` | NEW (Task 3.1) | ~312 | Layer/discipline filtering |
| `src/ui/UIController.ts` | MODIFIED (Tasks 3.2, 3.3) | ~442 | High-contrast + keyboard shortcuts |
| `src/index.html` | MODIFIED (Tasks 3.2, 3.3) | ~59 | skip-to-content, btn-high-contrast, filter-panel section |
| `src/styles/main.css` | MODIFIED (Tasks 3.2, 3.3) | ~586 | .high-contrast, skip-to-content, keyboard help overlay |
| `src/main.ts` | MODIFIED (Task 3.1) | ~71 | Wires FilterPanel |
| `tests/performance/benchmark.spec.ts` | NEW (Task 3.4) | ~193 | Playwright + CDP perf tests |
| `package.json` | MODIFIED (Task 3.4) | — | Added `test:perf` script |

### 1b. Unexpected/Missing Files

Check for any files created that aren't in the plan, or planned files that are missing.

### 1c. Architecture Integrity

Verify the dependency graph hasn't created circular imports:
```
main.ts → ViewerCore, ModelLoader, AnnotationService, UIController, PropertiesPanel, TreeView, FilterPanel
FilterPanel → ViewerCore (uses viewer.viewer.metaScene + viewer.viewer.scene)
UIController → ViewerCore, AnnotationService, MeasurementTool?, AnnotationOverlay?
```

---

## Step 2 — Task-by-Task AC Verification

For each task, quote the AC from the completion plan, then verify each criterion with evidence.

### Task 3.1 — Layer/Discipline Filtering

**AC (verbatim from completion plan):**
> Filter by discipline. Selected layers visible, others hidden or X-rayed. Quick toggles work.

**Verify by reading `src/ui/FilterPanel.ts`:**

| Criterion | Status | Evidence (file:line or test output) |
|---|---|---|
| Parses IFC metadata to extract discipline/type information | ? | Check `_buildGroups()` or equivalent method |
| Groups by discipline (structural, mechanical, electrical, plumbing, utilities, other) | ? | Check `DISCIPLINE_MAP` or equivalent mapping |
| Checkboxes per discipline toggle visibility | ? | Check `toggleGroup()` or equivalent |
| X-ray mode for hidden disciplines (transparent instead of fully hidden) | ? | Check X-ray toggle implementation |
| "Show all" / "Hide all" quick buttons | ? | Check `showAll()` / `hideAll()` methods |
| Wired into main application (initialized in `main.ts`) | ? | Check `main.ts` imports and initialization |

**Additional checks:**
- Are ALL IFC types mapped? (At minimum: IfcWall, IfcBeam, IfcColumn, IfcSlab, IfcDoor, IfcWindow, IfcPipeSegment, IfcDuctSegment, IfcCableSegment)
- Does the filter panel update when a model is loaded?
- Is `destroy()` implemented to clean up event listeners?

### Task 3.2 — High-Contrast Mode Toggle

**AC (verbatim):**
> Toggle switches theme. Preference persists.

**Note:** Original AC said "Contrast ratios pass Lighthouse audit" — this is deferred to Phase 4.3 (accessibility audit).

**Verify:**

| Criterion | Status | Evidence |
|---|---|---|
| Toggle button exists in toolbar (`btn-high-contrast`) | ? | Check `src/index.html` |
| Button toggles `.high-contrast` class on `<body>` | ? | Check UIController handler |
| CSS provides WCAG AA contrast ratios in high-contrast mode | ? | Check `main.css` `.high-contrast` rules |
| Preference persists in localStorage | ? | Check localStorage get/set calls |
| Preference restored on page load | ? | Check `_restoreHighContrast()` or equivalent |
| `aria-pressed` attribute toggles on the button | ? | Check accessibility of toggle |

### Task 3.3 — Keyboard Navigation (WCAG 2.1 AA)

**AC (verbatim):**
> Complete keyboard-only navigation possible. axe audit passes with 0 violations.

**Note:** Automated axe audit deferred to Phase 4.3. Verify keyboard nav is implemented.

**Verify:**

| Criterion | Status | Evidence |
|---|---|---|
| Skip-to-content link present and functional | ? | Check `index.html` for skip link, CSS for visibility |
| `H` key toggles high-contrast mode | ? | Check `_bindKeyboard()` |
| `F` key focuses search input | ? | Check `_bindKeyboard()` |
| `?` key opens keyboard help overlay | ? | Check `_showKeyboardHelp()` |
| Help overlay lists all shortcuts | ? | Check overlay content |
| Help overlay dismissible via Escape or clicking X | ? | Check close handlers |
| Canvas has `tabindex="0"` for keyboard focus | ? | Check `index.html` |
| All toolbar buttons are keyboard-accessible | ? | Check `<button>` elements have proper semantics |
| Visible focus indicators on all interactive elements | ? | Check CSS `:focus-visible` rules |
| Pre-existing shortcuts still work (Tab, Escape, M, A, X) | ? | Check `_bindKeyboard()` doesn't break them |

**Regression check:** Verify that adding new keyboard shortcuts didn't break Tab cycling, Escape deselect, or M/A/X shortcuts from Phase 1/2.

### Task 3.4 — Performance Benchmarks

**AC (verbatim):**
> Benchmark results published to CI artifacts. Thresholds enforced.

**Verify by reading `tests/performance/benchmark.spec.ts`:**

| Criterion | Status | Evidence |
|---|---|---|
| Uses Playwright + Chrome DevTools Protocol | ? | Check CDP session setup |
| Measures model load time | ? | Check `Performance.getMetrics` or timing code |
| Measures FPS during interaction | ? | Check `beginFrame`/`endFrame` or equivalent |
| Measures memory (JS heap) | ? | Check `JSHeapUsedSize` metric |
| CI budget thresholds defined (load <5s, FPS ≥30, heap <500 MB) | ? | Check assertions/expect statements |
| `npm run test:perf` script added to package.json | ? | Check package.json scripts |
| Tests are in correct location (`tests/performance/`) | ? | File path check |

---

## Step 3 — Cross-Cutting Concerns

### 3a. Type Safety

| Check | Status | Notes |
|---|---|---|
| FilterPanel — all public methods have explicit return types | ? | |
| FilterPanel — no unjustified `any` types | ? | |
| UIController changes — no new `any` types introduced | ? | |
| benchmark.spec.ts — proper TypeScript types | ? | |
| No `as unknown as X` patterns in Phase 3 code | ? | |

### 3b. Error Handling

| Check | Status | Notes |
|---|---|---|
| FilterPanel handles empty metaScene (no model loaded) | ? | |
| FilterPanel handles missing metaObjects gracefully | ? | |
| High-contrast localStorage — handles quota exceeded | ? | |
| Keyboard shortcuts — no errors when DOM elements don't exist | ? | |

### 3c. Memory Management

| Check | Status | Notes |
|---|---|---|
| FilterPanel `destroy()` removes event listeners | ? | |
| Keyboard help overlay cleanup on close | ? | |
| No event listeners attached in loops without cleanup | ? | |
| Performance benchmark cleans up CDP session | ? | |

### 3d. Accessibility (WCAG 2.1 AA Readiness)

| Check | Status | Notes |
|---|---|---|
| All new buttons have `aria-label` | ? | |
| Toggle buttons use `aria-pressed` | ? | |
| Filter checkboxes properly labeled | ? | |
| Skip-to-content link is first focusable element | ? | |
| Help overlay has `role="dialog"` and `aria-modal` | ? | |
| Focus trapped in modal when open | ? | |
| Color is not the only visual indicator | ? | |

### 3e. Code Conventions

| Check | Status | Notes |
|---|---|---|
| Prettier formatting passes | ? | |
| Import order: external → blank → internal | ? | |
| JSDoc on all public methods in new files | ? | |
| Conventional commit messages | ? | |
| No `console.log` (only `console.info`/`console.warn`) | ? | |
| CSS uses custom properties (not hardcoded colors) | ? | |

### 3f. Performance Awareness

| Check | Status | Notes |
|---|---|---|
| FilterPanel batch operations (`setObjectsVisible`, `setObjectsXRayed`) | ? | Uses batch xeokit APIs instead of per-object loops? |
| No DOM queries in hot paths | ? | |
| Event delegation used where appropriate | ? | |

---

## Step 4 — Test Coverage Audit

### Unit Tests

| Module | Has Unit Tests? | Test Count | Coverage | Missing Scenarios |
|---|---|---|---|---|
| `FilterPanel.ts` | ? | ? | ? | List what's untested |
| `UIController.ts` (Phase 3 additions) | ? | ? | ? | Keyboard shortcuts, high-contrast |
| `ViewerCore.ts` | ? | ? | ? | Still 0%? |
| `ModelLoader.ts` | ? | ? | ? | Still 0%? |

### Performance Tests

| Scenario | File | Status | Notes |
|---|---|---|---|
| Page load time | benchmark.spec.ts | ? | |
| FPS during orbit | benchmark.spec.ts | ? | |
| JS heap measurement | benchmark.spec.ts | ? | |
| Mode switch round-trip | benchmark.spec.ts | ? | |

### Overall Coverage

Run `npm run test:coverage` and record:

| Metric | Phase 2 | Phase 3 | Delta | Phase 4 Target |
|---|---|---|---|---|
| Statements | 37.36% | ? | ? | ≥80% |
| Branches | 23.71% | ? | ? | ≥70% |
| Functions | 44.6% | ? | ? | ≥70% |
| Lines | 37.35% | ? | ? | ≥80% |

**Note:** Coverage may have decreased if new source files (FilterPanel) were added without tests. This is expected but should be flagged.

### E2E Tests

| Phase 3 Feature | Has E2E Test? | Notes |
|---|---|---|
| Filter panel toggle | ? | |
| High-contrast toggle | ? | |
| Keyboard shortcuts (H, F, ?) | ? | |
| Skip-to-content link | ? | |

---

## Step 5 — Execution Prompt Accuracy

Check `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` against Phase 3 reality:

| Section | Accurate? | What Changed |
|---|---|---|
| FILE MAP — FilterPanel.ts listed | ? | Should be ✅ DONE |
| FILE MAP — benchmark.spec.ts listed | ? | Should be ✅ DONE |
| Phase 3 checklist tasks checked `[x]` | ? | All 4 should be checked |
| UIController constructor signature | ? | Should be 5 params since Phase 2 |
| CURRENT SOURCE CODE — main.ts | ? | Shows Phase 1 version; missing FilterPanel import |
| FILES TO CREATE table updated | ? | FilterPanel, benchmark should be marked done |
| Phase 3 guidance section | ? | Still shows "TODO" guidance vs actual implementation |

**List all execution prompt sections that need updating for Phase 3 reality.**

---

## Step 6 — Dependency & Security

| Check | Status | Notes |
|---|---|---|
| `npm audit` 0 vulnerabilities | ? | |
| No new runtime dependencies added in Phase 3 | ? | FilterPanel should use existing xeokit |
| No secrets in source | ? | |
| `.gitignore` covers new artifacts | ? | |
| License headers consistent | ? | |

---

## Step 7 — Phase Readiness Assessment

### 7a. Is Phase 3 fully done?

| Task | AC Met? | Deferred Items |
|---|---|---|
| 3.1 Layer Filtering | ? | |
| 3.2 High-Contrast | ? | Lighthouse audit → Phase 4.3 |
| 3.3 Keyboard Navigation | ? | axe audit → Phase 4.3, arrow key tree nav? |
| 3.4 Performance Benchmarks | ? | |

### 7b. Known gaps to carry into Phase 4

List everything that was in the Phase 3 AC but deferred:
1. Automated axe audit (Phase 3.3 AC said "axe audit passes with 0 violations")
2. Lighthouse accessibility score ≥90
3. Arrow key tree navigation (if not implemented)
4. Unit tests for FilterPanel (0% coverage)
5. Unit tests for UIController keyboard additions
6. Anything else found during audit

### 7c. Are there blocking issues for Phase 4?

Phase 4 dependencies:
- Task 4.1 (unit tests): needs all source modules to exist ✅ (Phases 1-3 complete)
- Task 4.2 (E2E tests): needs working viewer + all features ✅
- Task 4.3 (accessibility audit): needs keyboard nav + high-contrast ✅ (Phase 3.3 + 3.2)
- Task 4.4 (docs): needs features to document ✅
- Task 4.5 (MVP release): needs tasks 4.1-4.4 complete

### 7d. Codebase health snapshot

| Metric | Value |
|---|---|
| Total source lines (src/) | ~2,890 |
| Total test files | 6 (4 unit + 1 e2e + 1 perf) |
| Total tests | ~62 |
| Build size (JS) | ~1,164 kB |
| `npm audit` vulnerabilities | ? |
| ESLint warnings | ? |

### 7e. Overall Grade

**Grade: ? (?%)**

Rationale:
- Strengths: ...
- Weaknesses: ...

---

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|---|---|---|---|---|
| ? | ? | ? | ? | ? | ? |

---

## Recommendations

1. **Proceed to Phase 4?** Yes/No and conditions.
2. **Fix before Phase 4:** List any items that should be fixed first.
3. **Defer to Phase 4:** List items that can be addressed during Phase 4.
4. **Update execution prompt:** List specific sections to update.
