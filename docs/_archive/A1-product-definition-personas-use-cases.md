# A) Product Definition (PRD)

## Target Users / Personas

| Persona | Goals | Pain Points |
|---------|-------|-------------|
| Civil/Civic Engineer | Inspect and coordinate 3D models of bridges, roads, utilities; measure distances; annotate issues; plan maintenance | Existing viewers are generic and lack civil-oriented features (chain measurements, utilities filtering); tools may not work offline on tablets or headsets. |
| Public Works Reviewer / Inspector | Review as-built vs design, mark defects, export issues (BCF) for contractors, use on-site (field tablets or Vision Pro) | Viewers are not optimised for field use; annotations don't sync to issue trackers; UI controls are too small for headsets. |
| Project Manager / Consultant | Navigate models on desktop and mobile; filter by discipline (structures, MEP, utilities); review markups; monitor issue status | Complex software requires steep learning; license fees; no open, extendable solution. |
| Stakeholder / Citizen | Understand proposed infrastructure projects through a simplified viewer; provide feedback | Hard to access heavy BIM viewers; need intuitive UI and ability to view on phones or headsets. |

## Core Use Cases & User Journeys

### MVP (Weeks 0-6)
* Model viewing and navigation: Users open a converted model, orbit/pan/zoom, switch between 3D and 2D floor/plan views[2], inspect object properties and search via tree. Journey: import IFC → convert to glTF → open in viewer → navigate.
* Measurements: Linear and angular measurements; selection of objects; ability to measure chain distances along roads/bridges. Acceptable tolerance and unit settings.
* Annotations & issue export: Users create annotations pinned to objects or coordinates; export issues to BCF or JSON; import existing issues. Initial implementation stores annotations locally.
* Civil-specific filtering: Layer/discipline filters (e.g., surfaces, utilities, structures) to isolate parts of the model; X-ray/hide functions[2].

### V1 (Weeks 7-10)
* Stationing/chain measurements: Provide stationing or chainage tools for linear infrastructure (e.g., alignments). When geometry doesn't support a parametric alignment, approximate chainage along polylines.
* Utilities and underground context: Display metadata (pipe diameters, material) from IFC property sets; implement "what's below/behind" toggles to show hidden infrastructure.
* Markup collaboration: Allow saving markups to remote storage (GitHub or custom service) and sharing links; support import/export of BCF viewpoints.
* Internationalisation/accessibility: Provide UI in multiple languages, high-contrast mode, keyboard navigation.

### V2 (Weeks 11-14 and beyond)
* Real-time collaboration: Multi-user annotation sessions with WebRTC or WebSocket back-end. Role-based permissions (viewer vs reviewer).
* WebXR immersive mode: Provide optional fully immersive viewing using WebXR on Vision Pro. Support natural input (gaze + pinch) based on transient-pointer input mode[8].
* Mobile offline sync: Cache models and markups for offline viewing on tablets; sync when online.

## Non-Goals
* Authoring or editing models (i.e., no direct geometry creation or modification).
* Replacing commercial BIM platforms; the focus is on viewing/reviewing models.
* Support for proprietary file formats (e.g., DWG) outside of the IFC-glTF conversion pipeline.
* Real-time sensor data streaming; this may be added later.

## Success Metrics
* Performance: Model load time < 5 s for typical civil models (<100 MB), average frame rate > 30 fps on mid-range laptops; memory footprint below 500 MB. For Vision Pro, maintain comfortable frame rate and avoid nausea.
* Adoption: >100 GitHub stars and at least two external contributions within three months; adoption by one civic engineering organisation by V1.
* Contribution velocity: Merged PRs per month; number of issues closed vs opened.
* User outcomes: Engineers report faster review cycles, fewer mis-measurements, and improved clarity on underground utilities.
