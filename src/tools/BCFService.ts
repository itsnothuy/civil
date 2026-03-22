/**
 * BCFService.ts
 *
 * BCF (BIM Collaboration Format) 2.1 export/import service.
 * Generates and parses BCF 2.1 zip files containing:
 *   - bcf.version
 *   - markup.bcf (per topic — one topic per annotation)
 *   - viewpoint.bcfv (camera position + selected objects)
 *   - snapshot.png (canvas screenshot)
 *
 * Phase 5, Task 5.3
 *
 * @see https://github.com/buildingSMART/BCF-XML/tree/release_2_1
 */

import JSZip from "jszip";

import type { ViewerCore } from "../viewer/ViewerCore";
import type { AnnotationService, Annotation } from "../annotations/AnnotationService";

/** BCF 2.1 version XML */
const BCF_VERSION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Version VersionId="2.1" xsi:noNamespaceSchemaLocation="version.xsd"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DetailedVersion>2.1</DetailedVersion>
</Version>`;

/** BCF project info XML */
function projectInfoXml(projectId: string, name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ProjectExtension xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Project ProjectId="${escXml(projectId)}">
    <Name>${escXml(name)}</Name>
  </Project>
</ProjectExtension>`;
}

/** Escape XML special characters */
function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Camera viewpoint data used internally */
export interface BCFViewpoint {
  guid: string;
  eye: [number, number, number];
  look: [number, number, number];
  up: [number, number, number];
  fieldOfView?: number;
  projection: "perspective" | "ortho";
  selectedObjects: string[];
}

/** A single BCF topic (corresponds to one annotation/issue) */
export interface BCFTopic {
  guid: string;
  title: string;
  description: string;
  author: string;
  creationDate: string;
  modifiedDate: string;
  priority: string;
  status: string;
  type: string;
  viewpoint?: BCFViewpoint;
  snapshotData?: string; // base64 PNG
}

export class BCFService {
  private _viewer: ViewerCore;
  private _annotations: AnnotationService;
  private _projectId: string;

  constructor(viewer: ViewerCore, annotations: AnnotationService, projectId: string) {
    this._viewer = viewer;
    this._annotations = annotations;
    this._projectId = projectId;
  }

  // ── Export ─────────────────────────────────────────────

  /**
   * Export annotations as a BCF 2.1 zip file.
   * Each annotation becomes a BCF topic with a viewpoint and optional snapshot.
   */
  async exportBCF(includeSnapshots = true): Promise<Blob> {
    const zip = new JSZip();
    const annotations = this._annotations.list();

    // BCF version file
    zip.file("bcf.version", BCF_VERSION_XML);

    // Project info
    zip.file(
      "project.bcfp",
      projectInfoXml(this._projectId, `Civil BIM Viewer — ${this._projectId}`),
    );

    // Capture current camera for every annotation that lacks a viewpoint
    const currentViewpoint = this._getCurrentViewpoint();

    // One topic folder per annotation
    for (const ann of annotations) {
      const topicGuid = ann.id;
      const folder = zip.folder(topicGuid);
      if (!folder) continue;

      // Build viewpoint from annotation data or current camera
      const vp = this._buildViewpoint(ann, currentViewpoint);

      // markup.bcf
      folder.file("markup.bcf", this._markupXml(ann, vp));

      // viewpoint.bcfv
      folder.file("viewpoint.bcfv", this._viewpointXml(vp));

      // snapshot.png (optional)
      if (includeSnapshots) {
        const snapshotData = this._captureSnapshot();
        if (snapshotData) {
          const base64 = snapshotData.split(",")[1];
          if (base64) {
            folder.file("snapshot.png", base64, { base64: true });
          }
        }
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    console.info(`[BCFService] Exported ${annotations.length} topic(s) as BCF 2.1 zip.`);
    return blob;
  }

  /** Trigger download of the BCF zip file */
  async downloadBCF(filename?: string): Promise<void> {
    const blob = await this.exportBCF();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${this._projectId}-issues.bcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Import ─────────────────────────────────────────────

  /**
   * Import a BCF 2.1 zip file.
   * Parses topics, restores annotations, and optionally applies viewpoints.
   * Returns the number of topics imported.
   */
  async importBCF(file: File | Blob | ArrayBuffer | Uint8Array): Promise<number> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch {
      throw new Error("Invalid BCF file: unable to read zip archive.");
    }

    // Verify BCF version
    const versionFile = zip.file("bcf.version");
    if (versionFile) {
      const versionContent = await versionFile.async("text");
      if (!versionContent.includes("2.1") && !versionContent.includes("2.0")) {
        console.warn("[BCFService] BCF version is not 2.1; attempting import anyway.");
      }
    }

    // Find topic folders (each folder with a markup.bcf)
    const topics: BCFTopic[] = [];
    const folders = new Set<string>();

    zip.forEach((relativePath) => {
      const parts = relativePath.split("/");
      if (parts.length >= 2 && parts[1] === "markup.bcf") {
        folders.add(parts[0]);
      }
    });

    for (const folderName of folders) {
      const markupFile = zip.file(`${folderName}/markup.bcf`);
      if (!markupFile) continue;

      const markupXml = await markupFile.async("text");
      const topic = this._parseMarkupXml(markupXml, folderName);

      // Try to parse viewpoint
      const vpFile = zip.file(`${folderName}/viewpoint.bcfv`);
      if (vpFile) {
        const vpXml = await vpFile.async("text");
        topic.viewpoint = this._parseViewpointXml(vpXml, folderName);
      }

      topics.push(topic);
    }

    // Convert BCF topics to annotations
    let imported = 0;
    for (const topic of topics) {
      this._topicToAnnotation(topic);
      imported++;
    }

    console.info(`[BCFService] Imported ${imported} topic(s) from BCF zip.`);
    return imported;
  }

  // ── Round-trip helpers ─────────────────────────────────

  /** Apply a BCF viewpoint to the viewer camera */
  applyViewpoint(viewpoint: BCFViewpoint): void {
    const camera = this._viewer.viewer.camera;
    camera.eye = viewpoint.eye;
    camera.look = viewpoint.look;
    camera.up = viewpoint.up;
    camera.projection = viewpoint.projection === "ortho" ? "ortho" : "perspective";

    // Select objects referenced in the viewpoint
    if (viewpoint.selectedObjects.length > 0) {
      const scene = this._viewer.viewer.scene;
      scene.setObjectsSelected(scene.selectedObjectIds, false);
      const valid = viewpoint.selectedObjects.filter((id) => scene.objects[id]);
      scene.setObjectsSelected(valid, true);
    }
  }

  // ── XML generation (private) ───────────────────────────

  private _markupXml(ann: Annotation, vp: BCFViewpoint): string {
    const severityMap: Record<string, string> = {
      critical: "Critical",
      error: "Major",
      warning: "Normal",
      info: "Minor",
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Topic Guid="${escXml(ann.id)}" TopicType="${escXml(ann.type)}" TopicStatus="${escXml(ann.status)}">
    <Title>${escXml(ann.comment.substring(0, 100))}</Title>
    <Description>${escXml(ann.comment)}</Description>
    <Priority>${escXml(severityMap[ann.severity] ?? "Normal")}</Priority>
    <CreationDate>${escXml(ann.createdAt)}</CreationDate>
    <ModifiedDate>${escXml(ann.updatedAt)}</ModifiedDate>
    <CreationAuthor>${escXml(ann.author)}</CreationAuthor>
  </Topic>
  <Viewpoints>
    <ViewPoint Guid="${escXml(vp.guid)}">
      <Viewpoint>viewpoint.bcfv</Viewpoint>
      <Snapshot>snapshot.png</Snapshot>
    </ViewPoint>
  </Viewpoints>
  <Comment>
    <Date>${escXml(ann.createdAt)}</Date>
    <Author>${escXml(ann.author)}</Author>
    <Comment>${escXml(ann.comment)}</Comment>
    <Viewpoint Guid="${escXml(vp.guid)}" />
  </Comment>
</Markup>`;
  }

  private _viewpointXml(vp: BCFViewpoint): string {
    const cameraTag =
      vp.projection === "ortho"
        ? `<OrthogonalCamera>
      <CameraViewPoint><X>${vp.eye[0]}</X><Y>${vp.eye[1]}</Y><Z>${vp.eye[2]}</Z></CameraViewPoint>
      <CameraDirection><X>${vp.look[0] - vp.eye[0]}</X><Y>${vp.look[1] - vp.eye[1]}</Y><Z>${vp.look[2] - vp.eye[2]}</Z></CameraDirection>
      <CameraUpVector><X>${vp.up[0]}</X><Y>${vp.up[1]}</Y><Z>${vp.up[2]}</Z></CameraUpVector>
      <ViewToWorldScale>1</ViewToWorldScale>
    </OrthogonalCamera>`
        : `<PerspectiveCamera>
      <CameraViewPoint><X>${vp.eye[0]}</X><Y>${vp.eye[1]}</Y><Z>${vp.eye[2]}</Z></CameraViewPoint>
      <CameraDirection><X>${vp.look[0] - vp.eye[0]}</X><Y>${vp.look[1] - vp.eye[1]}</Y><Z>${vp.look[2] - vp.eye[2]}</Z></CameraDirection>
      <CameraUpVector><X>${vp.up[0]}</X><Y>${vp.up[1]}</Y><Z>${vp.up[2]}</Z></CameraUpVector>
      <FieldOfView>${vp.fieldOfView ?? 60}</FieldOfView>
    </PerspectiveCamera>`;

    let selectionXml = "";
    if (vp.selectedObjects.length > 0) {
      selectionXml = `\n  <Selection>`;
      for (const oid of vp.selectedObjects) {
        selectionXml += `\n    <Component IfcGuid="${escXml(oid)}" />`;
      }
      selectionXml += `\n  </Selection>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<VisualizationInfo Guid="${escXml(vp.guid)}">
  ${cameraTag}${selectionXml}
</VisualizationInfo>`;
  }

  // ── XML parsing (private) ──────────────────────────────

  private _parseMarkupXml(xml: string, folderGuid: string): BCFTopic {
    const topic: BCFTopic = {
      guid: folderGuid,
      title: this._extractXmlTag(xml, "Title") ?? "Untitled",
      description: this._extractXmlTag(xml, "Description") ?? "",
      author: this._extractXmlTag(xml, "CreationAuthor") ?? "unknown",
      creationDate: this._extractXmlTag(xml, "CreationDate") ?? new Date().toISOString(),
      modifiedDate: this._extractXmlTag(xml, "ModifiedDate") ?? new Date().toISOString(),
      priority: this._extractXmlTag(xml, "Priority") ?? "Normal",
      status: this._extractXmlAttr(xml, "Topic", "TopicStatus") ?? "open",
      type: this._extractXmlAttr(xml, "Topic", "TopicType") ?? "text",
    };
    return topic;
  }

  private _parseViewpointXml(xml: string, guid: string): BCFViewpoint {
    const isPerspective = xml.includes("<PerspectiveCamera>");
    const cameraTag = isPerspective ? "PerspectiveCamera" : "OrthogonalCamera";

    const viewPointSection = this._extractXmlSection(xml, cameraTag);
    const eye = this._parseXYZ(viewPointSection, "CameraViewPoint");
    const dir = this._parseXYZ(viewPointSection, "CameraDirection");
    const up = this._parseXYZ(viewPointSection, "CameraUpVector");

    // Reconstruct look from eye + direction
    const look: [number, number, number] = [eye[0] + dir[0], eye[1] + dir[1], eye[2] + dir[2]];

    // Parse selected objects
    const selectedObjects: string[] = [];
    const selectionMatch = xml.match(/<Component\s+IfcGuid="([^"]+)"/g);
    if (selectionMatch) {
      for (const m of selectionMatch) {
        const guidMatch = m.match(/IfcGuid="([^"]+)"/);
        if (guidMatch) selectedObjects.push(guidMatch[1]);
      }
    }

    return {
      guid,
      eye,
      look,
      up,
      projection: isPerspective ? "perspective" : "ortho",
      selectedObjects,
    };
  }

  // ── XML utility methods ────────────────────────────────

  /** Extract text content of an XML tag */
  private _extractXmlTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  /** Extract an attribute from an XML tag */
  private _extractXmlAttr(xml: string, tagName: string, attrName: string): string | null {
    const tagRegex = new RegExp(`<${tagName}\\s[^>]*${attrName}="([^"]*)"`, "i");
    const match = xml.match(tagRegex);
    return match ? match[1] : null;
  }

  /** Extract the full section between opening and closing tags */
  private _extractXmlSection(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1] : "";
  }

  /** Parse X, Y, Z values from a parent element */
  private _parseXYZ(section: string, parentTag: string): [number, number, number] {
    const parent = this._extractXmlSection(section, parentTag);
    const x = parseFloat(this._extractXmlTag(parent, "X") ?? "0");
    const y = parseFloat(this._extractXmlTag(parent, "Y") ?? "0");
    const z = parseFloat(this._extractXmlTag(parent, "Z") ?? "0");
    return [x, y, z];
  }

  // ── Viewpoint helpers ──────────────────────────────────

  private _getCurrentViewpoint(): BCFViewpoint {
    const camera = this._viewer.viewer.camera;
    return {
      guid: this._generateGuid(),
      eye: [...camera.eye] as [number, number, number],
      look: [...camera.look] as [number, number, number],
      up: [...camera.up] as [number, number, number],
      projection: camera.projection === "ortho" ? "ortho" : "perspective",
      selectedObjects: [...this._viewer.viewer.scene.selectedObjectIds],
    };
  }

  private _buildViewpoint(ann: Annotation, fallback: BCFViewpoint): BCFViewpoint {
    if (ann.viewpoint) {
      return {
        guid: this._generateGuid(),
        eye: ann.viewpoint.eye,
        look: ann.viewpoint.look,
        up: ann.viewpoint.up,
        projection: "perspective",
        selectedObjects: ann.viewpoint.selectedObjects,
      };
    }
    return { ...fallback, guid: this._generateGuid() };
  }

  /** Capture a screenshot from the viewer canvas */
  private _captureSnapshot(): string | null {
    try {
      const canvas = document.getElementById("viewer-canvas") as HTMLCanvasElement | null;
      if (canvas) {
        return canvas.toDataURL("image/png");
      }
    } catch {
      // Canvas may be tainted or context lost
    }
    return null;
  }

  /** Generate a simple GUID-like string */
  private _generateGuid(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ── Topic → Annotation conversion ─────────────────────

  private _topicToAnnotation(topic: BCFTopic): void {
    const priorityToSeverity: Record<string, string> = {
      Critical: "critical",
      Major: "error",
      Normal: "warning",
      Minor: "info",
    };

    const viewpoint = topic.viewpoint
      ? {
          eye: topic.viewpoint.eye,
          look: topic.viewpoint.look,
          up: topic.viewpoint.up,
          selectedObjects: topic.viewpoint.selectedObjects,
        }
      : undefined;

    this._annotations.add(this._projectId, {
      type:
        topic.type === "text" || topic.type === "measurement" || topic.type === "markup"
          ? (topic.type as "text" | "measurement" | "markup")
          : "text",
      anchor: {
        type: "world",
        worldPos: topic.viewpoint?.eye ?? [0, 0, 0],
      },
      author: topic.author,
      comment: topic.description || topic.title,
      severity: (priorityToSeverity[topic.priority] ?? "info") as
        | "info"
        | "warning"
        | "error"
        | "critical",
      status: this._mapStatus(topic.status),
      viewpoint,
    });
  }

  private _mapStatus(bcfStatus: string): "open" | "in-progress" | "resolved" | "closed" {
    const lower = bcfStatus.toLowerCase();
    if (lower === "closed" || lower === "done") return "closed";
    if (lower === "resolved") return "resolved";
    if (lower === "in-progress" || lower === "active") return "in-progress";
    return "open";
  }
}
