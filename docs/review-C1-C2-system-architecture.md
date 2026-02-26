# Chunk C1+C2 Review: System Architecture

## 1) Chunk Summary
- **High-level architecture:** Client (browser/Vision Pro) → Web App → 5 modules (Model Loader, Viewer Core, UI Layer, Annotations, Auth, Storage).
- **Two hosting options:** Static (GitHub Pages/S3) or Server-assisted (Node.js backend).
- **Modules:** Describes 6 modules with sub-components:
  1. Model Ingestion & Conversion (IFC parser, cache)
  2. Viewer Core (xeokit-based, 3D/2D, API)
  3. UI Layer (responsive, accessible)
  4. Annotations/Issues (BCF schema, local/remote storage)
  5. Auth (OAuth, optional)
  6. Storage (S3/GitHub Pages for static; MongoDB for server-assisted)
- **API Boundaries:** Two modes—client-only (no API) vs client-server (REST/GraphQL with JWT auth).

## 2) Plan Validation Snapshot

**Verdict: MOSTLY SOUND**

- **(A) Feasibility:** The modular architecture is standard for web apps. Static hosting is simplest for MVP; server-assisted adds flexibility for large models and collab. Both are implementable.
- **(B) Production readiness:** The architecture includes caching, progressive loading, authentication, and rate limiting—appropriate production concerns. However, **no discussion of CDN, error handling, monitoring, or logging**.
- **(C) Licensing:** The architecture is neutral w.r.t. licensing, but the choice of backend (Node.js, MongoDB) introduces new dependencies. MongoDB uses SSPL (not OSI-approved open source), which may conflict with "open-source-first" goals. This should be flagged.
- **(D) XR realism:** The architecture doesn't explicitly address WebXR session management or XR-specific rendering paths. This is OK for a high-level diagram but will need detail in implementation.

**Blocking Flaws:**
- **BF-2:** Numbering error in the Modules section—items are numbered 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 but they represent only 6 modules. This is a formatting bug that hurts readability and suggests the section was auto-generated or poorly edited.
- **BF-3:** MongoDB (mentioned in Storage module) uses SSPL license, which is not OSI-approved and has copyleft-like restrictions for hosted services. This conflicts with the stated "open-source-first" principle and may deter contributors/adopters. Should specify "PostgreSQL, MySQL, or other OSI-approved DB" instead.

## 3) Accuracy & Verifiability Review

| Claim | Assessment |
|-------|-----------|
| "Use engine_web-ifc to parse IFC directly in the browser[7]" | **ACCURATE** — `web-ifc` is a WASM library for client-side IFC parsing. |
| "Store converted models in a data/ directory (static hosting)" | **REASONABLE** — Common pattern for static sites. |
| "Use 3D tiles for large models" | **TECHNICALLY COMPLEX** — 3D Tiles (OGC standard) requires tiling pipeline and compatible loader. xeokit doesn't natively support 3D Tiles; BIMSurfer v3 has partial support. This is aspirational unless custom integration is built. |
| "Issues follow the BCF schema" | **ACCURATE** — BCF (BIM Collaboration Format) is an open standard (buildingSMART). |
| "Use MongoDB for annotations" | **FEASIBLE BUT LICENSE ISSUE** — MongoDB is technically sound but SSPL-licensed (not OSI-approved). |
| "Use JWT for authentication and role-based access" | **STANDARD PRACTICE** — JWT is widely used for stateless auth. |

## 4) Engineering Feasibility & Architecture Review

**Strengths:**
- Modular separation (viewer core, UI, annotations, storage) is good for maintainability.
- Two hosting modes (static vs server-assisted) provide flexibility.
- Progressive loading and caching are mentioned—important for performance.

**Weaknesses & Missing Decisions:**
- **Module numbering bug (BF-2):** The numbered list is broken. Items 1-17 should be reorganized into 6 clear module sections with sub-bullets. This is a documentation quality issue but harms clarity.
- **Conversion pipeline ambiguity persists (I-2 from K0):** The plan says "Use CLI or server-side pipeline to convert IFC to glTF/XKT" and "use engine_web-ifc to parse IFC directly in the browser." These are three different approaches:
  1. CLI (offline, e.g., ifcConvert, cxConverter)
  2. Server-side (Node.js service calling CLI or using `web-ifc`)
  3. Client-side (browser WASM using `web-ifc`)
  
  The plan doesn't specify which will be used when. For MVP, client-side conversion of large models is impractical (memory, CPU). The static hosting option requires offline CLI conversion. The server-assisted option allows server-side conversion. **Decision needed: MVP will use offline CLI; V1 may add server-side; client-side is experimental only.**

- **3D Tiles integration:** Mentioned as "use 3D tiles for large models" but xeokit doesn't natively support 3D Tiles. This requires either:
  - A custom loader (significant dev work), or
  - Switching to BIMSurfer v3 (which has partial 3D Tiles support), or
  - Using Cesium/Three.js with CesiumJS 3D Tiles loader (architecture change).
  
  **This is a V2/future feature at best; should be flagged as aspirational, not assumed.**

- **No error handling or observability:** No mention of error boundaries, logging (client/server), monitoring, or alerting. For production readiness, these are essential.

- **MongoDB SSPL issue (BF-3):** SSPL is controversial and not OSI-approved. For an open-source project targeting public agencies, using SSPL-licensed software may raise concerns. Alternatives: PostgreSQL (PostgreSQL License, OSI-approved), MySQL (GPL/Commercial dual-license), or document stores like CouchDB (Apache 2.0).

- **No versioning strategy for API or data schema:** The plan mentions "JSON schema will be defined" for annotations but doesn't address versioning. What happens when the schema changes? Migration strategy?

- **No discussion of CORS, CSP, or browser security policies** for client-server communication. Important for production.

## 5) License / Compliance Review

**NOT LEGAL ADVICE.**

- **MongoDB SSPL (P0 issue):** The Server-Side Public License (SSPL) is a source-available license with copyleft-like obligations. If you offer MongoDB as a service, SSPL requires you to release the source code of the "service" (including management/monitoring/backup software). MongoDB Inc. changed from AGPL to SSPL in 2018, and SSPL is not OSI-approved. For an open-source project, this is a risky dependency. **Recommendation: Use PostgreSQL, MySQL, or CouchDB instead.**
  
- **OAuth providers (GitHub, Google):** Both are acceptable for authentication. GitHub is particularly well-aligned with open-source workflows (annotations as GitHub issues/PRs). No licensing concerns.

- **AWS S3/CloudFront:** Proprietary cloud services. For a project emphasizing open source, should mention self-hosted alternatives (MinIO for S3-compatible storage, nginx for static hosting). Otherwise, agencies with data residency requirements may be blocked.

## 6) XR / Vision Pro Review

- The architecture diagram doesn't explicitly show how WebXR sessions are managed or how the viewer core integrates with XRWebGLLayer.
- For static hosting, XR works fine (client-side only).
- For server-assisted, no special considerations needed unless streaming models during XR session (bandwidth/latency sensitive).
- **No XR-specific blocking issues in this chunk**, but implementation details are deferred (appropriately).

## 7) Quality & Production Readiness Review

**Strengths:**
- Clear separation of concerns (modules).
- Two deployment models (static vs server-assisted) provide flexibility.
- Caching and progressive loading mentioned (important for perf).

**Weaknesses:**
- **Module numbering bug** (BF-2) severely hurts readability. Needs immediate fix.
- **No error handling, logging, monitoring, or alerting** mentioned. For production, need:
  - Client-side error boundaries (React/Vue)
  - Server-side structured logging (e.g., Winston, Pino)
  - Monitoring (e.g., Sentry, Prometheus)
  - Health checks and alerts
- **No CDN or asset optimization strategy** beyond "S3/CloudFront." Should mention:
  - Compression (gzip, Brotli)
  - HTTP/2 or HTTP/3 for multiplexing
  - Cache-Control headers
- **No discussion of rate limiting specifics** (mentioned in text but no details: per-IP? per-user? token bucket? leaky bucket?).
- **No data backup or disaster recovery plan** for server-assisted mode.

## 8) Proposed Edits

| Priority | Location | Edit |
|----------|----------|------|
| **P0** | Modules section (all) | Fix numbering: Reorganize into 6 clear sections (1-6) with sub-bullets (1.a, 1.b, etc.) or no numbers for sub-items. Current numbering (1, 2, 3… 17) is broken and confusing. |
| **P0** | Module 1 (Model Ingestion), "use engine_web-ifc… for large models, server conversion…" | Add decision: "MVP uses offline CLI conversion (ifcConvert or cxConverter). V1 may add server-side conversion. Client-side web-ifc is experimental only (small models <10 MB)." |
| **P0** | Storage module, "MongoDB for annotations" | Replace with: "PostgreSQL, MySQL, or CouchDB for annotations (avoid MongoDB SSPL license issues)." |
| **P1** | Modules section, "use 3D tiles for large models" | Add caveat: "3D Tiles support requires custom integration (xeokit does not support natively). Consider for V2 if large-model streaming is required." |
| **P1** | Hosting options + Modules | Add observability: "Include structured logging (client/server), error tracking (Sentry), and monitoring (health checks, uptime alerts)." |
| **P1** | Storage module, "AWS S3/CloudFront" | Add self-hosted alternatives: "For data residency requirements, support MinIO (S3-compatible) or nginx for static hosting." |
| **P2** | Annotations/Issues module, "JSON schema will be defined" | Add: "Schema versioning strategy and migration plan to be defined." |
| **P2** | API Boundaries, REST/GraphQL endpoints | Add: "Implement CORS policies, rate limiting (per-user token bucket), and CSP headers." |

## 9) Rolling Ledger (Updated)

**A) Cumulative Issues**

| ID | Severity | Description | Status | First Seen |
|----|----------|-------------|--------|------------|
| I-1 | P0 | Dual-license claim doesn't account for AGPL fork copyright | OPEN | K0 |
| I-2 | P0 | Conversion pipeline tool ambiguity (`web-ifc` vs cxConverter vs ifcConvert); when to use which? | OPEN | K0 |
| I-3 | P1 | WebGL2 "~54% support" figure likely outdated/incorrect | OPEN | K0 |
| I-4 | P1 | Next 10 Tasks lack owners, estimates, exit criteria | OPEN | K0 |
| I-5 | P1 | "Typical civil models (<100 MB)" underspecified; affects load time target feasibility | OPEN | A1 |
| I-6 | P1 | Vision Pro "comfortable frame rate" not quantified; should be ≥60 fps | OPEN | A1 |
| I-7 | P1 | "Mid-range laptop" not defined; affects testability of performance targets | OPEN | A1 |
| **I-8** | **P0** | **Module numbering is broken (1-17 instead of 6 modules with sub-items); hurts readability** | **OPEN** | **C1** |
| **I-9** | **P0** | **MongoDB (SSPL) not OSI-approved; conflicts with open-source-first principle** | **OPEN** | **C1** |
| **I-10** | **P1** | **3D Tiles mentioned but xeokit doesn't support natively; requires custom work or architecture change** | **OPEN** | **C1** |
| **I-11** | **P1** | **No error handling, logging, monitoring, or alerting strategy for production** | **OPEN** | **C1** |

**B) Key Assumptions**
- xeokit-bim-viewer fork provides most MVP viewer features out-of-box.
- Civil models <100 MB represent typical single-structure projects.
- Team can deliver MVP in 6 weeks (assumes 2-4 developers, full-time).
- WebXR on Vision Pro will be stable enough for V2.
- **Static hosting (GitHub Pages/S3) is sufficient for MVP**; server-assisted is optional for V1+.
- **Offline CLI conversion is acceptable for MVP**; real-time upload/convert is V1+.

**C) Open Questions**
- What defines a "typical civil model"?
- How will "fewer mis-measurements" be measured?
- What is the target team size and availability?
- **Which conversion tool is primary for MVP: ifcConvert, cxConverter, or xeokit's own tools?**
- **How will 3D Tiles be integrated if xeokit doesn't support it?**
- **What logging/monitoring tools will be used?**

**D) Risk Register**
- **R-1:** AGPL deters adoption by organizations that cannot open-source their deployments.
- **R-2:** Conversion pipeline fragmentation across multiple tools increases maintenance burden.
- **R-3:** WebGL2 claim, if incorrect, undermines the decision to deprioritize BIMSurfer.
- **R-4:** Underspecified model size assumptions may lead to performance target misses.
- **R-5:** WebXR on Vision Pro may remain experimental/unstable, forcing fallback to 2D mode.
- **R-6:** MongoDB SSPL may deter contributors or adopters concerned about licensing.
- **R-7:** 3D Tiles integration may require significant custom development or architecture change.
