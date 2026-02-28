# Key Decisions

1. Starting point: Use the **xeokit-sdk** as an npm dependency (not fork xeokit-bim-viewer) to build a custom viewer. xeokit is a mature, browser-based 2D/3D BIM rendering engine already integrated into OpenProject BIM[1]. It offers 3D/2D modes, x-ray, selection, tree views, BCF viewpoints, and double-precision geometry[2]. Licensed under AGPL-3.0; a commercial license can be purchased to avoid copyleft obligations[4]. Using the SDK directly (rather than forking the opinionated bim-viewer app) gives full control over architecture and UI.
<!-- REVISED 2026-03-01: Changed from "fork xeokit-bim-viewer" to "use xeokit-sdk as npm dependency" per I-19 resolution. See DR-001. -->
2. Fallback: Keep BIMSurfer v3 as the backup option. BIMSurfer is MIT-licensed, includes partial support for 3D tiles and measurements, and is designed for high performance[5]. However, it is still in beta, has no official release, and only works with WebGL 2[5].
<!-- REVISED 2026-03-01: Removed "~54% browser support" claim (I-3). WebGL2 is now supported by >96% of browsers per caniuse.com. This is no longer a meaningful differentiator against BIMSurfer. -->
3. Licensing strategy: The project will remain open source. Since AGPL requires any hosted modifications to be released under the same license (copyleft), and MIT allows proprietary forks[6], we will distribute our viewer under the AGPL and additionally explore a dual-license/commercial option for organizations needing proprietary integration.
4. Model format: Models will be stored using IFC and converted to glTF/GLB for efficient web delivery. **MVP conversion pipeline uses ifcConvert (IfcOpenShell, LGPL-3.0)** as an offline CLI tool. XKT output via xeokit's convert2xkt may be added as an optional optimization. engine_web-ifc[7] is reserved for experimental client-side parsing of small models (<10 MB) only.
<!-- REVISED 2026-03-01: Changed from "engine_web-ifc will be used" to "ifcConvert for MVP" per I-2 resolution. engine_web-ifc license is uncertain (I-26) and client-side WASM is impractical for large civil models. -->
5. XR strategy: Support Apple Vision Pro initially via a headset-friendly web UI; investigate immersive WebXR later. Safari on visionOS supports WebXR with natural input using gaze-and-pinch interactions, implemented through the transient-pointer input mode[8] and requiring adaptation of existing scenes[9]. Apple's WWDC session emphasises building immersive web experiences that leverage visionOS input capabilities[10].

# Next 10 Tasks

1. ~~Fork and review the selected repository (xeokit-bim-viewer).~~ **REVISED:** Set up project using xeokit-sdk as an npm dependency. Scaffold TypeScript + Vite project, create ViewerCore and ModelLoader modules wrapping xeokit APIs, verify build, and document the current feature set. ✅ DONE.
<!-- REVISED 2026-03-01: Actual approach uses xeokit-sdk as dependency, not fork. See DR-001. -->
2. Develop a decision report comparing xeokit vs BIMSurfer vs build-from-scratch, using the decision matrix in section B.
3. Set up a prototype pipeline: convert a sample IFC file to glTF using CLI tools recommended in xeokit docs[11] and host it in a local static server.
4. Draft the system architecture diagram and identify module boundaries (viewer core, UI, annotation service, conversion service).
5. Design the data schema for annotations/issues, including BCF compatibility.
6. Write the initial PRD capturing user personas, core use cases, non-goals, and success metrics (section A).
7. Create the CI/CD pipeline skeleton with linting, unit tests, and deployment to GitHub Pages.
8. Implement basic measurement and annotation tools within the viewer core.
9. Draft the Vision Pro friendly UI guidelines, including larger hit targets and simplified controls.
10. Prepare community documentation, including CONTRIBUTING, code of conduct, and roadmap drafts.
