# C) System Architecture

## High-Level Diagram (Textual)
```
User (Browser or Vision Pro) --> Web Application (Viewer UI + Viewer Core)
                                  ↓
                                  +- Model Loader & Cache
                                  │    +- IFC Parser (server or client using engine_web-ifc)
                                  │    +- Converter (IFC → glTF/XKT)
                                  │
                                  +- Annotation & Issue Service
                                  │    +- Local storage (MVP)
                                  │    +- Remote storage API (GitHub/BCF server) (V1)
                                  │
                                  +- Authentication & Authorization (optional, for remote storage)
                                  +- REST/GraphQL API (optional, if using server-assisted pipeline)
```

Hosting options:
1. **Static hosting:** All assets and viewer code served via GitHub Pages or S3; model conversion done offline.  Annotation data stored in local storage or commits via GitHub PRs.
2. **Server-assisted:** Backend service handles IFC uploads, conversion, and annotation storage; may use Node.js/Express or serverless functions.

## Modules

<!-- REVISED: Fixed broken numbering (was I-8). Reorganised from flat list (1-17) into 6 clear module sections with sub-bullets. -->
<!-- REVISED: Replaced MongoDB with PostgreSQL (was I-9). MongoDB SSPL is not OSI-approved; PostgreSQL is. -->

### 1. Model Ingestion & Conversion

- **1a. IFC parser / converter:** Use CLI or server-side pipeline to convert IFC to glTF/GLB. MVP uses **ifcConvert** (IfcOpenShell, LGPL-3.0) as the primary conversion tool. For client-side experiments, engine_web-ifc can parse IFC directly in the browser[7] (small models only, <10 MB). For large models, server conversion avoids heavy WASM processing on clients.
  <!-- REVISED: Clarified primary tool per I-2 resolution: ifcConvert for MVP. -->
- **1b. Model cache:** Store converted models in a `data/` directory (static hosting) or object storage (S3-compatible). Implement caching headers and progressive loading (stream glTF chunks). Provide fallback to progressive JPEG previews while loading.
  <!-- REVISED: Removed "use 3D tiles for large models" — xeokit does not support 3D Tiles natively (I-10). Deferred to V2. -->

### 2. Viewer Core

- **2a.** Based on xeokit SDK (used as npm dependency, not forked). Provide 3D and 2D modes, camera controls, object selection, tree view filtering, section planes, measurement tool, and property inspector[2].
  <!-- REVISED: Clarified "SDK as dependency" per I-19 resolution. -->
- **2b.** Expose a JavaScript/TypeScript API for extensions (e.g., new tools, UI components).

### 3. UI Layer

- **3a.** Responsive layout for desktop, tablet, mobile and Vision Pro. Use accessible components with keyboard navigation and ARIA labels (WCAG 2.1 AA). Provide large buttons and simplified HUD for headset mode.
- **3b.** Provide customization of themes (including high-contrast mode) and localization.

### 4. Annotations/Issues Module

- **4a. Data model:** Each annotation stores type (text, measurement, markup), anchor (object GUID + local offset or world coordinates), user, timestamp, comment, and optional severity. Issues follow the BCF 2.1 schema: viewpoint (camera position, orientation, selected objects), markup, and optional attachments. JSON schema will be versioned (migration strategy TBD).
  <!-- REVISED: Added anchor detail (GUID + offset), specified BCF 2.1 per I-30, added schema versioning note. -->
- **4b. Local storage:** Use browser localStorage for MVP. Provide export/import as JSON. BCF zip export/import in V1.
  <!-- REVISED: Simplified from "IndexedDB or browser storage" to "localStorage" to match actual implementation. -->
- **4c. Remote service (V1):** Optional Node.js API with REST endpoints for saving, updating, and retrieving annotations; support authentication (OAuth) and rate limiting (per-user token bucket).

### 5. Auth (Optional, V1+)

- **5a.** For remote collaboration, integrate OAuth (GitHub, Google) or simple token-based auth. For public agencies, support single sign-on (OpenID Connect) as a later extension.

### 6. Storage (Optional, V1+)

- **6a. Static hosting (MVP):** Use GitHub Pages or S3-compatible hosting (CloudFront, MinIO for self-hosted). Annotation data stored in localStorage or exported as JSON files.
  <!-- REVISED: Added self-hosted alternative (MinIO) for data residency requirements. -->
- **6b. Server-assisted (V1+):** Use object storage for models and **PostgreSQL** for annotations and issue metadata. PostgreSQL is OSI-approved (PostgreSQL License) and avoids the SSPL licensing concerns of MongoDB.
  <!-- REVISED: Replaced MongoDB with PostgreSQL per I-9. MongoDB SSPL is not OSI-approved. -->
