/**
 * BCFService.test.ts — Unit tests for BCF 2.1 export/import
 * Phase 5, Task 5.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Polyfill crypto.randomUUID for jsdom
let uuidCounter = 0;
Object.defineProperty(globalThis, "crypto", {
  value: {
    ...globalThis.crypto,
    randomUUID: () => `00000000-0000-0000-0000-${String(++uuidCounter).padStart(12, "0")}`,
  },
  writable: true,
});

// Polyfill URL.createObjectURL / revokeObjectURL for jsdom
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = jest.fn(() => "blob:mock-url");
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = jest.fn();
}

jest.mock("@xeokit/xeokit-sdk", () => ({
  Viewer: jest.fn().mockImplementation(() => ({
    scene: {
      setObjectsVisible: jest.fn(),
      setObjectsXRayed: jest.fn(),
      setObjectsSelected: jest.fn(),
      setObjectsHighlighted: jest.fn(),
      objectIds: ["obj1", "obj2"],
      objects: {
        obj1: { id: "obj1", aabb: [0, 0, 0, 5, 3, 5] },
        obj2: { id: "obj2", aabb: [5, 0, 0, 10, 3, 10] },
      },
      selectedObjectIds: ["obj1"],
      highlightedObjectIds: [],
      getAABB: jest.fn(() => [0, 0, 0, 10, 10, 10]),
      xrayMaterial: {
        fill: true,
        fillAlpha: 0.1,
        fillColor: [0, 0, 0],
        edgeAlpha: 0.3,
        edgeColor: [0, 0, 0],
      },
      highlightMaterial: { fill: true, edges: true, fillAlpha: 0.3, edgeColor: [1, 1, 0] },
      models: {},
      canvas: { canvas: document.createElement("canvas") },
    },
    camera: {
      projection: "perspective",
      eye: [-10, 10, -10],
      look: [0, 0, 0],
      up: [0, 1, 0],
    },
    cameraFlight: { flyTo: jest.fn(), jumpTo: jest.fn() },
    cameraControl: { on: jest.fn(), off: jest.fn(), navMode: "orbit" },
    metaScene: { metaObjects: {} },
    destroy: jest.fn(),
  })),
  SectionPlanesPlugin: jest.fn().mockImplementation(() => ({
    createSectionPlane: jest.fn(() => ({ id: "sp-1" })),
    sectionPlanes: {},
    showControl: jest.fn(),
    hideControl: jest.fn(),
    destroySectionPlane: jest.fn(),
    clear: jest.fn(),
  })),
  NavCubePlugin: jest.fn(),
}));

import JSZip from "jszip";
import { BCFService } from "../../src/tools/BCFService";
import { ViewerCore } from "../../src/viewer/ViewerCore";
import { AnnotationService } from "../../src/annotations/AnnotationService";

describe("BCFService", () => {
  let viewer: ViewerCore;
  let annotations: AnnotationService;
  let bcfService: BCFService;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="viewer-canvas" width="200" height="200"></canvas>
      <div id="properties-panel"></div>
    `;
    viewer = new ViewerCore("viewer-canvas");
    annotations = new AnnotationService(viewer);
    bcfService = new BCFService(viewer, annotations, "test-project");
  });

  describe("export", () => {
    it("exports an empty BCF zip when no annotations", async () => {
      const blob = await bcfService.exportBCF(false);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);

      // Verify zip structure
      const zip = await JSZip.loadAsync(blob);
      expect(zip.file("bcf.version")).not.toBeNull();
      expect(zip.file("project.bcfp")).not.toBeNull();
    });

    it("exports annotations as BCF topics", async () => {
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [1, 2, 3] },
        author: "tester",
        comment: "Test issue",
        severity: "warning",
        status: "open",
      });

      const blob = await bcfService.exportBCF(false);
      const zip = await JSZip.loadAsync(blob);

      // Should have bcf.version + project.bcfp + one topic folder
      const files = Object.keys(zip.files);
      expect(files).toContain("bcf.version");
      expect(files).toContain("project.bcfp");

      // Find topic folder — has markup.bcf
      const markupFiles = files.filter((f) => f.endsWith("markup.bcf"));
      expect(markupFiles.length).toBe(1);

      // Read markup
      const markupContent = await zip.file(markupFiles[0])!.async("text");
      expect(markupContent).toContain("Test issue");
      expect(markupContent).toContain("tester");
    });

    it("includes viewpoint.bcfv for each topic", async () => {
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [0, 0, 0] },
        author: "user",
        comment: "Check viewpoint",
        severity: "info",
        status: "open",
      });

      const blob = await bcfService.exportBCF(false);
      const zip = await JSZip.loadAsync(blob);

      const vpFiles = Object.keys(zip.files).filter((f) => f.endsWith("viewpoint.bcfv"));
      expect(vpFiles.length).toBe(1);

      const vpContent = await zip.file(vpFiles[0])!.async("text");
      expect(vpContent).toContain("PerspectiveCamera");
      expect(vpContent).toContain("CameraViewPoint");
    });

    it("includes BCF version 2.1", async () => {
      const blob = await bcfService.exportBCF(false);
      const zip = await JSZip.loadAsync(blob);
      const version = await zip.file("bcf.version")!.async("text");
      expect(version).toContain("2.1");
    });

    it("maps annotation severity to BCF priority", async () => {
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [0, 0, 0] },
        author: "user",
        comment: "Critical issue",
        severity: "critical",
        status: "open",
      });

      const blob = await bcfService.exportBCF(false);
      const zip = await JSZip.loadAsync(blob);
      const markupFiles = Object.keys(zip.files).filter((f) => f.endsWith("markup.bcf"));
      const markup = await zip.file(markupFiles[0])!.async("text");
      expect(markup).toContain("<Priority>Critical</Priority>");
    });

    it("includes annotation viewpoint if available", async () => {
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [5, 5, 5] },
        author: "user",
        comment: "With viewpoint",
        severity: "info",
        status: "open",
        viewpoint: {
          eye: [10, 10, 10],
          look: [0, 0, 0],
          up: [0, 1, 0],
          selectedObjects: ["obj1"],
        },
      });

      const blob = await bcfService.exportBCF(false);
      const zip = await JSZip.loadAsync(blob);
      const vpFiles = Object.keys(zip.files).filter((f) => f.endsWith("viewpoint.bcfv"));
      const vpContent = await zip.file(vpFiles[0])!.async("text");
      expect(vpContent).toContain("<X>10</X>");
    });
  });

  describe("import", () => {
    it("imports BCF zip and creates annotations", async () => {
      // First export
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [1, 2, 3] },
        author: "origin",
        comment: "Round-trip test",
        severity: "error",
        status: "open",
      });

      const blob = await bcfService.exportBCF(false);
      const buf = await JSZip.loadAsync(blob).then((z) => z.generateAsync({ type: "uint8array" }));
      const countBefore = annotations.list().length;

      // Now import the exported zip
      const imported = await bcfService.importBCF(buf);
      expect(imported).toBe(1);
      expect(annotations.list().length).toBe(countBefore + 1);
    });

    it("throws on invalid zip data", async () => {
      const badData = new Uint8Array([110, 111, 116, 32, 97, 32, 122, 105, 112]); // "not a zip"
      await expect(bcfService.importBCF(badData)).rejects.toThrow("Invalid BCF file");
    });

    it("handles BCF zip without topics gracefully", async () => {
      const zip = new JSZip();
      zip.file("bcf.version", '<?xml version="1.0"?><Version VersionId="2.1"></Version>');
      const buf = await zip.generateAsync({ type: "uint8array" });

      const imported = await bcfService.importBCF(buf);
      expect(imported).toBe(0);
    });

    it("maps BCF priority to annotation severity", async () => {
      // Create a manually constructed BCF zip with Critical priority
      const zip = new JSZip();
      zip.file("bcf.version", '<?xml version="1.0"?><Version VersionId="2.1"></Version>');
      const topicFolder = zip.folder("topic-001");
      topicFolder!.file(
        "markup.bcf",
        `<?xml version="1.0"?>
         <Markup>
           <Topic Guid="topic-001" TopicType="text" TopicStatus="open">
             <Title>Critical bug</Title>
             <Description>Very critical</Description>
             <Priority>Critical</Priority>
             <CreationDate>2026-01-01T00:00:00Z</CreationDate>
             <ModifiedDate>2026-01-01T00:00:00Z</ModifiedDate>
             <CreationAuthor>admin</CreationAuthor>
           </Topic>
         </Markup>`,
      );
      topicFolder!.file(
        "viewpoint.bcfv",
        `<?xml version="1.0"?>
         <VisualizationInfo Guid="vp-001">
           <PerspectiveCamera>
             <CameraViewPoint><X>5</X><Y>5</Y><Z>5</Z></CameraViewPoint>
             <CameraDirection><X>-1</X><Y>-1</Y><Z>-1</Z></CameraDirection>
             <CameraUpVector><X>0</X><Y>1</Y><Z>0</Z></CameraUpVector>
             <FieldOfView>60</FieldOfView>
           </PerspectiveCamera>
         </VisualizationInfo>`,
      );

      const buf = await zip.generateAsync({ type: "uint8array" });
      await bcfService.importBCF(buf);

      const imported = annotations.list();
      const last = imported[imported.length - 1];
      expect(last.severity).toBe("critical");
      expect(last.comment).toBe("Very critical");
      expect(last.author).toBe("admin");
    });
  });

  describe("round-trip", () => {
    it("export → import produces equivalent annotations", async () => {
      annotations.add("test-project", {
        type: "text",
        anchor: { type: "world", worldPos: [10, 20, 30] },
        author: "roundtrip-user",
        comment: "Round-trip verification",
        severity: "warning",
        status: "in-progress",
      });

      const blob = await bcfService.exportBCF(false);
      const buf = await JSZip.loadAsync(blob).then((z) => z.generateAsync({ type: "uint8array" }));
      const originalCount = annotations.list().length;

      // Import back
      const importedCount = await bcfService.importBCF(buf);
      expect(importedCount).toBe(1);

      // Should now have 2 total (original + imported)
      expect(annotations.list().length).toBe(originalCount + 1);

      // The imported annotation should have similar data
      const all = annotations.list();
      const imported = all[all.length - 1];
      expect(imported.comment).toContain("Round-trip verification");
      expect(imported.author).toBe("roundtrip-user");
    });
  });

  describe("applyViewpoint", () => {
    it("sets camera eye/look/up from viewpoint", () => {
      bcfService.applyViewpoint({
        guid: "vp-test",
        eye: [100, 200, 300],
        look: [0, 0, 0],
        up: [0, 1, 0],
        projection: "perspective",
        selectedObjects: [],
      });

      expect(viewer.viewer.camera.eye).toEqual([100, 200, 300]);
      expect(viewer.viewer.camera.look).toEqual([0, 0, 0]);
      expect(viewer.viewer.camera.projection).toBe("perspective");
    });

    it("applies ortho projection", () => {
      bcfService.applyViewpoint({
        guid: "vp-ortho",
        eye: [0, 50, 0],
        look: [0, 0, 0],
        up: [0, 0, -1],
        projection: "ortho",
        selectedObjects: [],
      });

      expect(viewer.viewer.camera.projection).toBe("ortho");
    });

    it("selects objects referenced in viewpoint", () => {
      bcfService.applyViewpoint({
        guid: "vp-sel",
        eye: [0, 0, 10],
        look: [0, 0, 0],
        up: [0, 1, 0],
        projection: "perspective",
        selectedObjects: ["obj1", "obj2"],
      });

      expect(viewer.viewer.scene.setObjectsSelected).toHaveBeenCalledWith(["obj1", "obj2"], true);
    });
  });

  describe("downloadBCF", () => {
    it("triggers a download", async () => {
      const appendSpy = jest
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => null as any);
      const removeSpy = jest.fn();

      HTMLAnchorElement.prototype.click = jest.fn();
      HTMLAnchorElement.prototype.remove = removeSpy;

      // Reset the polyfilled mock to track calls
      (URL.revokeObjectURL as jest.Mock).mockClear();

      await bcfService.downloadBCF("test.bcf");

      expect(appendSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();

      appendSpy.mockRestore();
    });
  });
});
