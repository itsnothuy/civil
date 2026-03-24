# Feature Guide: Measurement Tools

> **Module:** `src/tools/MeasurementTool.ts`
> **Keyboard shortcut:** `M` (toggle measurement mode)

## Overview

The Measurement Tool provides two-point distance measurement and cumulative path measurement for BIM models. It supports both metric and imperial units, vertex/edge snapping, and JSON export.

---

## Quick Start

1. **Activate** — Press `M` or click the **Measure** button in the toolbar
2. **Measure** — Click two points on the model to measure distance between them
3. **Read result** — Distance appears as a label between the two points
4. **Deactivate** — Press `M` again or `Escape` to exit measurement mode

---

## Two-Point Measurement

Click any two points on the model surface. The tool displays:

- **Distance** — straight-line distance between the two points
- **Label** — formatted distance (e.g., "12.34 m" or "40.49 ft")
- **Visual** — dashed line connecting the measurement points

### Snapping

The measurement tool automatically snaps to:
- **Vertices** — corners and endpoints of geometry
- **Edges** — midpoints and nearest points on edges

Snapping improves accuracy for structural measurements.

---

## Path (Cumulative) Measurement

For measuring along a route or perimeter:

1. Press `M` to activate measurement mode
2. Click the **first point** to start the path
3. Click **additional points** — each segment length is shown
4. The **total cumulative distance** updates with each new point
5. Press `Escape` or click **End Path** to finish

### Undo

Press `Ctrl+Z` during path measurement to remove the last point. The cumulative distance recalculates automatically.

---

## Units

Toggle between metric and imperial:

| Unit | Display | Example |
|------|---------|---------|
| Metric | meters (m) | 12.34 m |
| Imperial | feet (ft) | 40.49 ft |

The unit preference persists in localStorage.

---

## Export

Measurements can be exported as JSON:

```json
{
  "id": "measure-1",
  "type": "distance",
  "pointA": [10.5, 0.0, 3.2],
  "pointB": [15.2, 0.0, 3.2],
  "distance": 4.7,
  "unit": "m"
}
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `M` | Toggle measurement mode |
| `Ctrl+Z` | Undo last path point |
| `Escape` | Cancel/deactivate measurement |

---

## API Reference

```typescript
class MeasurementTool {
  activate(): void;           // Enter measurement mode
  deactivate(): void;         // Exit measurement mode
  isActive(): boolean;        // Check if measurement mode is on
  startPath(): void;          // Begin cumulative path measurement
  addPathPoint(pos): void;    // Add point to path
  undoLastPoint(): void;      // Remove last path point
  endPath(): MeasurementData; // Finish path, return data
  clearPath(): void;          // Clear current path
  clearAll(): void;           // Remove all measurements
  getMeasurements(): MeasurementData[];
  setUnit(unit: 'm' | 'ft'): void;
}
```
