# Civil BIM Viewer — Phase 8: Integration, Testing & Production Readiness

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Bridge the gap between "all features implemented" and "production-ready application that users can actually run"  
> **Pre-requisites:** Phases 1–7 complete (all validated, overall B+ 85.6%)  
> **Date:** 2026-03-24  
> **Companion docs:** `completion-plan-2026-03-01.md`, `PROMPT-swe-execution-civil-bim-viewer.md`, all Phase 1–7 validation reports

---

## WHY THIS PHASE EXISTS

All 7 planned phases are complete. The codebase has:
- **825 unit tests**, **57 E2E tests**, **2 performance benchmarks** — 884 total
- **87.06% statement coverage** (target: 90%)
- Production-grade infrastructure: CSP, rate limiting, error boundaries, structured logging, Docker, CI/CD
- 29 test suites across 23 source modules

**But the application cannot be used in practice.** Specifically:

1. **No sample model** — `data/sample-models/` is empty. Opening the app shows a blank canvas.
2. **No service worker file** — `ServiceWorkerManager` manages nothing. Offline support is scaffolded but non-functional.
3. **No server-side WebSocket handler** — `RealtimeSync` client has no server to connect to.
4. **i18n built but not wired** — `I18nService` exists with EN/VI/FR translations, but all UI strings are hardcoded English.
5. **Jest coverage thresholds fail** — `npm run test:coverage` errors on 87.06% < 90% stmt threshold.
6. **No E2E tests for Phase 5-7 features** — BCF, collaboration, plugins, offline, security, monitoring untested in E2E.
7. **No v2.0.0 release** — `package.json` still says `1.0.0`.

This phase resolves every outstanding gap to make the codebase **genuinely testable, runnable, and deployable**.

---

## CURRENT STATE SUMMARY

### How to Run the Project Right Now

```bash
# Frontend only (works standalone)
cd /Users/huy/Desktop/civil
npm install
npm run dev                    # → http://localhost:3000 (opens empty viewer — no model)

# Optional: collaboration server
cd server && npm install
npm start                      # → http://localhost:4000 (Express + GitHub OAuth)

# To see a 3D model (requires IfcOpenShell):
brew install ifcopenshell      # macOS — installs ifcconvert
node scripts/convert-ifc.mjs path/to/model.ifc sample
npm run dev                    # → http://localhost:3000/?projectId=sample
```

### Test Commands

```bash
npm run test                   # 825 unit tests (29 suites) — ✅ ALL PASS
npm run test:coverage          # ❌ FAILS — 87.06% stmts < 90% threshold
npm run test:e2e               # 57 E2E tests (Chromium) — tests the viewer shell
npm run test:perf              # 2 Playwright+CDP benchmarks
npm run lint                   # 0 errors, 4 warnings
npm run typecheck              # ✅ clean
npm run build                  # ✅ 1,307 kB JS + 13.59 kB CSS
npm audit --production         # ✅ 0 vulnerabilities
```

### Low-Coverage Modules (Root Cause of Threshold Failure)

| Module | Stmts | Why Low |
|--------|-------|---------|
| `ServiceWorkerManager.ts` | 67.36% | Hard to test SW lifecycle in jsdom |
| `VisionProUI.ts` | 70.64% | Headset-specific code paths unreachable |
| `WebXRSession.ts` | 73.83% | XR API stubs don't cover real session flows |
| `OfflineStorage.ts` | 81.81% | IndexedDB edge cases |
| `main.ts` | 0% | Entry point — untested (bootstraps everything) |

---

## TASK BREAKDOWN

### Track A: Make It Runnable (2-3 dev-days)

> **Goal:** Any developer can clone the repo, run `npm run dev`, and see a 3D model.

#### A.1 — Bundle a Sample GLB Model
- **Why:** `data/sample-models/` is empty. The viewer opens blank. No one can verify it works.
- **Work:**
  1. Download a small open-license IFC model (e.g., IfcOpenShell Duplex A ~2 MB, or Schependomlaan ~3 MB from https://github.com/buildingSMART/Sample-Test-Files)
  2. Convert to GLB using `scripts/convert-ifc.mjs` (requires ifcconvert)
  3. If ifcconvert is unavailable, alternatively find a pre-converted GLB from the xeokit examples (MIT-licensed) and create a matching `metadata.json`
  4. Place in `data/sample/model.glb` + `data/sample/metadata.json`
  5. Update `.gitignore` to NOT ignore `data/sample/` (or add a download script)
  6. Update README.md "Getting Started" to reflect the zero-setup experience
- **AC:** `npm run dev` → browser opens → 3D model visible. No manual conversion needed.
- **Effort:** 0.5-1 day

#### A.2 — Wire i18n into the UI
- **Why:** `I18nService` exists with full EN/VI/FR translations (145 lines, 24 tests) but is not connected to any UI module. All UI strings are hardcoded English.
- **Work:**
  1. In `UIController`, import `I18nService` and call `i18n.t('key')` for all button labels, panel titles, search placeholder, toast messages
  2. Add a language switcher button or dropdown (3 options: EN/VI/FR)
  3. Store language preference in localStorage (I18nService already does this)
  4. Update `index.html` to use `data-i18n` attributes or dynamic text
  5. Verify all ~40 UI strings are externalized
- **AC:** Clicking the language switcher changes all visible UI text. Preference persists across reloads.
- **Effort:** 1-1.5 days

#### A.3 — Create Actual Service Worker File
- **Why:** `ServiceWorkerManager.ts` (256 lines) exists but there is no `sw.js` file. Offline support is vaporware.
- **Work:**
  1. Option A: Create `public/sw.js` manually (cache-first for assets, network-first for API)
  2. Option B: Install `vite-plugin-pwa` and configure in `vite.config.ts` (generates SW from config)
  3. Ensure the SW caches: `index.html`, JS/CSS chunks, model GLB files (from IndexedDB via OfflineStorage)
  4. Handle SW updates gracefully (show "Update available" toast)
  5. Test offline: disable network in DevTools → app should still render cached content
- **AC:** `navigator.serviceWorker.controller` is not null after first load. App works offline for cached models.
- **Effort:** 1 day

---

### Track B: Fix Test Infrastructure (2-3 dev-days)

> **Goal:** `npm run test:coverage` passes. All E2E tests green across all browsers.

#### B.1 — Fix Coverage Threshold Breach
- **Why:** `npm run test:coverage` FAILS — 87.06% stmts < 90% threshold.
- **Work:**
  - **Option 1 (preferred):** Add targeted tests to low-coverage modules:
    - `ServiceWorkerManager.ts`: Mock `navigator.serviceWorker`, test registration/update/unregister/sync flows
    - `VisionProUI.ts`: Mock headset detection (`navigator.xr`), test HUD rendering, radial menu positioning
    - `WebXRSession.ts`: Mock `XRSession`, test enter/exit session, pointer events
    - `OfflineStorage.ts`: Test IndexedDB error paths (quota exceeded, version conflicts)
    - `main.ts`: Test init function with fully mocked dependencies
  - **Option 2 (pragmatic):** Lower thresholds to realistic values (85% stmts, 85% lines) and add per-file overrides in `jest.config.js` for XR/SW modules
  - **Option 3 (compromise):** Add `coveragePathIgnorePatterns` for prototype modules (`xr/`, `offline/ServiceWorkerManager.ts`) and note them as experimental
- **AC:** `npm run test:coverage` exits with code 0. Coverage report generated without threshold errors.
- **Effort:** 1-2 days (Option 1) or 10 min (Options 2-3)

#### B.2 — Add E2E Tests for Phase 5-7 Features
- **Why:** The 57 E2E tests only cover Phase 1-4 features. BCF, storey navigation, utilities panel, chain stationing, collaboration, plugin system, security, monitoring are all untested in E2E.
- **Work:**
  Add to `tests/e2e/viewer.spec.ts` or create new spec files:
  1. **BCF export/import** — click Export BCF → file downloaded; import BCF → annotations created
  2. **Storey navigation** — storey panel renders; floor selection changes camera
  3. **Utilities panel** — panel renders; discipline metadata displayed
  4. **Plugin loading** — sample-iot plugin activatable (if plugin UI exists)
  5. **Security** — CSP meta tag present in DOM; security headers accessible
  6. **Error boundary** — inject a JS error → error overlay appears with dismiss button
  7. **Language switcher** — (after A.2) switch language → all text changes
  8. **Mobile responsive** — fix the 8 known mobile-chrome failures (sidebar not responsive at 412px viewport)
- **AC:** ≥75 E2E tests total. 0 failures on Chromium. Mobile Chrome failures reduced to ≤2.
- **Effort:** 2-3 days

#### B.3 — Fix Mobile Responsive Issues
- **Why:** 8 mobile-chrome E2E tests fail because the sidebar doesn't collapse at 412px viewport width.
- **Work:**
  1. Add CSS media queries for `max-width: 480px`: sidebar collapses to bottom drawer or hamburger menu
  2. Toolbar wraps or becomes horizontal scrollable
  3. Properties panel becomes a bottom sheet
  4. Re-run mobile-chrome E2E tests
- **AC:** All mobile-chrome Playwright tests pass.
- **Effort:** 1 day

---

### Track C: Server Completeness (2-3 dev-days)

> **Goal:** Collaboration features actually work end-to-end.

#### C.1 — Add Server-Side WebSocket Handler
- **Why:** `RealtimeSync.ts` (541 lines) implements a full WebSocket client with auto-reconnect, presence, roles, and offline queue. But there is no server-side WebSocket handler. The client connects to nothing.
- **Work:**
  1. Create `server/ws/WebSocketServer.ts` — uses `ws` package
  2. Implement message types: `annotation-create`, `annotation-update`, `annotation-delete`, `presence-join`, `presence-leave`, `cursor-move`
  3. Room-based: each `projectId` is a room
  4. Broadcast to all clients in room except sender
  5. Role-based message filtering (viewers can't send mutations)
  6. Wire into `server/index.ts` via `server.on('upgrade', ...)`
  7. Add unit tests for broadcast, room management, role filtering
- **AC:** Two browser tabs connected to same project see each other's annotation changes in real-time.
- **Effort:** 2-3 days

#### C.2 — Add Server Integration Tests
- **Why:** `server/index.ts` (356 lines) has 0 test coverage. The health check, authentication flow, annotation CRUD, and rate limiting are all untested.
- **Work:**
  1. Install `supertest` as dev dependency
  2. Create `tests/unit/ServerIntegration.test.ts` (or `tests/integration/`)
  3. Test: health check returns 200 + expected shape, CORS headers present, rate limiting rejects after limit, annotation CRUD (create/read/update), auth flow (mock GitHub OAuth), input validation rejects XSS
- **AC:** ≥20 integration tests covering all routes.
- **Effort:** 1 day

---

### Track D: Release & Deploy (1-2 dev-days)

> **Goal:** v2.0.0 released. Demo site accessible. Docker image available.

#### D.1 — Cut v2.0.0 Release
- **Work:**
  1. Resolve A.1 (sample model) first so the demo site isn't blank
  2. Update `package.json` version to `2.0.0`
  3. Run `npm run release` to generate CHANGELOG entry + git tag
  4. Push tag → triggers `.github/workflows/release.yml`
  5. Verify: GitHub Release created with artifacts, Docker image pushed to `ghcr.io/itsnothuy/civil:2.0.0`
- **AC:** `v2.0.0` tag exists. GitHub Release with build artifacts. Docker image pullable.
- **Effort:** 0.5 days

#### D.2 — Deploy Demo Site
- **Work:**
  1. Enable GitHub Pages in repo Settings (if not already)
  2. Verify `.github/workflows/deploy.yml` runs on push to main
  3. Ensure the Vite `base` config is correct for `https://itsnothuy.github.io/civil/`
  4. Verify the sample model (from A.1) is included in the build output
  5. Test the demo site in a real browser
- **AC:** `https://itsnothuy.github.io/civil/` loads and shows a 3D model.
- **Effort:** 0.5 days

#### D.3 — Fix SECURITY.md and CODE_OF_CONDUCT.md
- **Work:**
  1. Replace `security@[your-domain]` in SECURITY.md with a real contact (e.g., a GitHub security advisory link or maintainer email)
  2. Add enforcement contact to CODE_OF_CONDUCT.md
- **AC:** No placeholder text remains in community docs.
- **Effort:** 15 minutes

---

## EXECUTION ORDER & DEPENDENCIES

```
A.1 (sample model) ──────────────────────────┐
A.2 (wire i18n)                               │
A.3 (service worker) ─── B.2 (E2E tests) ────┼── D.1 (v2.0.0 release)
B.1 (fix coverage)                            │      │
B.3 (mobile responsive) ─ B.2 (E2E tests)    │      └── D.2 (demo site)
C.1 (WS server) ───────── C.2 (server tests) │
D.3 (fix docs) ──────────────────────────────→┘
```

**Recommended execution order:**
1. **A.1** — Get a sample model bundled (unblocks D.1, D.2, and visual testing)
2. **B.1** — Fix coverage thresholds (unblocks CI passing)
3. **A.2** — Wire i18n into UI
4. **A.3** — Create service worker file
5. **B.3** — Fix mobile responsive
6. **C.1** — Server WebSocket handler
7. **B.2** — E2E tests for Phase 5-7 features
8. **C.2** — Server integration tests
9. **D.3** — Fix docs
10. **D.1** — v2.0.0 release
11. **D.2** — Deploy demo site

**Parallelizable:**
- A.1 + B.1 + D.3 (independent)
- A.2 + A.3 + B.3 (independent)
- C.1 + B.2 (independent)

---

## HOW TO TEST THE FULL APPLICATION

### Manual Testing Checklist (Post-Phase 8)

**Prerequisites:**
```bash
npm install
npm run dev        # http://localhost:3000
```

**Core Viewer:**
- [ ] 3D model loads automatically (sample model visible)
- [ ] Orbit (left-drag), pan (middle-drag), zoom (scroll) work
- [ ] Click an object → highlighted + properties panel shows metadata
- [ ] Tab key cycles through objects
- [ ] Navigation cube in bottom-right corner works

**Modes:**
- [ ] Click "2D" → top-down plan view (no orbit, pan/zoom only)
- [ ] Click "3D" → perspective view with orbit restored
- [ ] Press `X` → toggles X-ray transparency on all objects

**Measurement:**
- [ ] Click "Measure" → click two points → distance label appears
- [ ] Click "Path" → click multiple points → cumulative distance
- [ ] `Ctrl+Z` / `Cmd+Z` → undoes last path point
- [ ] Metric/imperial toggle in measurement panel

**Annotations:**
- [ ] Click "Annotate" → click surface → annotation form appears
- [ ] Fill comment + severity → 📌 marker appears in 3D
- [ ] Click marker → label toggles visibility
- [ ] Export → JSON file downloads
- [ ] Import → JSON file → annotations appear

**Section Planes:**
- [ ] Click "Section" → plane cuts through model
- [ ] Add up to 6 planes (7th attempt shows max reached)
- [ ] Remove individual planes via chips in sidebar

**Filtering:**
- [ ] Filter panel shows discipline groups (Structural, Architectural, etc.)
- [ ] Uncheck a discipline → those objects hide
- [ ] X-ray toggle → hidden objects shown as transparent
- [ ] Show All / Hide All quick buttons work

**Accessibility:**
- [ ] `H` → toggles high-contrast mode
- [ ] `F` → focuses search input
- [ ] `?` → shows keyboard shortcuts overlay
- [ ] Skip-to-content link visible on Tab from page top
- [ ] All buttons have `aria-label` attributes

**Advanced (if implemented in Phase 8):**
- [ ] Language switcher changes all UI text (EN/VI/FR)
- [ ] Offline: disable network → app still renders cached model
- [ ] Two browser tabs on same project → annotation sync (requires server)

### Automated Testing

```bash
# Unit tests (should all pass, including coverage)
npm run test:coverage

# E2E tests (all browsers)
npm run test:e2e

# Performance benchmarks
npm run test:perf

# Full CI-equivalent check
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build

# Security audit
npm audit --production

# Server (if running)
curl http://localhost:4000/api/health
```

---

## ACCEPTANCE CRITERIA FOR PHASE 8 COMPLETION

| # | Criterion | Target |
|---|-----------|--------|
| 1 | `npm run dev` shows a 3D model without manual steps | Sample GLB bundled |
| 2 | `npm run test:coverage` exits 0 | ≥90% stmts or thresholds adjusted |
| 3 | E2E tests ≥75 total, 0 failures Chromium | Phase 5-7 features covered |
| 4 | Mobile Chrome E2E ≤2 failures | Responsive CSS fixed |
| 5 | i18n wired into UI with language switcher | EN/VI/FR all functional |
| 6 | Service worker file exists and caches assets | Offline works for cached content |
| 7 | Server WebSocket handler exists | Two-tab annotation sync works |
| 8 | Server integration tests ≥20 | All routes tested |
| 9 | v2.0.0 tagged and released | GitHub Release + Docker image |
| 10 | Demo site accessible with 3D model | `itsnothuy.github.io/civil/` works |
| 11 | No placeholder text in community docs | SECURITY.md email fixed |
| 12 | `npm audit --production` shows 0 vulnerabilities | Same as current |

---

## ESTIMATED EFFORT

| Track | Scope | Dev-Days |
|-------|-------|----------|
| A | Make It Runnable (model, i18n, SW) | 2.5-3.5 |
| B | Fix Test Infrastructure (coverage, E2E, mobile) | 3-5 |
| C | Server Completeness (WS, integration tests) | 3-4 |
| D | Release & Deploy (v2.0.0, demo, docs) | 1-2 |
| **Total** | | **9.5-14.5 dev-days** |

With parallelization (2 devs or aggressive batching): **5-8 dev-days**.

---

## AFTER PHASE 8: FUTURE ROADMAP

Once Phase 8 is complete, the project is genuinely production-ready. Future work would be:

1. **Real-world model testing** — Load large civil models (bridges, tunnels, highways) and profile performance
2. **User onboarding** — Interactive tutorial overlay for first-time users
3. **Model comparison** — Side-by-side or overlay comparison of model versions
4. **4D scheduling** — Link model objects to construction schedule timeline
5. **Cost estimation** — Quantity takeoff from model + unit cost database
6. **Clash detection** — Automated spatial conflict detection between disciplines
7. **AR field overlay** — Mobile AR to overlay BIM model on real-world construction site
8. **Enterprise SSO** — SAML/OIDC authentication for corporate deployments
9. **Multi-model loading** — Federated models from multiple disciplines
10. **Cloud-native backend** — Replace in-memory stores with PostgreSQL/Redis for scalability

---

## EXECUTION INSTRUCTIONS

**To start Phase 8, tell Claude:**

> Execute Phase 8 from `docs/prompts/PROMPT-phase-8-integration-testing-production.md`. Start with Track A (Make It Runnable). All Phases 1-7 are complete and validated.

**To execute a single track:**

> Execute Track B (Fix Test Infrastructure) from the Phase 8 prompt. Focus on B.1 (coverage thresholds) first.

**To execute a single task:**

> Execute Task A.1 (Bundle a Sample GLB Model) from the Phase 8 prompt.

---

*This prompt bridges the final gap between "all features coded" and "production-ready product." The codebase is architecturally complete — it needs integration, polish, and a sample model to become usable.*
