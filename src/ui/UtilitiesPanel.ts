/**
 * UtilitiesPanel.ts
 *
 * Utilities & Underground Context panel. Displays pipe/duct metadata
 * (diameter, material) from IFC property sets (Pset_*). Provides
 * "What's below" toggle for underground infrastructure with
 * semi-transparent rendering.
 *
 * Phase 5, Task 5.4
 */

import type { ViewerCore } from "../viewer/ViewerCore";

// ── IFC types considered "underground" or "utility" infrastructure ──

/** IFC types for pipe/duct infrastructure */
const UTILITY_IFC_TYPES = new Set([
  "IfcPipeSegment",
  "IfcPipeFitting",
  "IfcDuctSegment",
  "IfcDuctFitting",
  "IfcCableSegment",
  "IfcCableFitting",
  "IfcCableCarrierSegment",
  "IfcCableCarrierFitting",
  "IfcFlowTerminal",
  "IfcDistributionElement",
  "IfcValve",
  "IfcPump",
  "IfcTank",
  "IfcFlowMeter",
]);

/** IFC types typically placed underground */
const UNDERGROUND_IFC_TYPES = new Set([
  "IfcPipeSegment",
  "IfcPipeFitting",
  "IfcCableSegment",
  "IfcCableFitting",
  "IfcCableCarrierSegment",
  "IfcCableCarrierFitting",
  "IfcFooting",
  "IfcPile",
]);

/** Property sets to look for metadata */
const UTILITY_PSET_PREFIXES = ["Pset_", "Qto_", "CPset_", "ePset_"];

/** Metadata extracted from an IFC utility object */
export interface UtilityMetadata {
  id: string;
  name: string;
  ifcType: string;
  diameter?: string;
  material?: string;
  length?: string;
  elevation?: string;
  properties: Record<string, string>;
}

export class UtilitiesPanel {
  private _viewer: ViewerCore;
  private _containerId: string;
  private _utilityObjects: Map<string, UtilityMetadata> = new Map();
  private _undergroundIds: string[] = [];
  private _undergroundVisible = false;
  private _undergroundTransparent = true;
  private _selectedUtility: string | null = null;

  constructor(viewer: ViewerCore, containerId: string) {
    this._viewer = viewer;
    this._containerId = containerId;
  }

  // ── Public API ──────────────────────────────────────────

  /** Initialize the panel — scan metadata for utility objects */
  init(): void {
    this._scanUtilities();
    this._scanUnderground();
    this._render();
    this._bindEvents();
    console.info(
      `[UtilitiesPanel] Found ${this._utilityObjects.size} utility object(s), ` +
        `${this._undergroundIds.length} underground element(s).`,
    );
  }

  /** Get all detected utility objects */
  get utilities(): ReadonlyMap<string, UtilityMetadata> {
    return this._utilityObjects;
  }

  /** Get underground object IDs */
  get undergroundIds(): readonly string[] {
    return this._undergroundIds;
  }

  /** Whether underground is currently shown */
  get undergroundVisible(): boolean {
    return this._undergroundVisible;
  }

  /** Whether underground rendering uses semi-transparency */
  get undergroundTransparent(): boolean {
    return this._undergroundTransparent;
  }

  /** Toggle underground visibility ("What's below" button) */
  toggleUnderground(): void {
    this._undergroundVisible = !this._undergroundVisible;
    this._applyUndergroundVisibility();
    this._render();
  }

  /** Show underground utilities */
  showUnderground(): void {
    this._undergroundVisible = true;
    this._applyUndergroundVisibility();
    this._render();
  }

  /** Hide underground utilities */
  hideUnderground(): void {
    this._undergroundVisible = false;
    this._applyUndergroundVisibility();
    this._render();
  }

  /** Toggle semi-transparent mode for underground */
  setTransparentMode(enabled: boolean): void {
    this._undergroundTransparent = enabled;
    if (this._undergroundVisible) {
      this._applyUndergroundVisibility();
    }
    this._render();
  }

  /** Select a utility object — shows its metadata and highlights it */
  selectUtility(id: string): void {
    this._selectedUtility = id;
    const scene = this._viewer.viewer.scene;
    scene.setObjectsSelected(scene.selectedObjectIds, false);
    if (scene.objects[id]) {
      scene.setObjectsSelected([id], true);
    }
    this._render();
  }

  /** Get metadata for a specific utility object */
  getUtilityMetadata(id: string): UtilityMetadata | undefined {
    return this._utilityObjects.get(id);
  }

  /** Destroy the panel */
  destroy(): void {
    const container = document.getElementById(this._containerId);
    if (container) {
      container.removeEventListener("click", this._handleClick);
      container.innerHTML = "";
    }
  }

  // ── Scanning ────────────────────────────────────────────

  /** Scan model metadata for utility objects and extract Pset properties */
  private _scanUtilities(): void {
    this._utilityObjects.clear();
    const metaObjects = this._viewer.viewer.metaScene?.metaObjects;
    if (!metaObjects) return;

    for (const [id, meta] of Object.entries(metaObjects)) {
      const type = (meta as { type?: string }).type ?? "";
      if (!UTILITY_IFC_TYPES.has(type)) continue;

      const metaObj = meta as {
        type?: string;
        name?: string;
        propertySets?: Array<{
          name?: string;
          properties?: Array<{ name?: string; value?: string }>;
        }>;
      };

      const properties: Record<string, string> = {};
      let diameter: string | undefined;
      let material: string | undefined;
      let length: string | undefined;
      let elevation: string | undefined;

      // Extract properties from property sets
      if (metaObj.propertySets) {
        for (const pset of metaObj.propertySets) {
          const psetName = pset.name ?? "";
          const isUtilityPset = UTILITY_PSET_PREFIXES.some((p) => psetName.startsWith(p));
          if (!isUtilityPset && psetName !== "") continue;

          if (pset.properties) {
            for (const prop of pset.properties) {
              const propName = prop.name ?? "";
              const propValue = prop.value ?? "";
              properties[propName] = propValue;

              // Extract known properties
              const lower = propName.toLowerCase();
              if (lower.includes("diameter") || lower.includes("nominaldiameter")) {
                diameter = propValue;
              } else if (lower.includes("material")) {
                material = propValue;
              } else if (lower.includes("length") || lower.includes("nominallength")) {
                length = propValue;
              } else if (lower.includes("elevation") || lower.includes("height")) {
                elevation = propValue;
              }
            }
          }
        }
      }

      this._utilityObjects.set(id, {
        id,
        name: (metaObj.name as string) ?? id,
        ifcType: type,
        diameter,
        material,
        length,
        elevation,
        properties,
      });
    }
  }

  /** Identify underground elements (below grade or underground IFC types) */
  private _scanUnderground(): void {
    this._undergroundIds = [];
    const metaObjects = this._viewer.viewer.metaScene?.metaObjects;
    if (!metaObjects) return;

    for (const [id, meta] of Object.entries(metaObjects)) {
      const type = (meta as { type?: string }).type ?? "";

      // Match underground IFC types
      if (UNDERGROUND_IFC_TYPES.has(type)) {
        this._undergroundIds.push(id);
        continue;
      }

      // Also check if the object's bounding box is below grade (Y < 0)
      const sceneObj = this._viewer.viewer.scene.objects[id];
      if (sceneObj) {
        const aabb = (sceneObj as { aabb?: number[] }).aabb;
        if (aabb && aabb[4] < 0) {
          // aabb[4] = maxY — if even the top is below 0, it's underground
          this._undergroundIds.push(id);
        }
      }
    }
  }

  // ── Rendering ───────────────────────────────────────────

  private _applyUndergroundVisibility(): void {
    const scene = this._viewer.viewer.scene;
    const ids = this._undergroundIds.filter((id) => scene.objects[id]);
    if (ids.length === 0) return;

    if (this._undergroundVisible) {
      scene.setObjectsVisible(ids, true);
      if (this._undergroundTransparent) {
        scene.setObjectsXRayed(ids, true);
      } else {
        scene.setObjectsXRayed(ids, false);
      }
    } else {
      scene.setObjectsVisible(ids, false);
      scene.setObjectsXRayed(ids, false);
    }
  }

  private _render(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    let html = `<h4>Utilities &amp; Underground</h4>`;

    // Underground controls
    html += `<div class="utilities-controls">`;
    html += `<button class="utilities-btn" data-utilities-action="toggle-underground" `;
    html += `aria-label="${this._undergroundVisible ? "Hide" : "Show"} underground utilities">`;
    html += `${this._undergroundVisible ? "Hide" : "Show"} Underground`;
    html += `</button>`;
    html += `<label class="utilities-xray-toggle">`;
    html += `<input type="checkbox" data-utilities-action="transparent-toggle" `;
    html += `${this._undergroundTransparent ? "checked" : ""} `;
    html += `aria-label="Semi-transparent underground rendering" /> Semi-transparent`;
    html += `</label>`;
    html += `<span class="utilities-count">${this._undergroundIds.length} underground element(s)</span>`;
    html += `</div>`;

    // Utility list
    if (this._utilityObjects.size === 0) {
      html += `<p class="utilities-empty">No utility objects found in model.</p>`;
    } else {
      html += `<div class="utilities-list">`;
      html += `<h5>Pipe/Duct Objects (${this._utilityObjects.size})</h5>`;
      for (const util of this._utilityObjects.values()) {
        const isSelected = util.id === this._selectedUtility;
        const cls = isSelected ? "utilities-item selected" : "utilities-item";
        html += `<div class="${cls}" data-utility-id="${this._escapeHtml(util.id)}">`;
        html += `<span class="utilities-item-name">${this._escapeHtml(util.name)}</span>`;
        html += `<span class="utilities-item-type">${this._escapeHtml(util.ifcType)}</span>`;
        if (util.diameter) {
          html += `<span class="utilities-item-meta">⌀ ${this._escapeHtml(util.diameter)}</span>`;
        }
        if (util.material) {
          html += `<span class="utilities-item-meta">Material: ${this._escapeHtml(util.material)}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Selected utility detail
    if (this._selectedUtility) {
      const util = this._utilityObjects.get(this._selectedUtility);
      if (util) {
        html += this._renderDetail(util);
      }
    }

    container.innerHTML = html;
  }

  private _renderDetail(util: UtilityMetadata): string {
    let html = `<div class="utilities-detail">`;
    html += `<h5>${this._escapeHtml(util.name)}</h5>`;
    html += `<table class="utilities-detail-table">`;
    html += `<tr><td>Type</td><td>${this._escapeHtml(util.ifcType)}</td></tr>`;
    if (util.diameter) {
      html += `<tr><td>Diameter</td><td>${this._escapeHtml(util.diameter)}</td></tr>`;
    }
    if (util.material) {
      html += `<tr><td>Material</td><td>${this._escapeHtml(util.material)}</td></tr>`;
    }
    if (util.length) {
      html += `<tr><td>Length</td><td>${this._escapeHtml(util.length)}</td></tr>`;
    }
    if (util.elevation) {
      html += `<tr><td>Elevation</td><td>${this._escapeHtml(util.elevation)}</td></tr>`;
    }
    // All properties
    const propsEntries = Object.entries(util.properties);
    if (propsEntries.length > 0) {
      html += `<tr><td colspan="2"><strong>All Properties</strong></td></tr>`;
      for (const [key, value] of propsEntries) {
        html += `<tr><td>${this._escapeHtml(key)}</td><td>${this._escapeHtml(value)}</td></tr>`;
      }
    }
    html += `</table>`;
    html += `</div>`;
    return html;
  }

  // ── Events ──────────────────────────────────────────────

  private _bindEvents(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;
    container.addEventListener("click", this._handleClick);
    container.addEventListener("change", this._handleChange);
  }

  private _handleClick = (e: Event): void => {
    const target = e.target as HTMLElement;

    // Button actions
    const button = target.closest("button");
    if (button) {
      const action = button.dataset.utilitiesAction;
      if (action === "toggle-underground") {
        this.toggleUnderground();
      }
      return;
    }

    // Click on utility item
    const item = target.closest("[data-utility-id]") as HTMLElement | null;
    if (item) {
      const id = item.dataset.utilityId;
      if (id) this.selectUtility(id);
    }
  };

  private _handleChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    const action = target.dataset.utilitiesAction;
    if (action === "transparent-toggle") {
      this.setTransparentMode(target.checked);
    }
  };

  // ── Helpers ─────────────────────────────────────────────

  private _escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
