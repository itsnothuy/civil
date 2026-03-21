# Validation Prompt — Phase 5: V1 Features

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Validate Phase 5 implementation — storey navigation, chain/stationing, BCF, utilities, collaboration, i18n, performance hardening, and V1 release  
> **Pre-requisite:** Phases 1-4 complete and validated (MVP released as v0.1.0)  
> **Companion docs:** `completion-plan-2026-03-01.md`, execution prompt, Phase 1-4 validation reports

---

## Instructions

Execute all 7 steps. Output as `docs/reports/validation-report-phase5.md`.  
Same rules as previous phases: cite evidence, run tests, grade 0-100, no euphemisms.

---

## Step 0 — Environment Verification

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
npm run test:coverage
npm run test:e2e
npm run test:perf
npm audit --production
git log --oneline -20
```

**Phase 5 entry conditions (verify before auditing Phase 5 code):**
- Coverage ≥80% stmts (from Phase 4)
- All E2E tests passing
- v0.1.0 tag exists
- 0 critical a11y violations

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 5

| Planned File | Task | Expected Status | Actual | Notes |
|---|---|---|---|---|
| `src/ui/StoreyNavigator.ts` | 5.1 | NEW | ? | Floor/storey plan + 3D sync |
| `src/tools/ChainStationingTool.ts` | 5.2 | NEW | ? | Alignment-aware stationing |
| `src/tools/BCFService.ts` (or similar) | 5.3 | NEW | ? | BCF 2.1 zip export/import |
| `src/ui/UtilitiesPanel.ts` (or extension of FilterPanel) | 5.4 | NEW/MODIFIED | ? | Underground context |
| `src/collaboration/` directory | 5.5 | NEW | ? | Node.js backend, auth, sync |
| `src/i18n/` directory | 5.6 | NEW | ? | Translation files, language switcher |
| `src/viewer/ViewerCore.ts` | 5.7 | MODIFIED | ? | LOD, caching, WebGL resource mgmt |
| `CHANGELOG.md` | 5.8 | MODIFIED | ? | V1 release notes |

### 1b. Backend Architecture (if Task 5.5 implemented)

| Check | Status | Notes |
|---|---|---|
| Backend is in a separate directory (`server/` or `backend/`) | ? | |
| Backend has its own `package.json` | ? | |
| Backend startup documented | ? | |
| REST API endpoints documented | ? | |
| Authentication flow documented | ? | |
| CORS configured for frontend origin | ? | |
| Backend is OPTIONAL (frontend works without it) | ? | CRITICAL — viewer must work standalone |

---

## Step 2 — Task-by-Task AC Verification

### Task 5.1 — Floor/Storey-Aware 2D Plan Navigation

**AC:** Plan view shows storey outlines. Click objects in plan → focus in 3D. Navigate floors via selector.

| Criterion | Status | Evidence |
|---|---|---|
| Storey list extracted from IFC `IfcBuildingStorey` metadata | ? | |
| Floor selector UI (dropdown or sidebar) | ? | |
| Selecting storey filters visible objects to that floor | ? | |
| 2D plan view shows storey outlines/footprint | ? | |
| Click object in 2D plan → camera flies to it in 3D | ? | |
| Navigation between floors is smooth | ? | |
| Works when model has no storey info (graceful fallback) | ? | |

### Task 5.2 — Chain/Stationing Measurement

**AC:** Alignment-aware stationing with station numbers. Auto-detect IfcAlignment. Manual fallback. CSV/JSON export.

| Criterion | Status | Evidence |
|---|---|---|
| Detects `IfcAlignment` entities in model metadata | ? | |
| Displays stationing numbers along alignment | ? | |
| Manual polyline fallback when no alignment present | ? | |
| Station format: `STA 0+000.000` or regional equivalent | ? | |
| Export as CSV | ? | |
| Export as JSON | ? | |
| Integrates with existing measurement UI | ? | |

### Task 5.3 — BCF 2.1 Export/Import

**AC:** Full BCF 2.1 zip serialization. Import from BIMcollab/Solibri. Round-trip validation. Camera viewpoints + markups + selection.

| Criterion | Status | Evidence |
|---|---|---|
| BCF zip file generated on export | ? | |
| BCF contains `bcf.version` file | ? | |
| BCF contains `markup.bcf` per topic | ? | |
| BCF contains `viewpoint.bcfv` with camera position | ? | |
| BCF contains `snapshot.png` (viewer screenshot) | ? | |
| Selected objects included in viewpoint | ? | |
| Annotations/comments exported as BCF topics | ? | |
| Import: reads BCF zip, restores viewpoints | ? | |
| Import: restores annotations from BCF topics | ? | |
| Round-trip: export → import → identical state | ? | |
| Tested with BIMcollab/Solibri BCF files (if available) | ? | |

### Task 5.4 — Utilities & Underground Context

**AC:** Display pipe metadata. "What's below/behind" toggles for hidden infrastructure.

| Criterion | Status | Evidence |
|---|---|---|
| Pipe/duct metadata (diameter, material) displayed | ? | |
| "What's below" toggle shows underground utilities | ? | |
| Semi-transparent rendering for hidden infrastructure | ? | |
| Metadata extracted from IFC property sets (`Pset_*`) | ? | |
| Integrates with existing filter panel | ? | |

### Task 5.5 — Markup Collaboration (Remote Sync)

**AC:** Node.js backend. GitHub OAuth. Remote save/load. Shareable viewpoint links.

| Criterion | Status | Evidence |
|---|---|---|
| Node.js backend starts and serves API | ? | |
| GitHub OAuth login flow works | ? | |
| Annotations save to server | ? | |
| Annotations load from server | ? | |
| Shareable viewpoint URL generated | ? | |
| Opening shared URL restores exact viewpoint | ? | |
| Frontend works without backend (offline fallback) | ? | |
| Rate limiting on API endpoints | ? | |
| Input validation on server-side | ? | |

### Task 5.6 — Localization (i18n)

**AC:** All UI strings externalized. Support EN, VI, FR. Language switch persists.

| Criterion | Status | Evidence |
|---|---|---|
| All hardcoded UI strings extracted to translation files | ? | |
| EN translation file complete | ? | |
| VI translation file complete | ? | |
| FR translation file complete | ? | |
| Language switcher UI in toolbar/settings | ? | |
| Language persists in localStorage | ? | |
| Language applied on page load before first render | ? | |
| Dynamic content (error messages, toasts) also translated | ? | |
| Measurement units respect locale | ? | |

### Task 5.7 — Performance Hardening

**AC:** Profiled with large civil models. Caching, LOD, lazy loading implemented. Draw calls optimized.

| Criterion | Status | Evidence |
|---|---|---|
| Profiling results documented (FPS, load time, heap) | ? | |
| LOD (Level of Detail) implemented | ? | |
| Model caching (Service Worker or IndexedDB) | ? | |
| Lazy loading for off-screen elements | ? | |
| Draw call optimization measured | ? | |
| Performance benchmarks pass with large models | ? | |
| Before/after metrics comparison | ? | |

### Task 5.8 — V1 Release (v1.0.0)

**AC:** Tag v1.0.0. Full E2E test suite. Updated docs. Demo with civil models.

| Criterion | Status | Evidence |
|---|---|---|
| Git tag `v1.0.0` exists | ? | |
| CHANGELOG.md updated with V1 entries | ? | |
| GitHub Release created | ? | |
| All E2E tests pass | ? | |
| Demo site updated with V1 features | ? | |
| README reflects V1 capabilities | ? | |

---

## Step 3 — Cross-Cutting Concerns

### 3a. Type Safety
- All new modules have explicit return types
- BCF parsing has proper type definitions
- Backend API types shared with frontend (if applicable)
- i18n translation keys are type-safe

### 3b. Error Handling
- BCF import handles corrupt zip files gracefully
- Backend handles auth failures, network errors
- Language files handle missing translations (fallback to EN)
- IfcAlignment not found → graceful degradation

### 3c. Security (CRITICAL for Phase 5 — backend introduced)
| Check | Status | Notes |
|---|---|---|
| No secrets in source code | ? | |
| Environment variables for OAuth credentials | ? | |
| CORS properly configured | ? | |
| Input sanitization on server endpoints | ? | |
| File upload size limits | ? | |
| SQL injection prevention (if using DB) | ? | |
| XSS prevention in new UI modules | ? | |
| Rate limiting configured | ? | |

### 3d. Performance
- Benchmark suite extended for V1 features
- Large model test (≥20 MB) passes
- No memory leaks in new modules (measure over 10 min session)

---

## Step 4 — Test Coverage Audit

### Coverage (should maintain ≥80% from Phase 4)

| Metric | Phase 4 | Phase 5 | Delta | Still ≥80%? |
|---|---|---|---|---|
| Statements | ? | ? | ? | ? |
| Branches | ? | ? | ? | ? |
| Functions | ? | ? | ? | ? |
| Lines | ? | ? | ? | ? |

### New Module Coverage

| Module | Test File | Tests | Stmts | Notes |
|---|---|---|---|---|
| `StoreyNavigator.ts` | ? | ? | ? | |
| `ChainStationingTool.ts` | ? | ? | ? | |
| `BCFService.ts` | ? | ? | ? | |
| `i18n/*.ts` | ? | ? | ? | |
| Backend modules | ? | ? | ? | |

---

## Step 5 — Execution Prompt Accuracy

| Section | Accurate? | Notes |
|---|---|---|
| Phase 5 checklist all `[x]` | ? | |
| FILE MAP includes all V1 files | ? | |
| Backend architecture documented | ? | |
| Phase 6 guidance section is actionable | ? | |

---

## Step 6 — Dependency & Security

| Check | Status | Notes |
|---|---|---|
| `npm audit` in frontend | ? | |
| `npm audit` in backend (if separate) | ? | |
| New dependencies justified | ? | List all new deps |
| BCF library choice reviewed | ? | License + maintenance status |
| i18n library choice reviewed | ? | Or hand-rolled? |
| OAuth library/SDK reviewed | ? | |

---

## Step 7 — Phase Readiness Assessment

### 7a. V1 Quality Gates

| Gate | Status |
|---|---|
| All unit tests pass | ? |
| Coverage ≥80% maintained | ? |
| All E2E tests pass | ? |
| 0 critical security issues | ? |
| Performance benchmarks pass | ? |
| All V1 features functional | ? |
| Documentation complete | ? |
| v1.0.0 tagged | ? |

### 7b. Grade

**Grade: ? (?%)**

### 7c. Recommendations

1. Proceed to Phase 6? Yes/No + conditions.
2. Blocking issues for Phase 6.
3. Technical debt accumulated.

---

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|---|---|---|---|---|
| ? | ? | ? | ? | ? | ? |
