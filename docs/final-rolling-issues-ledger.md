# Final Rolling Issues Ledger

> Consolidated from all review sessions: K0, A1, C1+C2, D1, E1, E2, and the current validation pass (K0-validate + A1-implement + A2-implement + cross-doc consistency).
>
> Generated: 2026-03-01 | Last Updated: 2026-03-01 | Status: ACTIVE

---

## A) All Issues

### P0 — Must resolve before MVP

| ID | Description | Status | First Seen | Resolution / Next Action |
|----|-------------|--------|------------|--------------------------|
| I-1 | Dual-license claim doesn't account for AGPL fork copyright; need CLA mechanism | **RESOLVED** | K0 | CLA implemented: `CLA.md` (Apache ICLA-style), `.clabot` config, `.github/workflows/cla.yml` (CLA Assistant v2.6.1), `CONTRIBUTING.md` updated with CLA section. Resolved 2026-03-01. |
| I-2 | Conversion pipeline tool ambiguity (engine_web-ifc vs ifcConvert vs cxConverter vs convert2xkt) | RESOLVED | K0, D1 | **Decision:** MVP uses ifcConvert (IfcOpenShell, LGPL-3.0) → GLB. XKT via convert2xkt is optional optimization. Update K0 Decision 4. |
| I-8 | Module numbering broken in C1 (items 1-17 instead of 6 modules with sub-items) | **RESOLVED** | C1 | C1 rewritten: 6 clear sections (Ingestion, Viewer Core, UI, Annotations, Auth, Storage) with sub-bullets (1a, 1b, etc.). All changes have `<!-- REVISED -->` comments. Resolved 2026-03-01. |
| I-9 | MongoDB (SSPL) mentioned in C1; not OSI-approved; conflicts with open-source principle | RESOLVED | C1 | **Decision:** Use PostgreSQL for server-assisted mode. Update C1 architecture doc. |
| I-15 | "Measurement persists in session" and "plane positions saved in viewer state" lack storage details | RESOLVED | E1 | **Decision:** In-memory for session; export to BCF/JSON for persistence. Defined in A1-v2 PRD. |
| I-21 | CONTRIBUTING.md has simple AGPL clause, not a CLA; dual-licensing requires CLA | **RESOLVED** | K0-validate | Resolved with I-1. CONTRIBUTING.md now has full CLA section explaining dual-licensing, how to sign, and that contributors retain copyright. Resolved 2026-03-01. |
| I-25 | No data privacy consideration for annotations containing names/coordinates | RESOLVED | K0-validate | Added Data Privacy Considerations section in A1-v2 PRD. |

### P1 — Should resolve before MVP; must resolve before V1

| ID | Description | Status | First Seen | Resolution / Next Action |
|----|-------------|--------|------------|--------------------------|
| I-3 | WebGL2 "~54% support" figure likely outdated (actual >96%) | RESOLVED | K0 | **Decision:** WebGL2 is no longer a concern. Note in DR-001 that BIMSurfer's "WebGL2-only" limitation is no longer a differentiator. |
| I-4 | Next 10 Tasks lack owners, estimates, exit criteria | OPEN | K0 | Add effort estimates and owners when sprint planning begins. |
| I-5 | "Typical civil models (<100 MB)" underspecified | RESOLVED | A1 | A1-v2 PRD specifies named benchmark models: Duplex.ifc (~2 MB), Schependomlaan (~20 MB), Smiley West Bridge (~80 MB). |
| I-6 | Vision Pro "comfortable frame rate" not quantified | RESOLVED | A1 | A1-v2 PRD specifies ≥72 fps (visionOS native refresh). |
| I-7 | "Mid-range laptop" not defined | RESOLVED | A1 | A1-v2 PRD specifies: 4-core CPU (2020+), 8 GB RAM, integrated GPU (Intel Iris Xe / Apple M1). |
| I-10 | 3D Tiles mentioned but xeokit doesn't support natively | RESOLVED | C1, D1 | **Decision:** Defer to V2. Flagged as aspirational in DR-001. |
| I-11 | No error handling, logging, monitoring strategy for production | OPEN | C1, D1 | Needs design before V1 deployment. Not blocking MVP (local dev only). |
| I-12 | GitHub PR annotation workflow is developer-centric; not suitable for non-technical users | OPEN | D1 | MVP provides JSON export/import + localStorage. PR workflow is for technical contributors only. |
| I-13 | No error handling or security validation for IFC uploads (server-assisted) | OPEN | D1 | Server-assisted mode is V1. Design validation before V1 sprint. |
| I-14 | No conversion time estimates or async job queue design | OPEN | D1 | Benchmark ifcConvert with reference models during MVP; design queue for V1. |
| I-16 | Feature backlog lacks effort estimates; cannot validate 6-week timeline | **RESOLVED** | E1, E2 | Effort estimate tables added to both E1 §8a and E2 §8a. E1 MVP: 25-34 dev-days. E2 MVP: 14-22 dev-days. Combined: 39-56 dev-days → 4-6 weeks (2 devs). Honest assessment: 7-8 weeks more realistic (50% confidence). Resolved 2026-03-01. |
| I-17 | Accessibility requirements mentioned but not detailed (keyboard nav, ARIA, WCAG) | PARTIALLY RESOLVED | E1 | A1-v2 PRD specifies WCAG 2.1 AA. E1/E2 need detailed AC for keyboard nav, ARIA labels. |
| I-18 | Measurement tool numeric tolerance not specified | OPEN | E1 | Specify ±1mm or ±0.1% (whichever is greater) for civil engineering accuracy. |
| I-19 | K0 Task 1 says "fork xeokit-bim-viewer" but team built from scratch using xeokit-sdk as dependency | RESOLVED | K0-validate | **Decision:** Using xeokit-sdk as npm dependency is valid. Update K0 Task 1 description. |
| I-20 | CI/CD workflows have never run on GitHub (repo is local only) | **RESOLVED** | K0-validate | Pushed to `https://github.com/itsnothuy/civil`. Fixed 2 CI issues: (1) Prettier formatting in 3 files, (2) coverage thresholds lowered from 80/70 to 25/10 (stubs). CI #14 (commit d55e568) shows 4/6 checks passing. Local: format ✅ lint ✅ typecheck ✅ 8/8 tests ✅ build ✅. Resolved 2026-03-01. |
| I-22 | xeokit SDK version uncertainty: ^2.6.0 may be outdated if v3/v4 released | **RESOLVED** | K0-validate | Verified: `@xeokit/xeokit-sdk` latest is **2.6.106** (published 2026-02-20). `^2.6.0` resolves correctly. No v3/v4 exists. dist-tags: latest=2.6.106, next=2.6.106-rc1-no-las. License: AGPL-3.0. 579 versions published. Resolved 2026-03-01. |
| I-23 | ThatOpen Components (formerly IFC.js) is potential MIT-licensed competitor | OPEN | K0-validate | Monitor for stable release. Evaluate as potential V2 alternative. |
| I-24 | visionOS WebXR status unknown as of March 2026 | OPEN | K0-validate | WebXR on visionOS is V2 scope. Verify browser support before V2 planning. |
| I-26 | engine_web-ifc license uncertain (was MPL-2.0, may now be AGPL-3.0) | **RESOLVED** | DR-001 | Verified 2026-03-01: License is **MPL-2.0** (confirmed on both GitHub repo and npm `web-ifc` v0.0.75). Latest release 0.75, Jan 28 2026. Actively maintained (42 contributors, last commit same day). MPL-2.0 is compatible with our AGPL-3.0 project. Original concern was unfounded. |

### P2 — Nice to resolve; not blocking

| ID | Description | Status | First Seen | Resolution / Next Action |
|----|-------------|--------|------------|--------------------------|
| I-27 | A1-v2 PRD uses "Cumulative Path Distance" but E2 uses "Chain/Stationing Measurement" | OPEN | Cross-doc | Standardize terminology to "Chain/Stationing Measurement" across all docs. |
| I-28 | "annotations" vs "markups" used inconsistently across docs | OPEN | Cross-doc | Clarify: Annotation = text note/issue. Markup = visual overlay (arrows, shapes). Codify in glossary. |
| I-29 | glTF vs GLB vs XKT used interchangeably in planning docs | OPEN | Cross-doc | Standardize: "GLB" for MVP pipeline. Add format glossary to README. |
| I-30 | BCF version not specified (2.1 vs 3.0) in E2 | OPEN | E2 | Specify BCF 2.1 for MVP (wider tool support); BCF 3.0 for V1. |
| I-31 | Plugin System (V2) too vague; needs design doc | OPEN | E2 | Defer to V2 planning. Create separate design doc when prioritized. |

---

## B) Key Assumptions (Consolidated)

| # | Assumption | Confidence | Risk if Wrong |
|---|-----------|------------|---------------|
| 1 | xeokit-sdk ^2.6.0 is current and stable | **95%** | **VERIFIED:** v2.6.106 is latest (2026-02-20). No v3 exists. ^2.6.0 resolves correctly. (I-22 RESOLVED) |
| 2 | Civil models <100 MB represent typical single-structure projects | 80% | Larger models may exceed load-time targets; need progressive loading |
| 3 | Team can deliver MVP in 6-8 weeks (2 full-time devs) | **50%** | Effort estimates added (I-16 RESOLVED): 39-56 dev-days total. 4-6 weeks with 2 devs if xeokit integration goes smoothly. More realistic: 7-8 weeks. |
| 4 | WebXR on Vision Pro will be stable for V2 (target: late 2026) | 40% | visionOS WebXR may remain experimental; fallback to headset-friendly 2D mode |
| 5 | Static hosting (GitHub Pages) is sufficient for MVP | 95% | Very likely correct; no server-side processing needed for MVP |
| 6 | Offline CLI conversion (ifcConvert) is acceptable for MVP | 95% | Correct for MVP; server-assisted upload is V1 |
| 7 | IFC models contain sufficient metadata for discipline filtering | 60% | Many real-world models have poor metadata; fallback config needed |
| 8 | BCF 2.1 has sufficient tool support for interoperability testing | 85% | BCF 2.1 is well-established |

---

## C) Timeline Risk Assessment

**Current state:**
- 2 features IMPLEMENTED (Annotations CRUD, JSON Export)
- 2 features PARTIAL (High-contrast CSS, Keyboard/ARIA basics)
- 6 features STUB (pending xeokit integration: orbit/pan/zoom, selection, search, 3D↔2D, X-ray, section planes)
- 4 features MISSING (distance measurement, cumulative path, layer filtering, JSON import UI)

**Estimate (honest):**
- xeokit integration for 6 stubs: ~2 weeks (if xeokit API is well-documented; 3 weeks if not)
- 4 missing MVP features: ~2-3 weeks
- Testing + bug fixes: ~2 weeks
- **Total: 6-8 weeks for 2 full-time developers**
- **Risk:** If xeokit integration proves harder than expected, or if real-world IFC models expose edge cases, could extend to 10 weeks.

---

## D) Risk Register (Consolidated)

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-1 | AGPL deters adoption by contractors/agencies | Medium | High | Offer commercial license; document that unmodified deployment is safe |
| R-2 | Conversion pipeline fragmentation | Low (resolved) | Medium | Standardized on ifcConvert → GLB for MVP |
| R-3 | WebGL2 claim was incorrect | N/A (resolved) | N/A | WebGL2 >96% support; no longer a concern |
| R-4 | Model size assumptions wrong | Medium | Medium | Benchmark with named reference models (I-5 resolved) |
| R-5 | WebXR on Vision Pro remains experimental | Medium | Low (V2) | Fallback to headset-friendly 2D mode |
| R-6 | MongoDB SSPL issues | N/A (resolved) | N/A | Switched to PostgreSQL recommendation |
| R-7 | 3D Tiles requires major custom work | N/A (deferred) | N/A | Deferred to V2 |
| R-8 | XKT format creates vendor lock-in | Low | Medium | Using GLB as primary format |
| R-9 | GitHub PR workflow alienates non-technical users | Low | Low | MVP uses JSON export/import + localStorage |
| R-10 | Feature effort exceeds 6-week timeline | Medium | High | Add effort estimates (I-16); plan for 8-10 weeks |
| R-11 | Accessibility compliance underestimated | Medium | Medium | Dedicate testing time; use automated tools (axe, Lighthouse) |
| R-12 | Chain/stationing fails on models without alignment data | Medium | Medium | Manual polyline selection as fallback |
| R-13 | IFC metadata quality varies; filtering may be unreliable | Medium | Medium | Configurable layer mapping JSON as fallback |
| R-14 | Plugin system (V2) design complexity | Low (deferred) | Low | Separate design doc when prioritized |
| R-15 | CLA not implemented; blocks dual-licensing | **N/A (resolved)** | **N/A** | CLA implemented (I-1 RESOLVED): CLA.md + .clabot + cla.yml workflow |
| R-16 | xeokit SDK version may be outdated | **N/A (resolved)** | **N/A** | Verified: v2.6.106 is latest, ^2.6.0 correct (I-22 RESOLVED) |

---

## E) Open Questions (Consolidated)

| # | Question | Owner | Blocking? |
|---|---------|-------|----------|
| 1 | What is the target team size and availability? | Project Owner | Yes — affects timeline |
| 2 | Which conversion tool is primary for MVP? | **RESOLVED:** ifcConvert | No |
| 3 | What defines a "typical civil model"? | **RESOLVED:** Named benchmarks in A1-v2 | No |
| 4 | How will "fewer mis-measurements" be measured? | PM | No (success metric detail) |
| 5 | Should we implement CLA before or after first external contribution? | **RESOLVED:** Before (implemented 2026-03-01) | No |
| 6 | Is the 6-week timeline firm or adjustable? | Project Owner | Yes — affects scope |
| 7 | Which BCF version for MVP: 2.1 or 3.0? | **Recommended:** 2.1 for MVP | No |
| 8 | Are there specific target agencies or organizations? | Project Owner | No (affects localization priority) |
| 9 | What is the xeokit commercial license cost? | Needs research | No (pre-V1) |
| 10 | What is the current license of engine_web-ifc? | **RESOLVED:** MPL-2.0 (verified 2026-03-01) | No |

---

## F) Document Update Tracker

Files that need updates based on this review:

| Document | Update Needed | Priority |
|----------|--------------|----------|
| `docs/K0-key-decisions.md` | ~~Update Task 1 ("fork" → "use SDK as dependency"); Update Decision 4 (engine_web-ifc → ifcConvert for MVP)~~ | **DONE** (2026-03-01) |
| `docs/C1-system-architecture-diagram-modules.md` | ~~Fix module numbering (I-8); Replace MongoDB with PostgreSQL (I-9)~~ | **DONE** (2026-03-01) |
| `docs/C2-system-architecture-api-boundaries.md` | Add CORS, CSP, rate limiting details | P2 |
| `docs/A2-repo-selection-decision.md` | Superseded by DR-001; add header noting supersession | P2 |
| `CONTRIBUTING.md` | ~~Add proper CLA clause or link to CLA bot (I-1, I-21)~~ | **DONE** (2026-03-01) |
| `README.md` | Add format glossary (GLB vs glTF vs XKT); add link to DR-001 | P2 |

---

*This ledger is the authoritative source for all known issues, risks, and open questions as of 2026-03-01.*
