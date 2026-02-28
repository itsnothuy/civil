/**
 * TreeView.ts
 *
 * Wraps xeokit TreeViewPlugin to provide an IFC model hierarchy tree
 * in the left sidebar. Clicking a node flies the camera to that object
 * and selects it via ViewerCore.selectEntity() so all listeners
 * (PropertiesPanel, etc.) are notified.
 */

import { TreeViewPlugin } from "@xeokit/xeokit-sdk";

import type { ViewerCore } from "../viewer/ViewerCore";

export class TreeView {
  private _viewer: ViewerCore;
  private _treeView: TreeViewPlugin;
  private _contextMenu: HTMLElement | null = null;

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

    // Clicking a tree node → fly to + select via ViewerCore (fires all listeners)
    this._treeView.on("nodeTitleClicked", (e) => {
      const objectId = e.treeViewNode.objectId;
      const entity = this._viewer.viewer.scene.objects[objectId];
      if (!entity) return;

      // Select through ViewerCore so all listeners (PropertiesPanel, etc.) are notified
      this._viewer.selectEntity(objectId);

      // Fly camera to entity
      this._viewer.viewer.cameraFlight.flyTo({ aabb: entity.aabb, duration: 0.5 });
    });

    // Right-click context menu for isolate/hide/show
    this._initContextMenu(containerId);

    // Arrow key navigation within tree
    this._initArrowKeyNav(containerId);
  }

  /** Initialize right-click context menu on tree nodes */
  private _initContextMenu(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create context menu element
    this._contextMenu = document.createElement("div");
    this._contextMenu.className = "tree-context-menu";
    this._contextMenu.style.display = "none";
    this._contextMenu.setAttribute("role", "menu");
    this._contextMenu.setAttribute("aria-label", "Object actions");
    this._contextMenu.innerHTML = `
      <button role="menuitem" data-action="isolate" aria-label="Isolate object">Isolate</button>
      <button role="menuitem" data-action="hide" aria-label="Hide object">Hide</button>
      <button role="menuitem" data-action="show-all" aria-label="Show all objects">Show All</button>
    `;
    document.body.appendChild(this._contextMenu);

    let targetObjectId: string | null = null;

    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // Find the closest tree node link
      const target = e.target as HTMLElement;
      const nodeLink = target.closest("a[data-treenodeid]") as HTMLElement | null;
      if (!nodeLink) {
        this._hideContextMenu();
        return;
      }

      // Extract object ID from the tree node
      const nodeId = nodeLink.dataset.treenodeid;
      if (!nodeId) return;

      // xeokit TreeViewPlugin stores objectId on tree nodes
      const scene = this._viewer.viewer.scene;
      targetObjectId = scene.objects[nodeId] ? nodeId : null;
      if (!targetObjectId) return;

      // Position and show menu
      this._contextMenu!.style.display = "block";
      this._contextMenu!.style.left = `${e.clientX}px`;
      this._contextMenu!.style.top = `${e.clientY}px`;
    });

    // Handle menu actions
    this._contextMenu.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn || !targetObjectId) return;

      const action = btn.dataset.action;
      const scene = this._viewer.viewer.scene;

      switch (action) {
        case "isolate":
          // X-ray everything, un-xray target
          scene.setObjectsXRayed(scene.objectIds, true);
          scene.setObjectsXRayed([targetObjectId], false);
          scene.setObjectsHighlighted(scene.highlightedObjectIds, false);
          scene.setObjectsHighlighted([targetObjectId], true);
          break;
        case "hide":
          scene.setObjectsVisible([targetObjectId], false);
          break;
        case "show-all":
          scene.setObjectsVisible(scene.objectIds, true);
          scene.setObjectsXRayed(scene.objectIds, false);
          break;
      }

      this._hideContextMenu();
    });

    // Close menu on click elsewhere
    document.addEventListener("click", () => this._hideContextMenu());
  }

  /**
   * Arrow-key navigation within the tree panel.
   * Up/Down to move focus between nodes, Left to collapse parent,
   * Right to expand current node, Enter/Space to select.
   */
  private _initArrowKeyNav(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.setAttribute("tabindex", "0");
    container.setAttribute("role", "tree");

    container.addEventListener("keydown", (e: KeyboardEvent) => {
      const links = Array.from(container.querySelectorAll<HTMLElement>("a[data-treenodeid]"));
      if (links.length === 0) return;

      // Find the currently focused node
      const focused = document.activeElement as HTMLElement | null;
      let idx = focused ? links.indexOf(focused) : -1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          idx = idx < links.length - 1 ? idx + 1 : 0;
          links[idx].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          idx = idx > 0 ? idx - 1 : links.length - 1;
          links[idx].focus();
          break;
        case "ArrowRight":
          // Expand: click the toggle (if tree node is collapsed)
          if (focused) {
            const li = focused.closest("li");
            const toggle = li?.querySelector<HTMLElement>(".xeokit-toggle");
            if (toggle && !li?.classList.contains("xeokit-open")) toggle.click();
          }
          break;
        case "ArrowLeft":
          // Collapse: click the toggle (if tree node is expanded)
          if (focused) {
            const li = focused.closest("li");
            const toggle = li?.querySelector<HTMLElement>(".xeokit-toggle");
            if (toggle && li?.classList.contains("xeokit-open")) {
              toggle.click();
            } else {
              // Move to parent node
              const parentLi = li?.parentElement?.closest("li");
              const parentLink = parentLi?.querySelector<HTMLElement>("a[data-treenodeid]");
              parentLink?.focus();
            }
          }
          break;
        case "Enter":
        case " ":
          // Select the focused node
          e.preventDefault();
          if (focused && focused.hasAttribute("data-treenodeid")) {
            focused.click();
          }
          break;
        case "Home":
          e.preventDefault();
          links[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          links[links.length - 1]?.focus();
          break;
      }
    });
  }

  private _hideContextMenu(): void {
    if (this._contextMenu) {
      this._contextMenu.style.display = "none";
    }
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

  /** Destroy the tree view and remove context menu */
  destroy(): void {
    this._contextMenu?.remove();
    this._treeView.destroy();
  }
}
