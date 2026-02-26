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

### 1. Model Ingestion & Conversion
2. IFC parser / converter: Use CLI or server-side pipeline to convert IFC to glTF/XKT. For client-side experiments, use engine_web-ifc to parse IFC directly in the browser[7]. For large models, server conversion avoids heavy WASM processing on clients.
3. Model cache: Store converted models in a data/ directory (static hosting) or object storage (S3). Implement caching headers and progressive loading (stream glTF chunks or use 3D tiles for large models). Provide fallback to progressive JPEG previews while loading.

### 4. Viewer Core
5. Based on xeokit viewer. Provide 3D and 2D modes, camera controls, object selection, tree view filtering, section planes, measurement tool, and property inspector[2].
6. Expose a JavaScript API for extensions (e.g., new tools, UI components).

### 7. UI Layer
8. Responsive layout for desktop, tablet, mobile and Vision Pro. Use accessible components with keyboard navigation and ARIA labels. Provide large buttons and simplified HUD for headset mode.
9. Provide customization of themes and localization.

### 10. Annotations/Issues Module
11. Data model: Each annotation stores type (text, measurement, markup), anchor (object ID or world coordinates), user, timestamp, comment, and optional severity. Issues follow the BCF schema: viewpoint (camera position, orientation, selected objects), markup, and optional attachments. JSON schema will be defined.
12. Local storage: Use IndexedDB or browser storage for MVP. Provide export/import as JSON or BCF zip.
13. Remote service: Optional Node.js API with REST endpoints for saving, updating, and retrieving annotations; support authentication (OAuth) and rate limiting.

### 14. Auth (Optional)
15. For remote collaboration, integrate OAuth (GitHub, Google) or simple token-based auth. For public agencies, support single sign-on (OpenID Connect) as a later extension.

### 16. Storage (Optional)
17. Use AWS S3/CloudFront or GitHub Pages for static hosting. For server-assisted mode, use object storage for models and a document database (MongoDB) for annotations.
