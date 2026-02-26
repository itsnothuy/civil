<!-- FILE: docs/claude_plan_review.md -->
## Chunk E2 — Feature Backlog: Civil/Civic + Accessibility + Collab

### 1) Chunk Summary
- Defines 9 additional features across three categories:
  - **Civil/Civic Features (5):** Chain/Stationing Measurement (V1), Utility & Layer Filtering (MVP), Annotations/Markups (MVP), Issue Export/Import (MVP), Markup Collaboration (V1).
  - **Accessibility & Internationalization (3):** High-contrast mode (MVP), Keyboard Navigation (MVP), Localization (V1).
  - **Collaboration & Expansion (3):** Real-time Collaboration (V2), Plugin System (V2), Mobile Offline Support (V2).
- Each feature includes Priority, Description, Acceptance Criteria, and Test Approach.
- Most civil features are MVP; advanced collab and extensibility are V2.

### 2) Plan Validation Snapshot

**Verdict: MOSTLY SOUND**

- **(A) Feasibility:** Civil features (chain measurements, utilities filtering, annotations) are domain-specific and implementable. Accessibility features (high-contrast, keyboard nav) are standard. V2 features (real-time collab, plugins, offline sync) are ambitious but scoped appropriately as future work.
- **(B) Production readiness:** Test approaches are comprehensive (unit, integration, E2E, accessibility audits, round-trip tests). Acceptance criteria are measurable.
- **(C) Licensing:** No licensing issues. BCF is an open standard (buildingSMART). WebRTC/WebSocket (V2) use browser APIs (no licensing concerns).
- **(D) XR realism:** Not directly addressed in this chunk (deferred to F1/F2).

**Blocking Flaws:**
- **BF-4:** **Chain/Stationing Measurement (V1) description says "If alignment is not defined, approximate along connected segments"** but doesn't define what "alignment" means or how to detect it. IFC has `IfcAlignment` (IFC4+) but many civil models lack it. The fallback (approximate along polylines) is good but needs more detail: which polylines? How are they selected? Manual user selection or automatic detection? **This ambiguity blocks implementation.**

### 3) Accuracy & Verifiability Review

| Claim | Assessment |
|-------|-----------|
| "Measure cumulative distance along a path (roads, bridges)" | **CIVIL ENGINEERING STANDARD** — Chain/stationing is common for linear infrastructure. |
| "If alignment is not defined, approximate along connected segments" | **REASONABLE FALLBACK** but vague. IFC4+ has `IfcAlignment`; older models may use polylines or linear elements. Need to specify detection/selection logic. |
| "Export annotations as BCF or JSON" | **ACCURATE** — BCF is an open standard for BIM collaboration (buildingSMART). JSON export is common for custom workflows. |
| "Exported file opens in BCF viewer" (Issue Export/Import AC) | **TESTABLE** — Can validate against BCF-compatible tools (e.g., BIMcollab, Solibri). |
| "Meet WCAG 2.1 AA contrast ratios" (High-contrast mode) | **STANDARD REQUIREMENT** — WCAG 2.1 AA requires 4.5:1 contrast for normal text, 3:1 for large text. Measurable via automated tools (axe, Lighthouse). |
| "Multi-user sessions with WebRTC/WebSocket" (Real-time Collaboration V2) | **FEASIBLE** — WebRTC for peer-to-peer, WebSocket for server-mediated. Standard web tech. |
| "Plugin System" (V2) | **AMBITIOUS** — Requires defining plugin API, sandboxing, versioning, and documentation. This is a large feature. |

### 4) Engineering Feasibility & Architecture Review

**Strengths:**
- Civil features (chain measurement, utilities filtering, annotations) directly address the personas and use cases from A1.
- Accessibility features (high-contrast, keyboard nav) demonstrate commitment to inclusive design.
- V2 features (real-time collab, plugins, offline sync) are appropriately deferred; not blocking MVP.
- Test approaches include specialized tools (BCF validators, accessibility auditors).

**Weaknesses & Missing Decisions:**

- **Chain/Stationing Measurement (V1):**
  - **"If alignment is not defined, approximate along connected segments"** — How does the tool determine which segments to use? Options:
    1. User manually selects a polyline or series of connected elements.
    2. Tool auto-detects linear elements (e.g., `IfcCurveSegment`, road centerlines).
    3. Fallback to shortest path between two user-selected points.
  - **Decision needed:** "User selects a polyline or series of connected linear elements (manual selection). Auto-detection may be added in V1.1 if model metadata supports it."
  - **CSV/JSON export format:** What columns/fields? Suggested: `StationID, Distance (m), X, Y, Z, Element GUID`.

- **Utility & Layer Filtering (MVP):**
  - **"Filter by discipline (e.g., structural, mechanical, electrical, plumbing, utilities)"** — How is discipline determined? IFC property sets? `IfcObjectType`? Layer names? Not all IFC models have consistent discipline metadata.
  - **Decision needed:** "Use `Pset_Common.Category` or `ObjectType` if available; fallback to user-defined layer mapping (configurable JSON file)."
  - **"Below" mode makes ground/above layers semi-transparent** — Good UX! But what's the transparency value? 50%? User-adjustable? Should specify.

- **Annotations/Markups (MVP):**
  - **"Anchor persists relative to object"** — How? Store object GUID + local offset? What happens if object is deleted or moved (model update)? Need to define anchor invalidation strategy.
  - **"Categorize by severity/type"** — What are the types/severities? Suggested: Type (note, issue, question, info); Severity (low, medium, high, critical). Should be configurable.

- **Issue Export/Import (MVP):**
  - **"Exported file opens in BCF viewer"** — Good! But which BCF version? BCF 2.1 (2016) or BCF 3.0 (2019+)? Version matters for interoperability. **Recommendation: BCF 2.1 for MVP (wider tool support); BCF 3.0 for V1.**
  - **"Import existing issues into viewer; maintain viewpoint"** — BCF viewpoints include camera position, selected objects, and clipping planes. Does the import restore all of these? Needs explicit AC.

- **Markup Collaboration (V1):**
  - **"Two users see updates in real time"** — What's the latency target? <1 second? <5 seconds? Real-time implies <1s; should specify.
  - **"Merge conflicts resolved"** — How? Last-write-wins? Operational Transform (OT)? Conflict-free Replicated Data Type (CRDT)? This is complex. Should provide a simple strategy for V1 (e.g., "Last-write-wins with conflict notification; user manually resolves").
  - **"Offline edits sync once online"** — Requires a sync protocol and conflict detection. This overlaps with Mobile Offline Support (V2). Should clarify scope: "V1 supports real-time sync only; offline sync deferred to V2."

- **High-contrast mode (MVP):**
  - **AC is clear (WCAG 2.1 AA)**, but implementation details missing: CSS custom properties? Theme switcher? Persisted in localStorage?
  - **Test approach mentions "user testing with accessibility tools"** — Good, but which tools? NVDA (screen reader)? JAWS? VoiceOver (macOS/iOS)? Should specify.

- **Localization (V1):**
  - **"Support multiple languages (e.g., EN, VI, FR)"** — Why Vietnamese (VI)? Is there a specific target audience? Just checking assumptions.
  - **"Translation files loaded; language switch persists"** — What format? JSON? i18n library (e.g., i18next, vue-i18n)? Should specify tooling.

- **Plugin System (V2):**
  - **Description is vague:** "Allow external modules to extend viewer" — What can plugins do? Add UI panels? Inject rendering overlays? Hook into events (selection, annotation)?
  - **"Provide API and hook system"** — Need to define:
    - Plugin manifest schema (name, version, entry point)
    - Sandboxing (can plugins access DOM directly? Network?)
    - Lifecycle hooks (init, load, unload)
    - Versioning and compatibility (semver for API?)
  - **This is a major feature; should have its own PRD if prioritized.**

- **Mobile Offline Support (V2):**
  - **"Cache models and annotations for offline use"** — How much storage? IndexedDB has quotas (~50MB–1GB depending on browser). Large civil models may exceed this. Need to define storage budget and model size limits.
  - **"Background sync"** — Relies on Service Workers and Background Sync API (not universally supported, especially on iOS Safari). Should specify browser requirements and fallback.

### 5) License / Compliance Review

**NOT LEGAL ADVICE.**

- **BCF (BIM Collaboration Format):** Open standard by buildingSMART. No licensing issues. Implementations are typically open-source or proprietary but interoperable.
- **WebRTC/WebSocket:** Browser APIs; no licensing issues.
- **Plugin System (V2):** If plugins can load third-party code, need to consider:
  - Plugin licensing (can proprietary plugins be used with AGPL viewer?). AGPL allows this if the plugin boundary is clean (network API or process separation).
  - Security: Plugins could introduce malicious code. Need sandboxing and CSP enforcement.

### 6) XR / Vision Pro Review

- Not directly relevant to this chunk. XR-specific features are in F1/F2.
- However, **annotations anchored to objects** (E2) will be important for XR review workflows (inspector marks issues in immersive mode). The anchor persistence mechanism must work in XR (where object selection uses gaze+pinch).

### 7) Quality & Production Readiness Review

**Strengths:**
- Civil features directly address domain needs (chain measurements, utilities, annotations).
- Accessibility features (high-contrast, keyboard nav) show commitment to inclusive design.
- Test approaches include specialized validation (BCF schema, WCAG audits).
- Prioritization is clear (MVP, V1, V2).

**Weaknesses:**
- **Chain/Stationing Measurement** lacks detail on alignment detection/selection (BF-4).
- **Utility & Layer Filtering** lacks detail on how discipline is determined (property sets? user config?).
- **Annotations anchor persistence** lacks detail on invalidation strategy (what if object deleted?).
- **BCF version not specified** (2.1 vs 3.0); affects interoperability.
- **Markup Collaboration conflict resolution** is underspecified (last-write-wins? OT? CRDT?).
- **Plugin System (V2)** is too vague; needs its own design doc if prioritized.
- **Mobile Offline Support (V2)** lacks storage budget and browser compatibility details.
- **No effort estimates** (same issue as E1/I-16).

### 8) Proposed Edits

| Priority | Location | Edit |
|----------|----------|------|
| **P0** | Chain/Stationing Measurement, Description "if alignment is not defined" | Clarify: "User manually selects a polyline or series of connected linear elements. Auto-detection (if model has IfcAlignment) may be added in V1.1." |
| **P0** | Chain/Stationing Measurement, AC "exports results as CSV/JSON" | Specify format: "CSV columns: StationID, Distance(m), X, Y, Z, ElementGUID. JSON schema to be defined." |
| **P0** | Utility & Layer Filtering, Description "filter by discipline" | Clarify: "Use Pset_Common.Category or ObjectType if available; fallback to user-defined layer mapping (configurable JSON)." |
| **P1** | Annotations/Markups, AC "anchor persists relative to object" | Add: "Anchor stores object GUID + local offset. If object deleted, annotation marked as orphaned; user can re-anchor or delete." |
| **P1** | Issue Export/Import, AC "Export annotations as BCF" | Specify version: "BCF 2.1 for MVP (wider tool support); BCF 3.0 for V1." |
| **P1** | Markup Collaboration, AC "Two users see updates in real time" | Specify latency: "Real-time updates <1 second. Use last-write-wins conflict resolution with user notification." |
| **P1** | Markup Collaboration, AC "offline edits sync once online" | Clarify scope: "V1 supports real-time sync only; offline sync deferred to V2 (Mobile Offline Support)." |
| **P1** | High-contrast mode, Test Approach "user testing with accessibility tools" | Specify tools: "Test with NVDA, JAWS (Windows), VoiceOver (macOS/iOS), and automated audits (axe, Lighthouse)." |
| **P1** | Localization, Description "support multiple languages (EN, VI, FR)" | Add rationale or adjust: "EN (global), VI (if targeting Vietnam civic projects), FR (if targeting Francophone regions). Confirm target audience." |
| **P2** | Plugin System (V2), Description | Add detail: "Define plugin manifest, lifecycle hooks (init/load/unload), API surface, sandboxing, and versioning. Requires separate design doc." |
| **P2** | Mobile Offline Support (V2), Description "cache models" | Add constraints: "IndexedDB storage budget (~50MB–1GB); define model size limits and cache eviction policy." |

### 9) Rolling Ledger (Updated)

**A) Cumulative Issues**

| ID | Severity | Description | Status | First Seen |
|----|----------|-------------|--------|------------|
| I-1 | P0 | Dual-license claim doesn't account for AGPL fork copyright | OPEN | K0 |
| I-2 | P0 | Conversion pipeline tool ambiguity | OPEN | K0, D1 |
| I-8 | P0 | Module numbering broken in C1 | OPEN | C1 |
| I-9 | P0 | MongoDB (SSPL) not OSI-approved | OPEN | C1 |
| I-15 | P0 | "Measurement persists in session" and "viewer state" lack storage details | OPEN | E1 |
| **I-19** | **P0** | **Chain/Stationing Measurement lacks detail on alignment detection/selection (manual vs auto)** | **OPEN** | **E2** |
| **I-20** | **P0** | **Utility & Layer Filtering: how is discipline determined? (property sets? user config?)** | **OPEN** | **E2** |
| I-3 | P1 | WebGL2 "~54% support" figure likely outdated | OPEN | K0 |
| I-4 | P1 | Next 10 Tasks lack owners, estimates, exit criteria | OPEN | K0 |
| I-5 | P1 | "Typical civil models (<100 MB)" underspecified | OPEN | A1 |
| I-6 | P1 | Vision Pro "comfortable frame rate" not quantified | OPEN | A1 |
| I-7 | P1 | "Mid-range laptop" not defined | OPEN | A1 |
| I-10 | P1 | 3D Tiles mentioned but xeokit doesn't support natively | OPEN | C1, D1 |
| I-16 | P1 | Feature backlog lacks effort estimates | OPEN | E1, E2 |
| I-17 | P1 | Accessibility requirements not detailed | OPEN | E1 |
| I-18 | P1 | Measurement tool numeric tolerance not specified | OPEN | E1 |
| **I-21** | **P1** | **Annotations anchor persistence: what if object deleted? Need invalidation strategy** | **OPEN** | **E2** |
| **I-22** | **P1** | **BCF version not specified (2.1 vs 3.0); affects interoperability** | **OPEN** | **E2** |
| **I-23** | **P1** | **Markup Collaboration conflict resolution underspecified (last-write-wins? OT? CRDT?)** | **OPEN** | **E2** |
| **I-24** | **P1** | **Plugin System (V2) too vague; needs design doc (manifest, API, sandboxing, versioning)** | **OPEN** | **E2** |

**B) Key Assumptions**
- xeokit-bim-viewer provides core viewer features; MVP work is integration/adaptation.
- 30 fps for desktop/tablet; ≥60 fps for XR (A1/I-6).
- Team can deliver MVP features in 6 weeks (effort estimates needed).
- **IFC models contain sufficient metadata for discipline filtering (property sets or ObjectType).**
- **BCF 2.1 is sufficient for MVP interoperability; BCF 3.0 can wait for V1.**
- **Last-write-wins conflict resolution is acceptable for V1 real-time collab; advanced OT/CRDT deferred to V2.**

**C) Open Questions**
- How are measurements and section planes persisted?
- What effort (dev-days/story points) per feature?
- What dependencies exist between features?
- **How are alignments detected for chain/stationing measurement? Manual selection or auto-detection?**
- **What CSV/JSON format for chain measurement export?**
- **How is discipline determined for utility filtering?**
- **What conflict resolution strategy for markup collaboration?**
- **Which BCF version: 2.1 or 3.0?**

**D) Risk Register**
- **R-1:** AGPL deters some adopters.
- **R-2:** Conversion pipeline fragmentation increases maintenance.
- **R-10:** Feature effort may exceed 6-week MVP timeline.
- **R-11:** Accessibility compliance (WCAG 2.1 AA) requires dedicated effort.
- **R-12:** Chain/stationing measurement may not work well if IFC models lack alignment data or clear linear structure.
- **R-13:** Utility filtering depends on IFC metadata quality; inconsistent models may require manual layer mapping (increases setup burden).
- **R-14:** Plugin system (V2) is complex; API design, sandboxing, and versioning require significant planning and testing.

---