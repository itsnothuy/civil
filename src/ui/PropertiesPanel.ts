/**
 * PropertiesPanel.ts
 *
 * Displays IFC metadata for the currently selected object in the
 * #properties-panel sidebar element. Reads from xeokit's MetaScene.
 */

import type { ViewerCore } from "../viewer/ViewerCore";

export class PropertiesPanel {
  private _viewer: ViewerCore;
  private _panelEl: HTMLElement | null;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
    this._panelEl = document.getElementById("properties-panel");
  }

  /** Show properties for the given entity ID */
  show(entityId: string): void {
    if (!this._panelEl) return;

    const metaObject = this._viewer.viewer.metaScene.metaObjects[entityId];
    if (!metaObject) {
      this._panelEl.innerHTML = `<p class="muted">No metadata for object <code>${entityId}</code></p>`;
      return;
    }

    let html = `<h3>${metaObject.name ?? entityId}</h3>`;
    html += `<dl>`;
    html += `<dt>Type</dt><dd>${metaObject.type ?? "Unknown"}</dd>`;

    if (metaObject.parent) {
      html += `<dt>Parent</dt><dd>${metaObject.parent.name ?? metaObject.parent.id}</dd>`;
    }

    // Render property sets if available
    const propertySets = metaObject.propertySets;
    if (propertySets && propertySets.length > 0) {
      for (const pset of propertySets) {
        html += `</dl><h4>${pset.name ?? "Properties"}</h4><dl>`;
        if (pset.properties) {
          for (const prop of pset.properties) {
            html += `<dt>${prop.name}</dt><dd>${prop.value ?? "—"}</dd>`;
          }
        }
      }
    }

    html += `</dl>`;
    this._panelEl.innerHTML = html;
  }

  /** Hide / reset the properties panel */
  hide(): void {
    if (this._panelEl) {
      this._panelEl.innerHTML = `<p>Select an object to view properties.</p>`;
    }
  }
}
