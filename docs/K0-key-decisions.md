# Key Decisions

1. Starting point: Use the xeokit-bim-viewer repository as the primary codebase because it is a mature, browser-based 2D/3D BIM viewer that loads models from the file system and is already integrated into OpenProject BIM[1]. It offers features such as 3D/2D modes, x-ray, selection, tree views and localization[2]. The project has more than 500 stars and is licensed under AGPL-3.0[3]. A commercial license can be purchased to avoid copyleft obligations[4].
2. Fallback: Keep BIMSurfer v3 as the backup option. BIMSurfer is MIT-licensed, includes partial support for 3D tiles and measurements, and is designed for high performance[5]. However, it is still in beta, has no official release, and only works with WebGL 2 (~54 % browser support)[5].
3. Licensing strategy: The project will remain open source. Since AGPL requires any hosted modifications to be released under the same license (copyleft), and MIT allows proprietary forks[6], we will distribute our viewer under the AGPL and additionally explore a dual-license/commercial option for organizations needing proprietary integration.
4. Model format: Models will be stored using IFC and converted to glTF/GLB for efficient web delivery. The engine_web-ifc library can parse and write IFC at native speeds[7] and will be used in our conversion pipeline.
5. XR strategy: Support Apple Vision Pro initially via a headset-friendly web UI; investigate immersive WebXR later. Safari on visionOS supports WebXR with natural input using gaze-and-pinch interactions, implemented through the transient-pointer input mode[8] and requiring adaptation of existing scenes[9]. Apple's WWDC session emphasises building immersive web experiences that leverage visionOS input capabilities[10].

# Next 10 Tasks

1. Fork and review the selected repository (xeokit-bim-viewer). Verify build, run the demo, and document the current feature set.
2. Develop a decision report comparing xeokit vs BIMSurfer vs build-from-scratch, using the decision matrix in section B.
3. Set up a prototype pipeline: convert a sample IFC file to glTF using CLI tools recommended in xeokit docs[11] and host it in a local static server.
4. Draft the system architecture diagram and identify module boundaries (viewer core, UI, annotation service, conversion service).
5. Design the data schema for annotations/issues, including BCF compatibility.
6. Write the initial PRD capturing user personas, core use cases, non-goals, and success metrics (section A).
7. Create the CI/CD pipeline skeleton with linting, unit tests, and deployment to GitHub Pages.
8. Implement basic measurement and annotation tools within the viewer core.
9. Draft the Vision Pro friendly UI guidelines, including larger hit targets and simplified controls.
10. Prepare community documentation, including CONTRIBUTING, code of conduct, and roadmap drafts.
