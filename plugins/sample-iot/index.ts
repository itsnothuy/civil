/**
 * Sample IoT Sensor Overlay Plugin
 *
 * Demonstrates the plugin API by:
 * - Adding a sidebar panel showing sensor data
 * - Adding a toolbar button to toggle sensor visibility
 * - Reacting to viewer selection events
 * - Highlighting objects with sensors
 *
 * Phase 6, Task 6.4 (sample plugin)
 */

import type { PluginContext, PluginModule } from "../../src/plugins/PluginAPI";

/** Simulated sensor reading */
interface SensorReading {
  objectId: string;
  label: string;
  temperature: number;
  humidity: number;
  vibration: number;
  timestamp: string;
}

/** Generate fake sensor data for demo purposes */
function generateSensorData(): SensorReading[] {
  return [
    {
      objectId: "beam-001",
      label: "Beam A – Sensor 1",
      temperature: 22.5 + Math.random() * 5,
      humidity: 45 + Math.random() * 20,
      vibration: Math.random() * 0.5,
      timestamp: new Date().toISOString(),
    },
    {
      objectId: "column-003",
      label: "Column C – Sensor 2",
      temperature: 21.0 + Math.random() * 4,
      humidity: 50 + Math.random() * 15,
      vibration: Math.random() * 0.3,
      timestamp: new Date().toISOString(),
    },
    {
      objectId: "slab-002",
      label: "Slab B – Sensor 3",
      temperature: 23.0 + Math.random() * 3,
      humidity: 55 + Math.random() * 10,
      vibration: Math.random() * 0.8,
      timestamp: new Date().toISOString(),
    },
  ];
}

let panel: HTMLElement | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let visible = true;

function renderSensorTable(container: HTMLElement, data: SensorReading[]): void {
  container.innerHTML = "";
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const header = table.createTHead().insertRow();
  for (const h of ["Sensor", "Temp °C", "Humidity %", "Vibration"]) {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.textAlign = "left";
    th.style.borderBottom = "1px solid #ccc";
    th.style.padding = "4px";
    header.appendChild(th);
  }

  const body = table.createTBody();
  for (const s of data) {
    const row = body.insertRow();
    row.insertCell().textContent = s.label;
    row.insertCell().textContent = s.temperature.toFixed(1);
    row.insertCell().textContent = s.humidity.toFixed(0);
    row.insertCell().textContent = s.vibration.toFixed(3);
    for (let i = 0; i < row.cells.length; i++) {
      row.cells[i].style.padding = "4px";
    }
  }

  container.appendChild(table);
}

const sampleIoTPlugin: PluginModule = {
  init(ctx: PluginContext) {
    ctx.log.info("IoT Sensor Overlay plugin initializing...");
  },

  activate(ctx: PluginContext) {
    ctx.log.info("Activating IoT Sensor Overlay.");

    // Add sidebar panel
    panel = ctx.addPanel("IoT Sensors");
    const data = generateSensorData();
    renderSensorTable(panel, data);

    // Auto-refresh every 5 seconds
    refreshTimer = setInterval(() => {
      if (panel && visible) {
        renderSensorTable(panel, generateSensorData());
      }
    }, 5000);

    // Add toolbar toggle
    ctx.addToolbarButton({
      label: "Sensors",
      icon: "📡",
      onClick() {
        visible = !visible;
        if (panel) {
          panel.style.display = visible ? "block" : "none";
        }
        ctx.log.info(`Sensor overlay ${visible ? "shown" : "hidden"}.`);
      },
    });

    // Highlight objects that have sensors
    const sensorObjectIds = data.map((s) => s.objectId);
    ctx.setObjectsHighlighted(sensorObjectIds, true);

    // React to selection: show sensor for selected object
    ctx.on("selection-changed", (selectedIds: unknown) => {
      if (!Array.isArray(selectedIds) || !panel) return;
      const matching = data.filter((s) => (selectedIds as string[]).includes(s.objectId));
      if (matching.length > 0) {
        renderSensorTable(panel, matching);
      }
    });
  },

  deactivate(ctx: PluginContext) {
    ctx.log.info("Deactivating IoT Sensor Overlay.");
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (panel) {
      panel.innerHTML = "";
      panel = null;
    }
    visible = true;
  },

  destroy(ctx: PluginContext) {
    ctx.log.info("IoT Sensor Overlay plugin destroyed.");
  },
};

export default sampleIoTPlugin;
