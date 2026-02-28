# Decision Record DR-001: Repository & Rendering Engine Selection

| Field | Value |
|-------|-------|
| **Status** | CONFIRMED |
| **Date** | 2026-03-01 |
| **Deciders** | Project Owner (Huy) + AI Solution Architect |
| **Supersedes** | `docs/A2-repo-selection-decision.md` (original word-for-word extraction) |
| **Review Date** | 2026-06-01 (before V1 planning) |

---

## Context

The project needs a browser-based 3D/2D BIM viewer for civil engineering models, targeting desktop, tablet, and Apple Vision Pro. The viewer must:

1. Load IFC models (converted to glTF/GLB) up to 100 MB.
2. Provide standard BIM viewer features: orbit/pan/zoom, object selection, tree view, section planes, measurements, annotations.
3. Support BCF 2.1 viewpoint export/import (V1).
4. Be open-source (AGPL-3.0) with a dual-license commercial option.
5. Be extensible for future WebXR immersive mode (V2).

Three options were evaluated (original decision matrix preserved from source document below, with accuracy annotations added).

## Original Decision Matrix (from source document, annotated)

| Criterion | xeokit-bim-viewer (AGPL) | BIMSurfer v3 (MIT) | Build-from-Toolkit (e.g., engine_web-ifc + Three.js) |
|-----------|--------------------------|---------------------|-------------------------------------------------------|
| License | AGPL-3.0 (copyleft); modifications and hosted services must be open-sourced or require commercial license | MIT (permissive) | Depends on choice of libraries (MIT for Three.js; **engine_web-ifc license is UNCERTAIN — was MPL-2.0, may now be AGPL-3.0 [I-26]**) |
| Maturity / Adoption | Mature; integrated into OpenProject BIM (**version unverified, likely 10.4+**); **stars/forks unverified — claimed >500 stars, >400 forks** | Beta; no official release; WebGL2-only; **stars unverified — claimed ~416** | Requires building viewer from scratch; high flexibility but long time to MVP |
| Features | 3D/2D views, load multiple models, X-ray/hide, section planes, tree views, BCF viewpoint support | Partial support for 3D tiles, measurements, up to 6 section planes | Only basic parsing; all viewer features must be built; can be tailored to specific needs |
| Performance | Optimised for large models; uses double-precision geometry (**verified — documented in xeokit SDK**) | High performance due to custom WebGL2 pipeline | Dependent on developer implementation and chosen rendering engine |
| Conversion Pipeline | Requires converting IFC to glTF/XKT; documented in README | Typically paired with BIMServer; supports glTF via IfcOpenShell | Developer must design pipeline; can leverage engine_web-ifc |
| Extensibility | Built on xeokit SDK; provides programming API for custom functions | Codebase still evolving; may require deep familiarity with WebGL2; limited docs | Maximum flexibility; but high development cost |
| Time-to-MVP | Fastest: fork/use as dependency, convert sample models and add features; **actual approach: used xeokit-sdk as npm dependency, not fork** | Medium: needs stabilization and missing features; risk due to beta state | Slowest: months of development to reach parity |

<!-- ANNOTATED: Cells with **bold** text contain accuracy annotations added during DR-001 review -->

## Decision

**Use xeokit-sdk as an npm dependency** (not fork xeokit-bim-viewer as originally planned) **to build a custom viewer.**

This is a deviation from the original plan (which said "fork xeokit-bim-viewer") but is considered valid because:
- Using xeokit-sdk directly gives more control over architecture and UI
- Avoids inheriting xeokit-bim-viewer's opinionated UI layer
- Still benefits from xeokit's rendering engine, double-precision geometry, and BCF support
- The AGPL license applies equally to the SDK and the bim-viewer

## Consequences

### Positive

1. **Civil engineering feature coverage:** xeokit provides section planes, measurements, BCF viewpoints, and multi-model loading — all directly relevant.
2. **Double-precision geometry:** Critical for civil engineering models that span large geographic areas (bridges, highways).
3. **License alignment:** Our AGPL + commercial dual-license strategy mirrors xeokit's own model. No conflict.
4. **Production precedent:** OpenProject BIM demonstrates real-world production use.
5. **Active maintenance:** xeokit has a commercial entity (Creoox AG) behind it, reducing abandonment risk.

### Negative

1. **AGPL deterrence (R-1):** Some organizations (especially contractors) will be unable or unwilling to use AGPL software. The commercial license mitigates this but requires negotiation with xeokit maintainers for SDK sublicensing.
2. **Vendor coupling:** Using xeokit-sdk means our ViewerCore, ModelLoader, and UI code depend on xeokit's API surface. Migration to another engine would require rewriting these modules.
3. **Conversion pipeline dependency:** xeokit works best with its XKT format (proprietary binary). Using standard glTF avoids lock-in but may sacrifice some optimizations. Current implementation uses ifcConvert → glTF (standard path).
4. **Version uncertainty (I-22):** If xeokit releases a v3 SDK with breaking changes, migration effort could be significant.

## Mitigation

| Risk | Mitigation |
|------|-----------|
| AGPL deterrence (R-1) | Offer commercial license; clearly document that unmodified deployment does NOT trigger AGPL §13 |
| Vendor coupling | Isolate xeokit behind `ViewerCore` and `ModelLoader` abstractions (already in architecture). If migration needed, only these two modules require rewrite. |
| Conversion lock-in | Use standard glTF/GLB as primary format; XKT as optional optimization |
| Version uncertainty (I-22) | Pin to xeokit-sdk ^2.6.0; monitor xeokit releases; evaluate migration before V1 |
| CLA gap (I-21) | Implement CLA (CLA Assistant bot or Apache ICLA) before accepting external contributions |
| engine_web-ifc license uncertainty (I-26) | Verify license before including in documentation or pipeline |

## Fallback Trigger Conditions

The decision should be **revisited** if any of the following occur:

1. **xeokit SDK is deprecated or unmaintained** (no commits for >6 months, no response to critical bugs).
2. **xeokit commercial license terms become prohibitive** (pricing >$500/seat/year or terms incompatible with our dual-license strategy).
3. **A competing open-source engine achieves feature parity with permissive license** (e.g., ThatOpen Components under MIT/Apache reaches stable release with BCF support, section planes, and double-precision geometry).
4. **WebGPU adoption exceeds 80%** and xeokit does not add WebGPU backend — performance gap becomes significant.
5. **Legal review determines AGPL §13 implications are untenable** for target users (public agencies, contractors).

## Alternatives Considered but Rejected

### BIMSurfer v3 (MIT)
- **Why considered:** MIT license eliminates copyleft concerns; high WebGL2 performance.
- **Why rejected:** Beta state with no official release creates stability risk; limited documentation; requires BIMServer pairing for full functionality; WebGL2-only was originally a concern but WebGL2 now has >96% browser support (I-3 resolved: the "~54%" figure was outdated).
- **Reassessment:** If BIMSurfer reaches stable release (v3.0+), it could be reconsidered for V2 as a permissive-license option.

### Build-from-Toolkit (engine_web-ifc + Three.js)
- **Why considered:** Maximum flexibility; MIT license (for Three.js); native IFC parsing in browser.
- **Why rejected:** Months of development to reach feature parity with xeokit; no built-in BCF support; double-precision geometry would need custom implementation; engine_web-ifc license is now uncertain [I-26].
- **Reassessment:** ThatOpen Components (successor to IFC.js) may provide a more complete toolkit in the future. Monitor for stable release [I-23].

## Appendix: License Implications (Detailed)

### AGPL-3.0 (Our Project + xeokit)

- **§13 (Network Interaction):** If you modify the software and make it available to users over a network, you must provide the source code of your modifications. Key nuance: this applies to **modifications**, not to unmodified deployment.
- **Unmodified deployment is safe:** A public agency can deploy our viewer on their servers without source-sharing obligations, as long as they do not modify the code.
- **Modification triggers:** Adding custom features, changing UI, modifying measurement logic — any code change — triggers §13 obligations if the modified version is deployed as a network service.
- **Dual-license escape hatch:** Organizations unwilling to comply with AGPL can purchase a commercial license. This requires:
  1. A CLA covering all contributions (I-21)
  2. Agreement with xeokit maintainers for SDK sublicensing (or purchase of xeokit commercial license)

### IfcOpenShell / ifcConvert (LGPL-3.0)

- Used as a separate CLI process. Our code does not link to IfcOpenShell libraries.
- Output files (glTF/GLB) are not covered by LGPL.
- **No license contamination.** Safe to use.

### engine_web-ifc (License Uncertain — I-26)

- Originally MPL-2.0 (file-level copyleft). Modified source files must remain MPL; calling code is unaffected.
- ThatOpen (parent org) has been moving components to AGPL-3.0. Current license of the WASM module is **unverified**.
- **Action required:** Verify license at https://github.com/ThatOpen/engine_web-ifc before referencing in any user-facing documentation.

### Contributor IP

- Contributors retain copyright of their contributions.
- Under AGPL, contributors grant downstream users rights to use/modify/distribute under AGPL.
- Under a CLA, contributors additionally grant the project maintainers the right to sublicense (including for commercial licenses).
- **CLA implementation is a prerequisite for dual-licensing (I-21).**

---

*This decision record supersedes the original `docs/A2-repo-selection-decision.md` extraction. The original file is preserved for traceability.*
