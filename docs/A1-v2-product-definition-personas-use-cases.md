<!-- PRD v2.0 | Date: 2026-03-01 | Status: REVIEW | Authors: PM + Architect + Tech Lead -->
<!-- REVISED: Added document metadata (was missing) -->

# A) Product Definition (PRD) — Civil BIM Viewer

> **Version:** 2.0  
> **Date:** 2026-03-01  
> **Status:** REVIEW (pending project-owner sign-off)  
> **Authors:** PM, Solution Architect, Tech Lead  
> **Supersedes:** A1-product-definition-personas-use-cases.md v1.0

---

## Target Users / Personas

<!-- REVISED: Added "Key Features Used" column to link personas to E1/E2 feature IDs -->

| Persona | Goals | Pain Points | Key Features Used |
|---------|-------|-------------|-------------------|
| Civil/Civic Engineer | Inspect and coordinate 3D models of bridges, roads, utilities; measure distances; annotate issues; plan maintenance | Existing viewers are generic and lack civil-oriented features (chain measurements, utilities filtering); tools may not work offline on tablets or headsets. | Orbit/Pan/Zoom (E1), Object Selection (E1), Measurement Tool (E1), Annotations/Markups (E2), Utility & Layer Filtering (E2), Chain/Stationing (E2-V1) |
| Public Works Reviewer / Inspector | Review as-built vs design, mark defects, export issues (BCF) for contractors, use on-site (field tablets or Vision Pro) | Viewers are not optimised for field use; annotations don't sync to issue trackers; UI controls are too small for headsets. | Annotations/Markups (E2), Issue Export/Import (E2), Section Planes (E1), Headset-Friendly UI (F1), High-contrast mode (E2) |
| Project Manager / Consultant | Navigate models on desktop and mobile; filter by discipline (structures, MEP, utilities); review markups; monitor issue status | Complex software requires steep learning; license fees; no open, extendable solution. | Search & Tree View (E1), Utility & Layer Filtering (E2), Issue Export/Import (E2), 2D/Plan Navigation (E1-V1) |
| Stakeholder / Citizen | Understand proposed infrastructure projects through a simplified viewer; provide feedback | Hard to access heavy BIM viewers; need intuitive UI and ability to view on phones or headsets. | Orbit/Pan/Zoom (E1), Headset-Friendly UI (F1), Keyboard Navigation (E2) |

---

## Core Use Cases & User Journeys

### MVP (Weeks 0-6)

<!-- REVISED: Added P0/P1 priority within MVP features; clarified scope boundaries for I-14 and I-15 -->

**P0 — Must-have (cannot ship without these):**

* **Model viewing and navigation (P0):** Users open a converted model, orbit/pan/zoom, inspect object properties and search via tree. Journey: import IFC → convert to glTF → open in viewer → navigate.
  - **In scope for MVP:** 3D orbit/pan/zoom, object selection + properties panel, tree view, basic 3D↔2D orthographic camera toggle.
  <!-- REVISED: "switch between 3D and 2D floor/plan views" split per I-14: basic ortho toggle is MVP, floor-aware plan nav is V1 -->
  - **Out of scope until V1:** Floor/storey-aware 2D plan view with overlays, click-to-focus from plan to 3D.

* **Measurements (P0):** Linear and angular measurements between two points; cumulative point-to-point distance along user-selected points.
  <!-- REVISED: clarified chain measurement scope per I-15: simple cumulative = MVP, alignment-aware stationing = V1 -->
  - **In scope for MVP:** Distance measurement between two points, cumulative distance along user-selected path, unit selection (meters/feet), tolerance ±1mm or ±0.1% (whichever is greater).
  <!-- REVISED: added tolerance spec per I-18 -->
  - **Out of scope until V1:** Alignment-aware stationing with station numbers, chainage export as CSV/JSON.

* **Annotations & issue export (P0):** Users create text annotations pinned to objects or coordinates; export issues to JSON; import existing issues. Initial implementation stores annotations in browser localStorage.
  <!-- REVISED: specified localStorage as storage mechanism -->
  - **In scope for MVP:** Text annotations with anchor (object or world coordinates), severity, status. JSON export/import. localStorage persistence.
  - **Out of scope until V1:** BCF 2.1 export/import, remote sync, shared viewpoints.

* **Civil-specific filtering (P0):** Layer/discipline filters (e.g., surfaces, utilities, structures) to isolate parts of the model; X-ray/hide functions.
  - **In scope for MVP:** Filter by IFC ObjectType or Pset_Common.Category; X-ray toggle; hide/isolate.
  <!-- REVISED: clarified how discipline is determined per E2 review I-20 -->
  - **Out of scope until V1:** "What's below/behind" toggles, underground context, configurable layer mapping JSON.

**P1 — Should-have (important but can be descoped if timeline slips):**

* **Section planes (P1):** Up to 6 clipping planes to cut the model. Users can add, move, and remove planes.
  - **In scope for MVP:** Add/remove section planes, visual plane handles, save plane positions in viewer state (in-memory; export via JSON).
  <!-- REVISED: clarified section plane persistence per E1 review I-15 -->

* **High-contrast mode (P1):** Toggle to high-contrast theme; meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text).

* **Keyboard Navigation (P1):** All UI elements reachable by keyboard; focus indicators visible; ARIA labels included.

<!-- REVISED: Added P0/P1 prioritization. Rationale: if 6 weeks run short, section planes + accessibility can be delivered in a v0.2 patch, but core viewing + measurement + annotations cannot be cut. -->

### V1 (Weeks 7-10)
* Stationing/chain measurements: Provide stationing or chainage tools for linear infrastructure (e.g., alignments). When geometry doesn't support a parametric alignment, approximate chainage along polylines. User manually selects polyline or connected segments; auto-detection via IfcAlignment may be added in V1.1.
<!-- REVISED: added manual selection clarification per E2 review BF-4 -->
* Floor/storey-aware 2D plan navigation: Switch to plan view; navigate floors with orthographic view; 2D overlays. Clicking objects in plan focuses them in 3D.
<!-- REVISED: moved detailed 2D/plan nav here from MVP per I-14 resolution -->
* Utilities and underground context: Display metadata (pipe diameters, material) from IFC property sets; implement "what's below/behind" toggles to show hidden infrastructure.
* Markup collaboration: Allow saving markups to remote storage (GitHub or custom service) and sharing links; support import/export of BCF 2.1 viewpoints.
<!-- REVISED: specified BCF 2.1 per E2 review I-22 -->
* Internationalisation/accessibility: Provide UI in multiple languages (EN, VI, FR), high-contrast mode, keyboard navigation.
* BCF export/import: Full BCF 2.1 zip format serialization for interoperability with BIMcollab, Solibri, and other BCF-compatible tools.
<!-- REVISED: separated BCF from V1 collab to make it explicit -->

### V2 (Weeks 11-14 and beyond)
* Real-time collaboration: Multi-user annotation sessions with WebRTC or WebSocket back-end. Role-based permissions (viewer vs reviewer). Last-write-wins conflict resolution with user notification for V2.0; CRDT-based merging evaluated for V2.1.
<!-- REVISED: specified conflict resolution strategy per E2 review I-23 -->
* WebXR immersive mode: Provide optional fully immersive viewing using WebXR on Vision Pro. Support natural input (gaze + pinch) based on transient-pointer input mode.
* Mobile offline sync: Cache models and annotations for offline viewing on tablets; sync when online. IndexedDB storage budget ~50 MB–1 GB depending on browser.
<!-- REVISED: added storage budget note per E2 review -->

---

## Non-Goals
* Authoring or editing models (i.e., no direct geometry creation or modification).
* Replacing commercial BIM platforms; the focus is on viewing/reviewing models.
* Support for proprietary file formats (e.g., DWG) outside of the IFC-glTF conversion pipeline.
* Real-time sensor data streaming; this may be added later.

---

## Success Metrics

<!-- REVISED: Each metric now has value, measurement method, frequency, and responsible party per production PRD requirements. Resolved I-5, I-6, I-7. -->

| Metric | Target Value | Measurement Method | Frequency | Owner |
|--------|-------------|-------------------|-----------|-------|
| Model load time | < 5 s for benchmark civil models (≤100 MB): IFC Schependomlaan (~3 MB), IfcOpenShell bridge sample (~50 MB) | Automated Playwright test measuring time from `loadProject()` call to first render frame, on reference device | Per CI run | Tech Lead |
| Frame rate (desktop) | ≥ 30 fps on reference device (Apple M1 / Intel i5-12400, 8 GB RAM, integrated GPU, Chrome 120+ / Safari 17+, 1080p) | Chrome DevTools Performance API via Playwright `page.metrics()` | Per CI run | Tech Lead |
| Frame rate (Vision Pro) | ≥ 72 fps with stable frame pacing | Manual test on Vision Pro hardware or Simulator; reference Apple visionOS HIG | Per release | XR Lead |
| Memory footprint | < 500 MB (single model ≤100 MB, including viewer + annotations + metadata) | Chrome DevTools `performance.measureUserAgentSpecificMemory()` via Playwright | Per CI run | Tech Lead |
| GitHub stars | > 100 within 3 months of public launch | GitHub API / manual check | Monthly | PM |
| External contributions | ≥ 2 merged external PRs within 3 months | GitHub contributor count | Monthly | PM |
| Civic org adoption | ≥ 1 documented usage by a civic engineering organisation by V1 | Case study or public testimonial | By V1 release | PM |
| Contribution velocity | Positive trend in merged PRs/month; issues-closed > issues-opened per month | GitHub Insights | Monthly | PM |
| User outcomes | Engineers report faster review cycles, fewer mis-measurements | Structured user survey (Likert scale, 5-point) after 4-week pilot with ≥5 civil engineers | Once pre-V1 | PM |

<!-- REVISED: "comfortable frame rate" replaced with ≥72 fps per I-6; "mid-range laptop" replaced with specific ref device per I-7; "typical civil models" replaced with named benchmarks per I-5; "fewer mis-measurements" gets survey methodology -->

---

## Dependency Map

<!-- REVISED: Added dependency map (was missing) -->

```
IFC Conversion (scripts/convert-ifc.mjs)
  └── Model Loading (ModelLoader.ts)
       └── Orbit/Pan/Zoom (ViewerCore.ts)
            ├── Object Selection & Properties
            │    ├── Annotations/Markups (AnnotationService.ts)
            │    │    └── Issue Export/Import (JSON → BCF in V1)
            │    └── Search & Tree View
            ├── Measurement Tool (depends on camera + selection for snap)
            ├── Section Planes
            └── Civil-specific Filtering (X-ray/hide)
                 └── Utility & Layer Filtering (V1: "below/behind" toggle)
```

Key dependencies:
- **Annotations** require **Object Selection** (to anchor to objects)
- **Measurement** may use **Object Selection** (snap to object corners)
- **All viewer features** require **Model Loading** + **Orbit/Pan/Zoom**
- **Issue Export** requires **Annotations** (nothing to export without them)

---

## Known Risks

<!-- REVISED: Added known risks per phase (was missing) -->

| Phase | Risk | Severity | Mitigation |
|-------|------|----------|------------|
| MVP | xeokit integration is more complex than expected; stubs remain at week 6 | High | Prototype with real xeokit Viewer in week 1; identify blockers early. Keep non-xeokit features (annotations, export) working independently. |
| MVP | IFC conversion pipeline fails on large civil models (>50 MB) | Medium | Test with multiple model sizes in week 2. Provide model size warnings in UI. |
| MVP | 6-week timeline exceeded | Medium | P0/P1 prioritization above ensures core features ship first. Section planes and accessibility can slip to a v0.2 patch. |
| V1 | Chain/stationing measurement doesn't work without IfcAlignment data | Medium | Implement polyline fallback (manual selection). Document model requirements. |
| V1 | BCF 2.1 interoperability issues with third-party tools | Low | Round-trip test with BIMcollab and Solibri BCF validators. |
| V2 | Real-time collaboration at scale (>10 users) causes conflicts | Medium | Start with last-write-wins + notification. Evaluate CRDT for V2.1. |
| V2 | WebXR on visionOS remains experimental or removed | Medium | Maintain 2D headset-mode fallback (F1 Track 1). Do not invest heavily until Apple signals stability. |

---

## Data Privacy Considerations

<!-- REVISED: Added data privacy section per I-25 (was missing); especially relevant for public agencies -->

* Annotations may contain author names, timestamps, GPS-derived coordinates, and commentary on public infrastructure. For deployments by public agencies:
  - MVP (local-only): All data stays in browser localStorage. No server transmission. User responsible for their own browser data.
  - V1 (remote sync): Provide privacy notice. Support anonymous/pseudonymous annotation authors. Ensure HTTPS for all API calls. Define data retention policy.
* Model files (IFC, GLB) may contain proprietary design data. The app does not upload models to any server in MVP (static hosting). In server mode, document data handling and offer self-hosted deployment.
* No telemetry or analytics are collected unless explicitly enabled.
