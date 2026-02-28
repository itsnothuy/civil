/**
 * TreeView.ts
 *
 * Wraps xeokit TreeViewPlugin to provide an IFC model hierarchy tree
 * in the left sidebar. Clicking a node flies the camera to that object
 * and selects it.
 */

import { TreeViewPlugin } from "@xeokit/xeokit-sdk";

import type { ViewerCore } from "../viewer/ViewerCore";

export class TreeView {
  private _viewer: ViewerCore;
  private _treeView: TreeViewPlugin;

  constructor(viewer: ViewerCore, containerId: string) {
    this._viewer = viewer;

    this._treeView = new TreeViewPlugin(viewer.viewer, {
      containerElementId: containerId,
      autoAddModels: true,
      autoExpandDepth: 1,
      hierarchy: "containment",
      sortNodes: true,
      pruneEmptyNodes: true,
    });

    // Clicking a tree node → fly to + select the entity
    this._treeView.on("nodeTitleClicked", (e) => {
      const objectId = e.treeViewNode.objectId;
      const scene = this._viewer.viewer.scene;
      const entity = scene.objects[objectId];
      if (!entity) return;

      // Clear previous selection
      scene.setObjectsSelected(scene.selectedObjectIds, false);
      scene.setObjectsHighlighted(scene.highlightedObjectIds, false);

      // Select + highlight
      entity.selected = true;
      entity.highlighted = true;

      // Fly camera to entity
      this._viewer.viewer.cameraFlight.flyTo({ aabb: entity.aabb, duration: 0.5 });
    });
  }

  /** Get the underlying TreeViewPlugin for advanced usage */
  get plugin(): TreeViewPlugin {
    return this._treeView;
  }

  /** Switch the tree hierarchy mode */
  setHierarchy(mode: "containment" | "storeys" | "types"): void {
    this._treeView.hierarchy = mode;
  }

  /** Highlight a node in the tree for a given object ID */
  showNode(objectId: string): void {
    this._treeView.showNode(objectId);
  }

  /** Collapse the entire tree */
  collapse(): void {
    this._treeView.collapse();
  }

  /** Expand tree to a given depth */
  expandToDepth(depth: number): void {
    this._treeView.expandToDepth(depth);
  }

  destroy(): void {
    this._treeView.destroy();
  }
}
