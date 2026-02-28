/**
 * FilterPanel.ts
 *
 * Layer/discipline filtering panel for the Civil BIM Viewer.
 * Reads model metadata to extract IFC object types, groups them
 * by discipline, and provides checkboxes to toggle visibility.
 *
 * Phase 3, Task 3.1 — Layer/Discipline Filtering
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Well-known IFC-type-to-discipline mapping */
const DISCIPLINE_MAP: Record<string, string> = {
  // Structural
  IfcBeam: "Structural",
  IfcColumn: "Structural",
  IfcSlab: "Structural",
  IfcFooting: "Structural",
  IfcPile: "Structural",
  IfcWall: "Structural",
  IfcWallStandardCase: "Structural",
  IfcRailing: "Structural",
  IfcStair: "Structural",
  IfcStairFlight: "Structural",
  IfcRamp: "Structural",
  IfcRampFlight: "Structural",
  IfcRoof: "Structural",
  IfcCurtainWall: "Structural",
  IfcPlate: "Structural",
  IfcMember: "Structural",

  // Architectural
  IfcDoor: "Architectural",
  IfcWindow: "Architectural",
  IfcCovering: "Architectural",
  IfcFurnishingElement: "Architectural",
  IfcFurniture: "Architectural",
  IfcBuildingElementProxy: "Architectural",
  IfcSpace: "Architectural",

  // Mechanical (HVAC)
  IfcDuctSegment: "Mechanical",
  IfcDuctFitting: "Mechanical",
  IfcAirTerminal: "Mechanical",
  IfcFan: "Mechanical",
  IfcCoil: "Mechanical",
  IfcHeatExchanger: "Mechanical",
  IfcUnitaryEquipment: "Mechanical",

  // Electrical
  IfcCableCarrierSegment: "Electrical",
  IfcCableSegment: "Electrical",
  IfcElectricDistributionBoard: "Electrical",
  IfcOutlet: "Electrical",
  IfcLightFixture: "Electrical",
  IfcSwitchingDevice: "Electrical",

  // Plumbing
  IfcPipeSegment: "Plumbing",
  IfcPipeFitting: "Plumbing",
  IfcSanitaryTerminal: "Plumbing",
  IfcValve: "Plumbing",
  IfcPump: "Plumbing",
  IfcTank: "Plumbing",
  IfcFlowTerminal: "Plumbing",

  // Utilities / Civil
  IfcDistributionElement: "Utilities",
  IfcFlowSegment: "Utilities",
  IfcFlowFitting: "Utilities",
  IfcDistributionFlowElement: "Utilities",
  IfcGeographicElement: "Utilities",
  IfcCivilElement: "Utilities",
  IfcAlignment: "Utilities",
};

/** Default discipline for unmapped IFC types */
const DEFAULT_DISCIPLINE = "Other";

/** Escape HTML entities */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Result of grouping: discipline → { ifcTypes, objectIds } */
export interface DisciplineGroup {
  discipline: string;
  ifcTypes: string[];
  objectIds: string[];
  visible: boolean;
}

export class FilterPanel {
  private _viewer: ViewerCore;
  private _containerId: string;
  private _groups: DisciplineGroup[] = [];
  private _xrayMode = false;

  constructor(viewer: ViewerCore, containerId: string) {
    this._viewer = viewer;
    this._containerId = containerId;
  }

  /** Build the filter panel UI from model metadata. Call after model is loaded. */
  init(): void {
    this._buildGroups();
    this._render();
    console.info(
      `[FilterPanel] Initialized with ${this._groups.length} discipline(s) from model metadata.`,
    );
  }

  /** Refresh groups from current model metadata and re-render */
  refresh(): void {
    this._buildGroups();
    this._render();
  }

  /** Current discipline groups (read-only) */
  get groups(): ReadonlyArray<DisciplineGroup> {
    return this._groups;
  }

  /** Whether X-ray mode is used for hidden disciplines */
  get xrayMode(): boolean {
    return this._xrayMode;
  }

  /** Toggle X-ray mode on/off. When on, hidden disciplines are X-rayed instead of fully hidden. */
  setXrayMode(enabled: boolean): void {
    this._xrayMode = enabled;
    this._applyVisibility();
  }

  /** Show all disciplines */
  showAll(): void {
    for (const g of this._groups) {
      g.visible = true;
    }
    this._applyVisibility();
    this._updateCheckboxes();
  }

  /** Hide all disciplines */
  hideAll(): void {
    for (const g of this._groups) {
      g.visible = false;
    }
    this._applyVisibility();
    this._updateCheckboxes();
  }

  /** Toggle a single discipline by name */
  toggleDiscipline(discipline: string, visible: boolean): void {
    const group = this._groups.find((g) => g.discipline === discipline);
    if (group) {
      group.visible = visible;
      this._applyVisibility();
    }
  }

  // ── Internal ────────────────────────────────────────────

  /** Parse metaScene to group objects by discipline */
  private _buildGroups(): void {
    const metaObjects = this._viewer.viewer.metaScene?.metaObjects ?? {};
    const disciplineMap = new Map<string, { types: Set<string>; ids: string[] }>();

    for (const id of Object.keys(metaObjects)) {
      const meta = metaObjects[id];
      const ifcType = meta.type ?? "";
      const discipline = DISCIPLINE_MAP[ifcType] ?? DEFAULT_DISCIPLINE;

      let entry = disciplineMap.get(discipline);
      if (!entry) {
        entry = { types: new Set(), ids: [] };
        disciplineMap.set(discipline, entry);
      }
      if (ifcType) entry.types.add(ifcType);
      entry.ids.push(id);
    }

    // Sort disciplines alphabetically, but keep "Other" last
    const sorted = Array.from(disciplineMap.entries()).sort(([a], [b]) => {
      if (a === DEFAULT_DISCIPLINE) return 1;
      if (b === DEFAULT_DISCIPLINE) return -1;
      return a.localeCompare(b);
    });

    this._groups = sorted.map(([discipline, data]) => ({
      discipline,
      ifcTypes: Array.from(data.types).sort(),
      objectIds: data.ids,
      visible: true,
    }));
  }

  /** Apply current visibility state to the scene */
  private _applyVisibility(): void {
    const scene = this._viewer.viewer.scene;

    for (const group of this._groups) {
      if (group.objectIds.length === 0) continue;

      // Filter to only IDs that actually exist in the scene
      const existingIds = group.objectIds.filter((id) => scene.objects[id]);
      if (existingIds.length === 0) continue;

      if (group.visible) {
        scene.setObjectsVisible(existingIds, true);
        scene.setObjectsXRayed(existingIds, false);
      } else if (this._xrayMode) {
        // X-ray mode: show but transparent
        scene.setObjectsVisible(existingIds, true);
        scene.setObjectsXRayed(existingIds, true);
      } else {
        // Fully hide
        scene.setObjectsVisible(existingIds, false);
        scene.setObjectsXRayed(existingIds, false);
      }
    }
  }

  /** Render the filter panel HTML */
  private _render(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    let html = `<div class="filter-panel" role="group" aria-label="Layer filtering">`;
    html += `<h3 class="filter-title">Layers</h3>`;
    html += `<div class="filter-actions">`;
    html += `<button id="filter-show-all" aria-label="Show all layers">Show All</button>`;
    html += `<button id="filter-hide-all" aria-label="Hide all layers">Hide All</button>`;
    html += `<label class="filter-xray-toggle">`;
    html += `<input type="checkbox" id="filter-xray-mode" ${this._xrayMode ? "checked" : ""} />`;
    html += ` X-Ray hidden</label>`;
    html += `</div>`;

    if (this._groups.length === 0) {
      html += `<p class="filter-empty">No model metadata available.</p>`;
    } else {
      html += `<ul class="filter-list" role="list">`;
      for (const group of this._groups) {
        const safeDisc = escapeHtml(group.discipline);
        const checkId = `filter-chk-${safeDisc.replace(/\s/g, "-")}`;
        const count = group.objectIds.length;
        const typeSummary = group.ifcTypes.slice(0, 3).join(", ");
        const more = group.ifcTypes.length > 3 ? ` +${group.ifcTypes.length - 3}` : "";
        html += `<li class="filter-item">`;
        html += `<label>`;
        html += `<input type="checkbox" id="${checkId}" data-discipline="${safeDisc}" ${group.visible ? "checked" : ""} />`;
        html += ` <strong>${safeDisc}</strong>`;
        html += `<span class="filter-count">(${count})</span>`;
        html += `</label>`;
        html += `<span class="filter-types" title="${escapeHtml(group.ifcTypes.join(", "))}">${escapeHtml(typeSummary)}${more}</span>`;
        html += `</li>`;
      }
      html += `</ul>`;
    }
    html += `</div>`;
    container.innerHTML = html;

    this._bindEvents(container);
  }

  /** Bind events using delegation */
  private _bindEvents(container: HTMLElement): void {
    // Quick buttons
    container.querySelector("#filter-show-all")?.addEventListener("click", () => this.showAll());
    container.querySelector("#filter-hide-all")?.addEventListener("click", () => this.hideAll());

    // X-ray toggle
    container.querySelector("#filter-xray-mode")?.addEventListener("change", (e) => {
      this.setXrayMode((e.target as HTMLInputElement).checked);
    });

    // Discipline checkboxes (event delegation on list)
    const list = container.querySelector(".filter-list");
    if (list) {
      list.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const discipline = target.dataset.discipline;
        if (discipline) {
          this.toggleDiscipline(discipline, target.checked);
        }
      });
    }
  }

  /** Sync checkbox checked state with internal group data */
  private _updateCheckboxes(): void {
    for (const group of this._groups) {
      const safeDisc = escapeHtml(group.discipline).replace(/\s/g, "-");
      const el = document.getElementById(`filter-chk-${safeDisc}`) as HTMLInputElement | null;
      if (el) {
        el.checked = group.visible;
      }
    }
  }
}
