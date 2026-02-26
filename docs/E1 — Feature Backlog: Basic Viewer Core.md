<!-- FILE: docs/claude_plan_review.md -->
## Chunk E1 — Feature Backlog: Basic Viewer Core

### 1) Chunk Summary
- Defines 6 basic viewer features in a table format: Orbit/Pan/Zoom, Object Selection & Properties, Search & Tree View, Section Planes, Measurement Tool, and 2D/Plan Navigation.
- Each feature includes: Priority (MVP or V1), Description, Acceptance Criteria (AC), and Test Approach.
- All features except 2D/Plan Navigation are scoped for MVP (weeks 0-6).
- Test approaches span unit tests, integration tests, E2E tests, performance tests, and accessibility tests.

### 2) Plan Validation Snapshot

**Verdict: SOUND**

- **(A) Feasibility:** All listed features are standard for BIM viewers. xeokit-bim-viewer already provides most of these (orbit/pan/zoom, selection, tree view, section planes, measurement), so implementation is primarily integration/adaptation work rather than building from scratch.
- **(B) Production readiness:** Test approaches are comprehensive and appropriate (unit, integration, E2E, performance, accessibility). Acceptance criteria are measurable and clear.
- **(C) Licensing:** No licensing conflicts introduced by these features. Standard viewer functionality.
- **(D) XR realism:** Not addressed in this chunk (appropriately deferred to F1/F2).

**No blocking flaws.** This is a well-structured feature backlog.

### 3) Accuracy & Verifiability Review

| Claim | Assessment |
|-------|-----------|
| "Orbit around selected pivot" | **STANDARD FEATURE** — Common in 3D viewers. xeokit supports this via CameraControl. |
| "Up to 6 clipping planes" | **ACCURATE** — xeokit supports multiple section planes. The limit of 6 is reasonable (WebGL uniform limits). |
| "Distance measurement between two points; show result in meters/feet" | **STANDARD FEATURE** — xeokit has measurement tools. Unit conversion (meters/feet) is straightforward. |
| "Switch to plan view; navigate floors with orthographic view" | **ACCURATE** — xeokit supports orthographic projection and floor navigation (referenced in K0 and A1 as existing feature[2]). |
| "Automated UI tests with Playwright/Cypress" | **STANDARD PRACTICE** — Both are widely used for E2E web testing. |
| "Performance test to ensure 30 fps" | **MEASURABLE** — Can be tested using browser DevTools Performance API or Puppeteer metrics. 30 fps target aligns with A1 success metrics. |

### 4) Engineering Feasibility & Architecture Review

**Strengths:**
- Feature definitions are specific and testable.
- Test approaches are detailed and multi-layered (unit, integration, E2E, performance, accessibility).
- Acceptance criteria are clear and measurable (e.g., "no jitter", "real time", "persists in session").
- Prioritization is sensible: core viewer features (MVP) before advanced features (V1 for 2D/Plan Navigation).

**Weaknesses & Missing Decisions:**

- **"Measurement persists in session" (Measurement Tool AC):** How is this implemented? Session storage? In-memory? What happens on page reload? Needs clarification for implementation.
  
- **"Plane positions saved in viewer state" (Section Planes AC):** What is "viewer state"? A JSON object? Persisted to localStorage? Part of BCF viewpoint? This needs to be defined in the data schema (mentioned in K0 task 5, but not detailed here).

- **"Accessibility test for keyboard selection" (Object Selection AC):** Good inclusion! But no details on what "accessible" means here. Should define:
  - Tab navigation order
  - Focus indicators (visible outlines)
  - ARIA labels for properties panel
  - Keyboard shortcuts (e.g., Esc to deselect)

- **"User feedback sessions" (2D/Plan Navigation test approach):** This is qualitative testing, which is good, but no mention of how feedback will be collected, analyzed, or acted upon. Should specify: "Conduct user feedback sessions with 3-5 civil engineers; document pain points; prioritize fixes."

- **No mention of touch/gesture support details** beyond "pinch" for zoom. For tablets (mentioned as a target device in A1), need to define:
  - Two-finger pan
  - Two-finger rotate
  - Pinch to zoom
  - Long-press for context menu (if applicable)

- **Performance test "ensure 30 fps":** How is this tested across devices? The A1 success metric defines a "mid-range laptop" target, but E1 doesn't specify test environments. Should reference the device matrix from A1 or define it here.

- **Search & Tree View: "Filter objects by name or IFC type"** — IFC has 700+ entity types. Will the UI provide:
  - Auto-complete for type names?
  - Grouped/hierarchical type list?
  - Fuzzy search?
  These UX details affect implementation complexity.

### 5) License / Compliance Review

**NOT LEGAL ADVICE.**

- No licensing issues introduced by these features.
- Test tools (Playwright, Cypress) are both open-source (Apache-2.0 and MIT respectively). No conflicts.

### 6) XR / Vision Pro Review

- Not relevant to this chunk. XR-specific features are in F1/F2.
- However, the basic viewer features (orbit/pan/zoom, selection) form the foundation for XR mode. The gesture mappings (pinch to zoom) will need adaptation for Vision Pro's gaze+pinch input (covered in F1).

### 7) Quality & Production Readiness Review

**Strengths:**
- Well-structured table format (Feature, Priority, Description, AC, Test Approach).
- Comprehensive test coverage: unit, integration, E2E, performance, accessibility.
- Acceptance criteria are specific and measurable.
- Prioritization (MVP vs V1) is clear.

**Weaknesses:**
- **Missing: effort estimates or story points** for each feature. Without estimates, the 6-week MVP timeline (K1, weeks 0-6) cannot be validated. For example:
  - Orbit/Pan/Zoom: Low effort (already in xeokit)
  - Section Planes: Medium effort (integration + UI)
  - 2D/Plan Navigation: High effort (orthographic view + floor selector UI)
  
- **Missing: dependencies between features.** For example:
  - Measurement Tool may depend on Object Selection (to snap measurements to object corners).
  - 2D/Plan Navigation may depend on Search & Tree View (to filter floors).

- **Missing: non-functional requirements** beyond performance (30 fps). Should include:
  - Accessibility: WCAG 2.1 AA compliance (keyboard nav, contrast, ARIA)
  - Responsiveness: UI must work on mobile screens (min width?)
  - Browser compatibility: Chrome, Firefox, Safari, Edge (which versions?)

- **"Numeric tolerance tests" (Measurement Tool):** Good! But what tolerance is acceptable? For civil engineering, measurements need to be accurate to within ±1mm or ±0.1% (whichever is greater). Should specify.

- **"Snapshot tests for tree interactions" (Search & Tree View):** Snapshot tests can be brittle (break on minor UI changes). Consider supplementing with functional assertions (e.g., "clicking folder X expands children Y, Z").

### 8) Proposed Edits

| Priority | Location | Edit |
|----------|----------|------|
| **P0** | Measurement Tool, AC "measurement persists in session" | Clarify storage: "Measurement persists in session (in-memory); lost on page reload. Export to BCF/JSON if persistence needed." |
| **P0** | Section Planes, AC "plane positions saved in viewer state" | Define viewer state: "Plane positions saved in viewer state (JSON object); can be exported as BCF viewpoint or persisted to localStorage." |
| **P1** | Object Selection, Test Approach "accessibility test" | Specify accessibility requirements: "Tab navigation, visible focus indicators, ARIA labels for properties panel, Esc key to deselect (WCAG 2.1 AA)." |
| **P1** | All features | Add effort estimates: "Estimate story points or dev-days per feature to validate 6-week MVP timeline." |
| **P1** | All features | Add dependencies: "Document feature dependencies (e.g., Measurement may depend on Selection for snap-to-corner)." |
| **P1** | Orbit/Pan/Zoom, Description | Add touch/gesture support: "For tablets: two-finger pan, two-finger rotate, pinch to zoom." |
| **P1** | Measurement Tool, Test Approach "numeric tolerance tests" | Specify tolerance: "Numeric tolerance ±1mm or ±0.1%, whichever is greater (civil engineering standard)." |
| **P2** | 2D/Plan Navigation, Test Approach "user feedback sessions" | Detail process: "Conduct sessions with 3-5 civil engineers; document pain points; prioritize fixes in issue tracker." |
| **P2** | Search & Tree View, Description "filter by IFC type" | Add UX detail: "Provide auto-complete or grouped type list (IFC has 700+ types)." |

### 9) Rolling Ledger (Updated)

**A) Cumulative Issues**

| ID | Severity | Description | Status | First Seen |
|----|----------|-------------|--------|------------|
| I-1 | P0 | Dual-license claim doesn't account for AGPL fork copyright | OPEN | K0 |
| I-2 | P0 | Conversion pipeline tool ambiguity (ifcConvert vs convert2xkt vs cxConverter) | OPEN | K0, D1 |
| I-3 | P1 | WebGL2 "~54% support" figure likely outdated/incorrect | OPEN | K0 |
| I-4 | P1 | Next 10 Tasks lack owners, estimates, exit criteria | OPEN | K0 |
| I-5 | P1 | "Typical civil models (<100 MB)" underspecified | OPEN | A1 |
| I-6 | P1 | Vision Pro "comfortable frame rate" not quantified | OPEN | A1 |
| I-7 | P1 | "Mid-range laptop" not defined | OPEN | A1 |
| I-8 | P0 | Module numbering broken in C1 | OPEN | C1 |
| I-9 | P0 | MongoDB (SSPL) not OSI-approved; conflicts with open-source principle | OPEN | C1 |
| I-10 | P1 | 3D Tiles mentioned but xeokit doesn't support natively | OPEN | C1, D1 |
| **I-15** | **P0** | **"Measurement persists in session" and "plane positions saved in viewer state" lack storage/serialization details** | **OPEN** | **E1** |
| **I-16** | **P1** | **Feature backlog lacks effort estimates; cannot validate 6-week MVP timeline** | **OPEN** | **E1** |
| **I-17** | **P1** | **Accessibility requirements mentioned but not detailed (keyboard nav, ARIA, WCAG compliance)** | **OPEN** | **E1** |
| **I-18** | **P1** | **Measurement tool numeric tolerance not specified (should be ±1mm or ±0.1% for civil eng)** | **OPEN** | **E1** |

**B) Key Assumptions**
- xeokit-bim-viewer provides Orbit/Pan/Zoom, Selection, Tree View, Section Planes, and Measurement tools out-of-box; MVP work is integration/adaptation.
- 30 fps performance target is sufficient for desktop/tablet (not XR, which needs ≥60 fps per A1/I-6).
- Team can deliver 6 MVP features in 6 weeks (effort estimates needed to validate).
- Test tools (Playwright/Cypress) are sufficient for E2E testing.

**C) Open Questions**
- How are measurements and section planes persisted? In-memory only? localStorage? BCF export?
- What effort (dev-days/story points) is required per feature?
- What dependencies exist between features?
- What is the minimum screen width for mobile responsiveness?
- Which browser versions are supported?
- What accessibility standard is targeted (WCAG 2.1 AA)?

**D) Risk Register**
- **R-1:** AGPL deters some adopters.
- **R-2:** Conversion pipeline fragmentation increases maintenance.
- **R-10:** Feature effort may exceed 6-week MVP timeline if xeokit integration is more complex than assumed.
- **R-11:** Accessibility requirements may be underestimated; WCAG 2.1 AA compliance requires dedicated effort (keyboard nav, ARIA, contrast, screen reader testing).

---