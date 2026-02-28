# Civil BIM Viewer — Implementation Validation Prompt

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Act as a senior SWE reviewer/auditor to validate that completed implementation matches the plan, identify drift, gaps, regressions, and produce a graded report with actionable fix-list before proceeding to the next phase  
> **Companion docs:**  
> - `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` (execution blueprint)  
> - `docs/reports/completion-plan-2026-03-01.md` (task definitions, AC, dependencies)  
> **Last updated:** 2026-03-01

---

## ROLE & OBJECTIVE

You are a **senior software engineer acting as a code reviewer and implementation auditor**. You are NOT implementing features — you are **validating** that what was built matches what was planned. Your job is to:

1. **Read every source file** in the codebase and compare against the execution prompt and completion plan
2. **Grade each completed task** against its acceptance criteria (PASS / PARTIAL / FAIL)
3. **Identify architectural drift** — where implementation diverged from plan (intentionally or not)
4. **Find bugs, type-safety issues, dead code, and missing error handling**
5. **Assess test coverage gaps** — what's tested, what should be but isn't
6. **Produce a structured report** with a prioritized fix-list
7. **Evaluate whether the project is ready to proceed** to the next phase

**Rules:**
1. **Read files before judging** — never assume code content from file names alone
2. **Run the full verification command** before starting your audit: `npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build`
3. **Compare against BOTH documents** — the execution prompt (how it should be built) AND the completion plan (what/why)
4. **Be specific** — cite file paths, line numbers, function names, and exact acceptance criteria text
5. **Distinguish severity** — not every divergence is a bug; some are valid engineering improvements
6. **Do not fix anything** unless explicitly asked. This is an audit, not a refactor session
7. **Output the full report as a single structured markdown** in `docs/reports/`

---

## AUDIT METHODOLOGY

Execute the following steps in order. Do NOT skip steps.

### Step 0 — Environment Verification

Run the full verification command and record the result:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```

Record:
- [ ] Format check: PASS / FAIL (with details)
- [ ] Lint: PASS / FAIL (warnings count, errors count)
- [ ] Typecheck: PASS / FAIL (with error details)
- [ ] Unit tests: PASS / FAIL (X/Y passing, failures listed)
- [ ] Build: PASS / FAIL (bundle sizes, warnings)

Also run:
```bash
npm audit --production
git --no-pager log --oneline -20
```

---

### Step 1 — Structural Audit

**Compare the actual file tree against the execution prompt's "FILE MAP" section.**

For each file in the plan:
| Planned File | Status (exists/missing/renamed) | Notes |
|---|---|---|

For each file that exists but was NOT in the plan:
| Actual File | Purpose | Should it exist? |

Check:
- [ ] Are all planned files present?
- [ ] Are there unexpected files that indicate scope creep or forgotten cleanup?
- [ ] Does the `docs/` structure match the completion plan's documented structure?
- [ ] Are `data/sample-models/` populated? (Task 0.2 dependency)

---

### Step 2 — Task-by-Task Acceptance Criteria Audit

**For each task marked as completed**, read the source code and evaluate against the acceptance criteria verbatim from the completion plan.

Use this template for EACH task:

```markdown
#### Task X.Y — [Task Name]

**Completion Plan AC (verbatim):**
> [paste exact AC text from completion-plan-2026-03-01.md]

**Execution Prompt Guidance:**
> [summarize what the execution prompt said about implementation approach]

**Actual Implementation:**
- File(s): [list files modified/created]
- Key code: [describe what was actually implemented — cite specific functions, line ranges]
- Public API: [list exported symbols]

**AC Verdict:**
| Criterion | Status | Evidence |
|---|---|---|
| [criterion 1] | PASS/PARTIAL/FAIL | [specific evidence] |
| [criterion 2] | PASS/PARTIAL/FAIL | [specific evidence] |

**Architectural Divergences:**
- [list any differences between planned and actual approach]
- [note whether each divergence is an improvement, neutral, or concerning]

**Issues Found:**
- [BUG/GAP/DEBT] Description — Severity: HIGH/MEDIUM/LOW
```

---

### Step 3 — Cross-Cutting Concerns Audit

Evaluate these dimensions across ALL completed code:

#### 3a. Type Safety
- [ ] All public APIs have explicit return types
- [ ] No `any` types (or justified `any` with comments)
- [ ] No unsafe type assertions (`as unknown as X` patterns)
- [ ] xeokit API types used correctly (not `Record<string, unknown>` workarounds)
- [ ] All event handler signatures match xeokit's type definitions

#### 3b. Error Handling
- [ ] Model loading failures handled gracefully (404, corrupt file, missing metadata)
- [ ] WebGL context loss handled
- [ ] Missing DOM elements handled (null checks on `getElementById`)
- [ ] No unhandled promise rejections in async flows
- [ ] User-facing error messages (not just console.error)

#### 3c. Memory Management
- [ ] `destroy()` methods clean up all resources (plugins, event listeners, DOM)
- [ ] No event listener leaks (listeners added in init must be removed in destroy)
- [ ] xeokit models properly destroyed on `unloadAll()`
- [ ] No circular references between modules

#### 3d. Accessibility (WCAG 2.1 AA Readiness)
- [ ] All interactive elements have `aria-label` or visible label
- [ ] `aria-pressed` correctly toggled on state buttons
- [ ] `aria-live` regions update when content changes
- [ ] Focus management: no focus traps, logical tab order
- [ ] Color contrast meets 4.5:1 ratio (check CSS custom properties)
- [ ] Touch targets ≥44×44px (check CSS `--btn-min-size`)

#### 3e. Code Conventions
- [ ] All files use Prettier formatting
- [ ] Import order: external → blank line → internal (ESLint import/order)
- [ ] JSDoc on all public methods
- [ ] Conventional commit messages on all commits
- [ ] No debug `console.log` left in (distinguish from intentional `console.info`)

#### 3f. Performance Awareness
- [ ] No unnecessary re-renders or DOM queries in hot paths
- [ ] xeokit batch APIs used where possible (`setObjectsXRayed` vs per-object)
- [ ] Search filtering uses efficient iteration (not nested loops over large sets)
- [ ] Bundle size tracked (note if >500KB warning is addressed or planned)

---

### Step 4 — Test Coverage Audit

#### Unit Tests
For each source module, assess:

| Module | Has Unit Tests? | Test Count | Key Scenarios Covered | Missing Scenarios |
|---|---|---|---|---|
| `ViewerCore.ts` | | | | |
| `ModelLoader.ts` | | | | |
| `UIController.ts` | | | | |
| `PropertiesPanel.ts` | | | | |
| `TreeView.ts` | | | | |
| `AnnotationService.ts` | | | | |

#### E2E Tests
| Scenario | Has E2E Test? | Status | Notes |
|---|---|---|---|
| Page loads correctly | | | |
| Toolbar buttons render | | | |
| 3D/2D toggle works | | | |
| Object selection | | | |
| Properties panel updates | | | |
| Tree view loads | | | |
| Search filters objects | | | |
| Section plane add/remove | | | |
| BCF export | | | |
| Keyboard navigation | | | |

#### Coverage Metrics
- Run `npm run test:coverage` and record statement/branch/function/line percentages
- Compare against completion plan targets (≥80% statements, ≥70% branches for Phase 4)
- Note: Phase 1 doesn't require these targets, but identify the gap

---

### Step 5 — Execution Prompt Accuracy Audit

**The execution prompt itself may now be outdated.** Compare its content against reality:

| Execution Prompt Section | Accurate? | What Changed |
|---|---|---|
| "CURRENT SOURCE CODE" section | | [stubs vs real code] |
| "FILE MAP" legend (★/◐/✅) | | [which symbols need updating] |
| Import path guidance (`/dist/xeokit-sdk.es.js`) | | [was this actually needed?] |
| xeokit API reference snippets | | [any API differences discovered] |
| "CODEBASE CONVENTIONS" section | | [any new conventions established] |
| Phase 1 task descriptions | | [any task that was done differently] |
| "FILES TO CREATE" table | | [which files now exist] |
| "CHECKLIST PER TASK" | | [is it actually being followed?] |

**Produce a list of required updates** to the execution prompt if it will be used for future phases.

---

### Step 6 — Dependency & Security Audit

- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] All production dependencies are necessary (no unused packages)
- [ ] TypeScript version compatibility (check eslint-plugin warning)
- [ ] Node.js engine requirement met
- [ ] License compatibility (AGPL-3.0 + xeokit AGPL-3.0 = compatible)
- [ ] No credentials, API keys, or secrets in source code
- [ ] `.gitignore` covers all build artifacts and sensitive files

---

### Step 7 — Phase Readiness Assessment

Answer these questions with evidence:

1. **Is the completed phase fully done?**
   - List any tasks marked complete that don't fully meet AC
   - List any implicit work that was assumed but not planned

2. **Are there blocking issues for the next phase?**
   - Does Phase 2 (Measurements & Tools) have all its dependencies met?
   - Are there architectural decisions needed before Phase 2?

3. **Is the codebase in a clean, buildable, deployable state?**
   - Can a new developer clone and run in <5 minutes?
   - Are there any uncommitted changes?
   - Does `npm run dev` start a working dev server?

4. **What is the overall code quality grade?**
   Use this rubric:
   - **A (95-100%):** Production-ready, comprehensive tests, elegant architecture
   - **B (80-94%):** Solid implementation, minor gaps, ready for next phase
   - **C (65-79%):** Functional but significant gaps — fix before proceeding
   - **D (50-64%):** Major issues — phase should be revisited
   - **F (<50%):** Fundamentally broken — rewrite needed

---

## OUTPUT FORMAT

Produce a single markdown file at:
```
docs/reports/validation-report-YYYY-MM-DD-phaseN.md
```

With this structure:

```markdown
# Validation Report — Phase [N]

> **Date:** YYYY-MM-DD
> **Auditor:** Claude Opus 4.6 (Copilot Agent Mode)
> **Scope:** Phase [N] — [Phase Name]
> **Verdict:** [PASS / PASS WITH CONDITIONS / FAIL]
> **Grade:** [A/B/C/D/F]

## Executive Summary
[2-3 sentence overall assessment]

## Environment Verification
[Step 0 results]

## Structural Audit
[Step 1 results]

## Task-by-Task Audit
[Step 2 results — one section per task]

## Cross-Cutting Concerns
[Step 3 results]

## Test Coverage Audit
[Step 4 results]

## Execution Prompt Accuracy
[Step 5 results]

## Dependency & Security
[Step 6 results]

## Phase Readiness Assessment
[Step 7 results]

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|----------|----------|-------------|---------|--------|
| 1 | HIGH | Bug | ... | ... | ... |
| 2 | MEDIUM | Gap | ... | ... | ... |
| 3 | LOW | Debt | ... | ... | ... |

## Recommendations
1. [Should we proceed to Phase N+1?]
2. [What must be fixed first?]
3. [What can be deferred?]
4. [Should the execution prompt be updated? How?]
```

---

## INVOCATION EXAMPLES

### Validate Phase 1 (after completing all Phase 1 tasks)

> Run the validation prompt at `docs/prompts/PROMPT-validate-implementation-civil-bim-viewer.md`.  
> Audit scope: **Phase 1 (xeokit Integration — Tasks 1.1 through 1.6)**.  
> Compare against `docs/prompts/PROMPT-swe-execution-civil-bim-viewer.md` and `docs/reports/completion-plan-2026-03-01.md`.  
> Save the report to `docs/reports/validation-report-2026-03-01-phase1.md`.

### Validate Multiple Phases

> Run the validation prompt. Audit scope: **Phases 1 and 2**.  
> Focus extra attention on the boundary between Phase 1 and Phase 2 — are Phase 1 APIs sufficient for Phase 2's needs?

### Quick Spot-Check (Single Task)

> Run the validation prompt, Step 2 only, for **Task 1.3 (Object Selection & Properties Panel)**.  
> Check AC, verify the wiring between ViewerCore and PropertiesPanel, and report any issues.

### Pre-Phase Dependency Check

> Run the validation prompt, Steps 1 and 7 only.  
> I'm about to start Phase 2. Confirm all Phase 1 dependencies are met and the codebase is ready.

---

## KNOWN CONTEXT (Current State as of 2026-03-01)

This section provides the auditor with the current ground truth so it can focus on verification rather than discovery. **This section must be updated after each validation cycle.**

### Completed Work
- **Phase 1:** Tasks 1.1–1.6 marked complete (5 commits: `c7f67af` → `9c318f8`)
- **Pre-Phase 1:** Scaffold, AnnotationService (8/8 tests), CI pipeline, docs

### Implementation Discoveries (Deviations from Execution Prompt)
These are known divergences where the implementation chose a different approach than the execution prompt suggested. The auditor should evaluate whether each was a good decision:

1. **Import path:** Execution prompt said `from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js"` — implementation uses `from "@xeokit/xeokit-sdk"` (works because Vite resolves the `"module"` field and `moduleResolution: "bundler"` finds the types). **Evaluate: is this safe for all build scenarios?**

2. **Selection mechanism:** Execution prompt said `viewer.scene.input.on("mouseclicked", ...)` → `viewer.scene.pick()` — implementation uses `cameraControl.on("picked", pickResult)` which gives `PickResult` directly with entity + worldPos. **Evaluate: is this the right API for click-to-select?**

3. **`getAABB()` workaround:** xeokit type definition requires `ids: string[]` parameter for `scene.getAABB()`. Implementation passes `viewer.scene.objectIds` to satisfy TypeScript. **Evaluate: is this correct behavior? Does it return the same result as no-args `getAABB()`?**

4. **Entity.id type:** xeokit types say `Entity.id` is `string | number`. Implementation uses `String(entity.id)` for the selection callback. **Evaluate: is this the right coercion approach?**

5. **TreeViewPlugin initialization:** Execution prompt said to put it in UIController. Implementation created a separate `src/ui/TreeView.ts` wrapper class instantiated in `main.ts`. **Evaluate: is this better separation of concerns?**

6. **Search implementation:** Execution prompt suggested toggling `entity.visible` per-object. Implementation uses batch `setObjectsXRayed` + `setObjectsHighlighted` (X-ray non-matches, highlight matches). **Evaluate: which gives a better UX?**

### Verification Status
| Check | Status |
|---|---|
| `npm run format:check` | PASS |
| `npm run lint` | PASS (1 TS version warning) |
| `npm run typecheck` | PASS |
| `npm run test` | PASS (8/8) |
| `npm run build` | PASS (1.09 MB JS, chunk size warning) |
| `npm audit` | 0 vulnerabilities |

### Files Modified/Created in Phase 1
| File | Action | Lines |
|---|---|---|
| `src/viewer/ViewerCore.ts` | Rewritten | 188 |
| `src/loader/ModelLoader.ts` | Rewritten | 77 |
| `src/ui/UIController.ts` | Heavily modified | 164 |
| `src/ui/PropertiesPanel.ts` | **New** | 60 |
| `src/ui/TreeView.ts` | **New** | 77 |
| `src/main.ts` | Modified | 58 |
| `src/index.html` | Modified | 56 |
| `src/styles/main.css` | Modified | 244 |

### Remaining TODOs in Code
| File | Line | TODO Text |
|---|---|---|
| `src/ui/UIController.ts` | 78 | `// TODO (Task 8): bind btn-measure to MeasurementTool` |
| `src/ui/UIController.ts` | 79 | `// TODO (Task 8): bind btn-annotate to annotation creation flow` |
| `src/annotations/AnnotationService.ts` | 119 | `// TODO (V1): importBCF(zip: Blob): Promise<void>` |
| `src/annotations/AnnotationService.ts` | 120 | `// TODO (V1): exportBCF(): Promise<Blob>` |

### Git History (Phase 1 commits)
```
9c318f8 feat(ui): add section plane list with remove/clear UI (Task 1.5)
ae102aa feat(ui): add search filtering and tree view navigation (Task 1.4)
774f00b feat(ui): add object selection with properties panel (Task 1.3)
751942d feat(loader): wire ModelLoader to xeokit GLTFLoaderPlugin
c7f67af feat(viewer): initialize xeokit Viewer with orbit/pan/zoom, X-ray, section planes, NavCube
```

---

## MAINTENANCE

After each validation cycle:
1. Update the "KNOWN CONTEXT" section with new findings
2. If the execution prompt needs updates, note them in the report's "Recommendations" section
3. Archive previous validation reports (don't delete — they form an audit trail)
4. If critical issues are found, create entries in `docs/review/final-rolling-issues-ledger.md`

---

*This validation prompt is designed to be run at phase boundaries — after completing a phase's implementation and before starting the next. It catches issues early, keeps the execution prompt accurate, and ensures each phase meets its acceptance criteria before building on top of it.*
