# B) Repo Selection Decision

> **Extraction note:** In the source document "Web Apps in Civil Engineering.txt", this section is labelled "B) Repo Selection Decision". It has been extracted here as A2 because the prior chunking plan referenced an "A2" chunk that was never created, and this section is the natural second planning block following A1 (PRD). No words have been added, removed, or changed. The arrow characters (→) in the original .txt appear as "?" due to encoding; they are reproduced as-is below.

---

## Decision Matrix

| Criterion | xeokit-bim-viewer (AGPL) | BIMSurfer v3 (MIT) | Build-from-Toolkit (e.g., engine_web-ifc + Three.js) |
|-----------|--------------------------|---------------------|-------------------------------------------------------|
| License | AGPL-3.0 (copyleft); modifications and hosted services must be open-sourced or require commercial license[4] | MIT (permissive)[5] | Depends on choice of libraries (MIT for Three.js, MPL for engine_web-ifc[12]) |
| Maturity / Adoption | Mature; integrated into OpenProject BIM 10.4+[13]; >500 stars and >400 forks[3] | Beta; no official release; WebGL2-only; ~416 stars[5][14] | Requires building viewer from scratch; high flexibility but long time to MVP |
| Features | 3D/2D views, load multiple models, X-ray/hide, section planes, tree views, BCF viewpoint support[2] | Partial support for 3D tiles, measurements, up to 6 section planes[5] | Only basic parsing; all viewer features must be built; can be tailored to specific needs |
| Performance | Optimised for large models; uses double-precision geometry[15] | High performance due to custom WebGL2 pipeline[5] | Dependent on developer implementation and chosen rendering engine |
| Conversion Pipeline | Requires converting IFC to glTF/XKT; documented in README[11] | Typically paired with BIMServer; supports glTF via IfcOpenShell[16] | Developer must design pipeline; can leverage engine_web-ifc[7] |
| Extensibility | Built on xeokit SDK; provides programming API for custom functions[2] | Codebase still evolving; may require deep familiarity with WebGL2; limited docs | Maximum flexibility; but high development cost |
| Time-to-MVP | Fastest: just fork, convert sample models and add features; ready-to-use structure[17] | Medium: needs stabilization and missing features; risk due to beta state | Slowest: months of development to reach parity |

## Recommendation

* Primary path: xeokit-bim-viewer. It provides a solid foundation, well-documented features, and an active community. The AGPL license aligns with the goal of keeping the project open source, and a commercial license is available for organizations requiring proprietary usage[4].
* Fallback path: BIMSurfer v3. Should xeokit prove unsuitable (e.g., licensing conflicts or performance issues), BIMSurfer offers MIT freedom and high performance but requires addressing its beta state and WebGL2 limitation[5].
* Toolkit approach: Use engine_web-ifc and build a custom viewer if both repositories fail to meet requirements or if a specialized architecture is desired. The library can read/write IFC at native speeds[7] and could be combined with Three.js or Babylon.js for rendering.

## License Implications

* AGPL-3.0: If users modify the viewer and make it available over a network (e.g., SaaS), they must provide their source code under the AGPL[6]. This encourages contributions but deters proprietary use. Companies can purchase a commercial license from xeokit maintainers[4].
* MIT: Allows use, modification and distribution in proprietary projects without obligation to share changes[6]. This may encourage broader adoption but reduces guarantee of community contributions. Using BIMSurfer (MIT) or building from scratch with permissive libraries may attract organizations wanting closed extensions.
