# Feature Guide: Filter & Layer Management

> **Module:** `src/ui/FilterPanel.ts`
> **Related:** `src/viewer/ViewerCore.ts` (X-ray mode)

## Overview

The Filter Panel provides layer/discipline-based filtering for BIM models. It groups IFC entities by discipline (Structural, MEP, Architectural, etc.) and lets you toggle visibility, enable X-ray mode, and isolate specific building systems.

---

## Quick Start

1. **Open** — The Filter Panel is in the left sidebar, below the model tree
2. **Toggle layers** — Check/uncheck discipline checkboxes to show/hide groups
3. **X-ray** — Press `X` or toggle the X-ray switch to see hidden objects as transparent
4. **Quick actions** — Use "Show All" / "Hide All" buttons for bulk operations

---

## Discipline Groups

The Filter Panel automatically categorizes IFC entities into discipline groups:

| Discipline | IFC Types Included |
|------------|-------------------|
| **Structural** | IfcBeam, IfcColumn, IfcSlab, IfcFooting, IfcWall (structural) |
| **Architectural** | IfcWall, IfcDoor, IfcWindow, IfcRoof, IfcStair, IfcRailing |
| **MEP** | IfcPipeSegment, IfcDuctSegment, IfcFlowTerminal, IfcFlowFitting |
| **Electrical** | IfcCableSegment, IfcElectricDistributionBoard, IfcOutlet |
| **Site** | IfcSite, IfcBuilding, IfcBuildingStorey |
| **Other** | Entities not matching the above categories |

---

## Filtering Operations

### Toggle Single Discipline

Click the checkbox next to a discipline name. Objects in that group become visible or hidden instantly.

### Show All / Hide All

- **Show All** — Makes all objects visible across all disciplines
- **Hide All** — Hides all objects (useful before selectively showing one discipline)

### Isolate a Discipline

To focus on a single system (e.g., only MEP):

1. Click **Hide All**
2. Check only **MEP**
3. The model now shows only pipes, ducts, and fittings

---

## X-Ray Mode

X-ray mode renders hidden (unchecked) objects as semi-transparent instead of fully invisible. This helps maintain spatial context while focusing on specific disciplines.

| Key | Action |
|-----|--------|
| `X` | Toggle X-ray mode |

### When X-ray is ON:
- **Checked disciplines** → Fully opaque (normal rendering)
- **Unchecked disciplines** → Semi-transparent ghost rendering

### When X-ray is OFF:
- **Checked disciplines** → Fully opaque
- **Unchecked disciplines** → Completely hidden

---

## Storey Filtering

The Storey Navigator (see `StoreyNavigator` module) works alongside the Filter Panel:

1. Select a storey (floor level) from the storey list
2. Only objects on that storey become visible
3. Camera flies to plan view of the selected storey
4. Combine with discipline filtering for maximum precision

---

## Use Cases

### Structural Review
1. Hide All → Show only Structural
2. Enable X-ray for context
3. Use Measurement Tool to check dimensions

### MEP Clash Detection
1. Show Structural + MEP only
2. Look for visual clashes at beam/pipe intersections
3. Create annotations at clash points

### Underground Utilities
1. Open the Utilities Panel
2. Toggle "What's below" to highlight underground elements
3. Filter to MEP discipline for pipe/duct focus

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `X` | Toggle X-ray mode |
| `H` | Toggle high-contrast mode |
| `F` | Focus search input (filter by name) |

---

## API Reference

```typescript
class FilterPanel {
  init(viewer: ViewerCore): void;
  showAll(): void;              // Make all objects visible
  hideAll(): void;              // Hide all objects
  toggleGroup(group: string, visible: boolean): void;
  isGroupVisible(group: string): boolean;
  getGroups(): string[];        // List available discipline groups
  setXray(enabled: boolean): void;
}
```
