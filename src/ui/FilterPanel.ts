/**
 * FilterPanel.ts
 *
 * Layer/discipline filtering panel. Parses IFC metadata to extract
 * unique object types, groups them by discipline, and lets the user
 * toggle visibility or X-ray per group.
 *
 * Phase 3, Task 3.1
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Discipline grouping — maps IFC types to high-level discipline names */
const DISCIPLINE_MAP: Record<string, string> = {
  // Structural
  IfcBeam: "Structural",
  IfcColumn: "Structural",
  IfcSlab: "Structural",
  IfcFooting: "Structural",
  IfcPile: "Structural",
  IfcWall: "Structural",
  IfcWallStandardCase: "Structural",
  IfcStair: "Structural",
  IfcStairFlight: "Structural",
  IfcRailing: "Structural",
  IfcRamp: "Structural",
  IfcRampFlight: "Structural",
  IfcRoof: "Structural",
  IfcPlate: "Structural",
  IfcMember: "Structural",
  IfcBuildingElementProxy: "Structural",
  IfcReinforcingBar: "Structural",
  IfcReinforcingMesh: "Structural",
  IfcTendon: "Structural",
  IfcTendonAnchor: "Structural",

  // Mechanical / HVAC
  IfcDuctSegment: "Mechanical",
  IfcDuctFitting: "Mechanical",
  IfcAirTerminal: "Mechanical",
  IfcFan: "Mechanical",
  IfcCompressor: "Mechanical",
  IfcHeatExchanger: "Mechanical",
  IfcBoiler: "Mechanical",
  IfcChiller: "Mechanical",
  IfcCoil: "Mechanical",
  IfcAirTerminalBox: "Mechanical",
  IfcDamper: "Mechanical",
  IfcFilter: "Mechanical",
  IfcUnitaryEquipment: "Mechanical",

  // Electrical
  IfcCableSegment: "Electrical",
  IfcCableFitting: "Electrical",
  IfcElectricDistributionBoard: "Electrical",
  IfcJunctionBox: "Electrical",
  IfcLamp: "Electrical",
  IfcLightFixture: "Electrical",
  IfcOutlet: "Electrical",
  IfcSwitchingDevice: "Electrical",
  IfcCableCarrierSegment: "Electrical",
  IfcCableCarrierFitting: "Electrical",

  // Plumbing
  IfcPipeSegment: "Plumbing",
  IfcPipeFitting: "Plumbing",
  IfcValve: "Plumbing",
  IfcPump: "Plumbing",
  IfcTank: "Plumbing",
  IfcSanitaryTerminal: "Plumbing",
  IfcFlowMeter: "Plumbing",

  // Utilities / Site
  IfcSite: "Utilities",
  IfcBuilding: "Utilities",
  IfcBuildingStorey: "Utilities",
  IfcSpace: "Utilities",
  IfcOpeningElement: "Utilities",
  IfcWindow: "Utilities",
  IfcDoor: "Utilities",
  IfcCovering: "Utilities",
  IfcCurtainWall: "Utilities",
  IfcFurnishingElement: "Utilities",
  IfcFlowTerminal: "Utilities",
  IfcDistributionElement: "Utilities",
};

/** IFC type → discipline. Returns "Other" for unknown types. */
export function getDiscipline(ifcType: string): string {
  return DISCIPLINE_MAP[ifcType] ?? "Other";
}

/** Represents a discipline group with its object IDs */
export interface DisciplineGroup {
  name: string;
  ifcTypes: string[];
  objectIds: string[];
  visible: boolean;
}

export class FilterPanel {
  private _viewer: ViewerCore;
  private _containerId: string;
  private _groups: Map<string, DisciplineGroup> = new Map();
  private _xrayMode = false;

  constructor(viewer: ViewerCore, containerId: string) {
    this._viewer = viewer;
    this._containerId = containerId;
  }

  /**
   * Scan metadata and build discipline groups.
   * Call after model is loaded so metaScene is populated.
   */
  init(): void {
    this._buildGroups();
    this._render();
    console.info(`[FilterPanel] Initialized with ${this._groups.size} discipline(s).`);
  }

  /** Rebuild discipline groups from the current metaScene */
  private _buildGroups(): void {
    this._groups.clear();
    const metaObjects = this._viewer.viewer.metaScene.metaObjects;

    // Collect unique types and their object IDs
    const typeToIds = new Map<string, string[]>();
    for (const id of Object.keys(metaObjects)) {
      const meta = metaObjects[id];
      const type = meta.type ?? "Unknown";
      if (!typeToIds.has(type)) {
        typeToIds.set(type, []);
      }
      typeToIds.get(type)!.push(id);
    }

    // Group types by discipline
    const disciplineData = new Map<string, { types: Set<string>; ids: string[] }>();
    for (const [type, ids] of typeToIds) {
      const discipline = getDiscipline(type);
      if (!disciplineData.has(discipline)) {
        disciplineData.set(discipline, { types: new Set(), ids: [] });
      }
      const group = disciplineData.get(discipline)!;
      group.types.add(type);
      group.ids.push(...ids);
    }

    // Build DisciplineGroup objects
    for (const [name, data] of disciplineData) {
      this._groups.set(name, {
        name,
        ifcTypes: Array.from(data.types).sort(),
        objectIds: data.ids,
        visible: true,
      });
    }
  }

  /** Get all discipline groups (read-only) */
  get groups(): ReadonlyMap<string, DisciplineGroup> {
    return this._groups;
  }

  /** Whether X-ray mode is used for hidden disciplines (instead of hiding) */
  get xrayMode(): boolean {
    return this._xrayMode;
  }

  /** Toggle X-ray mode for hidden groups */
  setXrayMode(enabled: boolean): void {
    this._xrayMode = enabled;
    this._applyVisibility();
    this._render();
  }

  /** Toggle visibility of a discipline group */
  toggleGroup(name: string): void {
    const group = this._groups.get(name);
    if (!group) return;
    group.visible = !group.visible;
    this._applyVisibility();
    this._render();
  }

  /** Set visibility of a specific discipline group */
  setGroupVisible(name: string, visible: boolean): void {
    const group = this._groups.get(name);
    if (!group) return;
    group.visible = visible;
    this._applyVisibility();
    this._render();
  }

  /** Show all disciplines */
  showAll(): void {
    for (const group of this._groups.values()) {
      group.visible = true;
    }
    this._applyVisibility();
    this._render();
  }

  /** Hide all disciplines */
  hideAll(): void {
    for (const group of this._groups.values()) {
      group.visible = false;
    }
    this._applyVisibility();
    this._render();
  }

  /** Apply visibility state to the scene */
  private _applyVisibility(): void {
    const scene = this._viewer.viewer.scene;

    for (const group of this._groups.values()) {
      if (group.objectIds.length === 0) continue;

      // Filter to IDs that exist in the scene
      const sceneIds = group.objectIds.filter((id) => scene.objects[id]);
      if (sceneIds.length === 0) continue;

      if (group.visible) {
        scene.setObjectsVisible(sceneIds, true);
        scene.setObjectsXRayed(sceneIds, false);
      } else if (this._xrayMode) {
        // X-ray mode: show but transparent
        scene.setObjectsVisible(sceneIds, true);
        scene.setObjectsXRayed(sceneIds, true);
      } else {
        // Hide mode
        scene.setObjectsVisible(sceneIds, false);
        scene.setObjectsXRayed(sceneIds, false);
      }
    }
  }

  /** Render the filter panel HTML */
  private _render(): void {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    // Sort groups: known disciplines first, "Other" last
    const sorted = Array.from(this._groups.values()).sort((a, b) => {
      if (a.name === "Other") return 1;
      if (b.name === "Other") return -1;
      return a.name.localeCompare(b.name);
    });

    let html = `<h4>Disciplines</h4>`;
    html += `<div class="filter-actions">`;
    html += `<button class="filter-btn" data-filter-action="show-all" aria-label="Show all disciplines">Show All</button>`;
    html += `<button class="filter-btn" data-filter-action="hide-all" aria-label="Hide all disciplines">Hide All</button>`;
    html += `<label class="filter-xray-toggle">`;
    html += `<input type="checkbox" data-filter-action="xray-toggle" ${this._xrayMode ? "checked" : ""} aria-label="Use X-ray instead of hiding" />`;
    html += ` X-ray hidden</label>`;
    html += `</div>`;

    for (const group of sorted) {
      const count = group.objectIds.length;
      const checked = group.visible ? "checked" : "";
      html += `<label class="filter-group" data-discipline="${group.name}">`;
      html += `<input type="checkbox" ${checked} data-filter-group="${group.name}" aria-label="Toggle ${group.name}" />`;
      html += `<span class="filter-group-name">${group.name}</span>`;
      html += `<span class="filter-group-count">(${count})</span>`;
      html += `</label>`;
    }

    container.innerHTML = html;

    // Event delegation
    container.addEventListener("change", this._handleChange);
    container.addEventListener("click", this._handleClick);
  }

  private _handleChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (!target) return;

    const groupName = target.dataset.filterGroup;
    if (groupName) {
      this.setGroupVisible(groupName, target.checked);
      return;
    }

    const action = target.dataset.filterAction;
    if (action === "xray-toggle") {
      this.setXrayMode(target.checked);
    }
  };

  private _handleClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest("button");
    if (!target) return;

    const action = target.dataset.filterAction;
    if (action === "show-all") this.showAll();
    else if (action === "hide-all") this.hideAll();
  };

  /** Destroy the panel */
  destroy(): void {
    const container = document.getElementById(this._containerId);
    if (container) {
      container.removeEventListener("change", this._handleChange);
      container.removeEventListener("click", this._handleClick);
      container.innerHTML = "";
    }
  }
}
