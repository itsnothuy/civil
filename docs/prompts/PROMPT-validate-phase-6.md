# Validation Prompt — Phase 6: V2 Features

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Validate Phase 6 — Vision Pro/WebXR, real-time collaboration, plugin system, mobile offline, server pipeline  
> **Pre-requisite:** Phases 1-5 complete (V1 released as v1.0.0)  
> **Companion docs:** `completion-plan-2026-03-01.md`, execution prompt, Phase 1-5 validation reports

---

## Instructions

Execute all 7 steps. Output as `docs/reports/validation-report-phase6.md`.  
Same rules: cite evidence, run tests, grade 0-100, no euphemisms.

**Phase 6 special considerations:**
- This phase has the HIGHEST UNCERTAINTY (WebXR, real-time systems, plugin architecture)
- Some tasks may be intentionally descoped or marked as prototypes — document the scope decisions
- Security review is critical (real-time collaboration + plugin sandboxing + file uploads)

---

## Step 0 — Environment Verification

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
npm run test:coverage
npm run test:e2e
npm run test:perf
npm audit --production
git log --oneline -25
```

**Phase 6 entry conditions:**
- V1 (v1.0.0) tagged and released
- Coverage ≥80%
- All E2E passing
- Backend (from Phase 5.5) functional

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 6

| Planned File | Task | Expected | Actual | Notes |
|---|---|---|---|---|
| `src/xr/VisionProUI.ts` (or similar) | 6.1 | NEW | ? | Headset-friendly UI components |
| `src/xr/WebXRSession.ts` (or similar) | 6.2 | NEW | ? | WebXR immersive mode |
| `src/collaboration/RealtimeSync.ts` | 6.3 | NEW | ? | WebRTC/WebSocket client |
| `server/ws/` or `server/collaboration/` | 6.3 | NEW | ? | Server-side WebSocket handler |
| `src/plugins/PluginAPI.ts` | 6.4 | NEW | ? | Plugin interface + hooks |
| `src/plugins/PluginLoader.ts` | 6.4 | NEW | ? | Manifest parsing, sandboxing |
| `plugins/sample-iot/` | 6.4 | NEW | ? | Sample IoT sensor plugin |
| `src/offline/ServiceWorker.ts` | 6.5 | NEW OR `sw.js` | ? | Service Worker for caching |
| `src/offline/OfflineStorage.ts` | 6.5 | NEW | ? | IndexedDB wrapper |
| `server/pipeline/` | 6.6 | NEW | ? | IFC upload, conversion queue |
| `docker/` or `Dockerfile` | 6.6 | NEW | ? | Docker for ifcConvert |

### 1b. Architecture Review

Phase 6 introduces significant new architecture. Verify:

| Component | Documented? | Design Decision Recorded? | Notes |
|---|---|---|---|
| WebXR integration approach | ? | ? | Three.js bridge vs native xeokit? |
| Real-time protocol choice | ? | ? | WebRTC vs WebSocket vs SSE? |
| Plugin sandboxing strategy | ? | ? | iframe, Web Worker, or trust? |
| Offline storage budget | ? | ? | 50 MB, 500 MB, 1 GB? |
| IFC conversion service | ? | ? | ifcConvert, IfcOpenShell, other? |

---

## Step 2 — Task-by-Task AC Verification

### Task 6.1 — Vision Pro Headset-Friendly UI (F1 Track 1)

**AC (from completion plan):** Large buttons (>10mm), simplified HUD, gaze-based focus, pinch selection, radial menus. Test on Vision Pro Simulator.

| Criterion | Status | Evidence |
|---|---|---|
| `.headset-mode` class applied on Vision Pro detection | ? | |
| Touch targets ≥10mm (≥44px at standard density) | ? | |
| Simplified HUD layout (fewer elements visible) | ? | |
| Gaze-based focus highlighting | ? | |
| Pinch-to-select interaction | ? | |
| Radial menu for common actions | ? | |
| Tested on Vision Pro Simulator | ? | |
| Fallback for non-Vision Pro browsers (no broken UI) | ? | |

### Task 6.2 — WebXR Immersive Prototype (F1 Track 2)

**AC:** WebXR session in Safari. glTF model in XR. Transient-pointer mapped to selection. Comfort evaluation.

**Note:** This has HIGH UNCERTAINTY. It may be a prototype/proof-of-concept rather than production code.

| Criterion | Status | Evidence |
|---|---|---|
| WebXR session can be entered (immersive-vr or immersive-ar) | ? | |
| 3D model visible in XR space | ? | |
| Pointer input mapped to object selection | ? | |
| Exit XR cleanly returns to normal view | ? | |
| Feature detection: graceful fallback when WebXR unavailable | ? | |
| Comfort evaluation documented | ? | |
| Scope decision documented (prototype vs production) | ? | |

### Task 6.3 — Real-Time Collaboration

**AC:** WebRTC/WebSocket backend. Multi-user annotations. Role-based permissions. Last-write-wins.

| Criterion | Status | Evidence |
|---|---|---|
| WebSocket/WebRTC connection established between clients | ? | |
| Annotation changes sync in real-time to other users | ? | |
| User presence shown (who's connected) | ? | |
| Role-based permissions (viewer, editor, admin) | ? | |
| Last-write-wins conflict resolution | ? | |
| Disconnect/reconnect handled gracefully | ? | |
| Multi-user E2E test (2+ browser contexts) | ? | |
| Rate limiting on WebSocket messages | ? | |
| Works offline (queues changes for sync later) | ? | |

### Task 6.4 — Plugin System

**AC:** Plugin API defined. Hook system. Manifest format. Sandboxing. Sample plugin.

| Criterion | Status | Evidence |
|---|---|---|
| Plugin API interface defined and documented | ? | |
| Lifecycle hooks (init, activate, deactivate, destroy) | ? | |
| Plugin manifest format (JSON/YAML) with schema | ? | |
| Plugin registration mechanism | ? | |
| Sandboxing prevents plugin from accessing main app state directly | ? | |
| Sample IoT sensor plugin works end-to-end | ? | |
| Plugin can add UI elements | ? | |
| Plugin can react to viewer events (selection, camera move) | ? | |
| Bad/malicious plugin cannot crash the app | ? | |

### Task 6.5 — Mobile Offline Support

**AC:** Service Worker. IndexedDB. Background sync. Storage budget management.

| Criterion | Status | Evidence |
|---|---|---|
| Service Worker registered and caching app shell | ? | |
| App loads without network (after initial visit) | ? | |
| IndexedDB stores annotations for offline use | ? | |
| Background sync pushes offline changes when reconnected | ? | |
| Storage budget displayed to user | ? | |
| Storage cleanup when budget exceeded | ? | |
| Works on Mobile Chrome and Mobile Safari | ? | |

### Task 6.6 — Server-Assisted Pipeline

**AC:** IFC upload API. Conversion queue. Docker container. Object storage. CDN. File limits. Progress.

| Criterion | Status | Evidence |
|---|---|---|
| IFC upload endpoint accepts file | ? | |
| File size limit enforced (configurable) | ? | |
| Conversion job queued (not blocking) | ? | |
| Docker container runs ifcConvert | ? | |
| Conversion progress reported to client | ? | |
| Converted model stored (filesystem/S3/etc.) | ? | |
| CDN configured for model delivery | ? | |
| Error handling for corrupt IFC files | ? | |
| Upload validation (file type, size, schema) | ? | |

---

## Step 3 — Cross-Cutting Concerns

### 3a. Security (CRITICAL for Phase 6)

| Check | Status | Notes |
|---|---|---|
| WebSocket authentication (token-based) | ? | |
| Plugin sandboxing prevents XSS/data exfiltration | ? | |
| File upload validates content, not just extension | ? | |
| Docker container runs with minimal privileges | ? | |
| No credentials in Docker images | ? | |
| CORS permits only expected origins | ? | |
| Service Worker cache poisoning prevented | ? | |
| IndexedDB data encrypted at rest (if sensitive) | ? | |

### 3b. Performance
| Check | Status | Notes |
|---|---|---|
| WebSocket doesn't flood with messages | ? | Throttle/debounce? |
| Plugin lifecycle doesn't block main thread | ? | |
| Service Worker doesn't intercept performance-critical requests | ? | |
| Docker conversion completes within timeout | ? | |

### 3c. Graceful Degradation

| Feature | Without Backend | Without WebXR | Without Network |
|---|---|---|---|
| Core viewer | Must work | Must work | Must work (SW) |
| Annotations | localStorage | N/A | IndexedDB |
| Collaboration | Disabled | N/A | Queue + sync |
| Plugins | Must degrade | N/A | Depends on plugin |

---

## Step 4 — Test Coverage Audit

Coverage ≥80% must be maintained despite significant new code.

### New Module Coverage

| Module | Tests | Stmts | Notes |
|---|---|---|---|
| VisionProUI | ? | ? | |
| WebXRSession | ? | ? | May be hard to test without XR device |
| RealtimeSync | ? | ? | |
| PluginAPI | ? | ? | |
| PluginLoader | ? | ? | |
| ServiceWorker | ? | ? | Requires special test setup |
| OfflineStorage | ? | ? | |
| Server pipeline | ? | ? | Separate test suite? |

---

## Steps 5-7 — Standard Audit

Follow same format as Phase 4/5: execution prompt accuracy, dependency/security review, phase readiness assessment.

### 7a. V2 Quality Gates

| Gate | Status |
|---|---|
| All unit tests pass | ? |
| Coverage ≥80% maintained | ? |
| All E2E tests pass | ? |
| Security review completed | ? |
| WebXR tested on simulator | ? |
| Plugin sample works | ? |
| Offline mode tested | ? |
| Docker pipeline tested | ? |

### 7b. Grade

**Grade: ? (?%)**

---

## Prioritized Fix-List

| # | Severity | Category | Description | File(s) | Effort |
|---|---|---|---|---|---|
| ? | ? | ? | ? | ? | ? |
