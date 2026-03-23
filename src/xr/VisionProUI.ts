/**
 * VisionProUI.ts
 *
 * Headset-friendly UI adaptation for Apple Vision Pro and similar
 * spatial computing devices. Provides large touch targets (>10mm),
 * simplified HUD layout, gaze-based focus highlighting, pinch selection,
 * and a radial menu for common actions.
 *
 * When headset mode is active, the `.headset-mode` CSS class is applied
 * to `<body>`, and this module manages the additional XR-specific UI.
 * Falls back gracefully on non-headset browsers — no broken UI.
 *
 * Phase 6, Task 6.1 — F1 Track 1
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** Radial menu action definition */
export interface RadialAction {
  id: string;
  label: string;
  icon: string;
  /** Callback when activated */
  onActivate: () => void;
}

/** Configuration for Vision Pro UI */
export interface VisionProUIConfig {
  /** Enable gaze-based focus highlighting */
  gazeEnabled: boolean;
  /** Enable pinch-to-select interaction */
  pinchEnabled: boolean;
  /** Minimum touch target size in CSS pixels (≥44, headset ≥64) */
  touchTargetSize: number;
  /** Auto-detect headset mode from user agent / media queries */
  autoDetect: boolean;
}

const DEFAULT_CONFIG: VisionProUIConfig = {
  gazeEnabled: true,
  pinchEnabled: true,
  touchTargetSize: 64,
  autoDetect: true,
};

/**
 * Detect if the current device is a spatial computing headset
 * (Apple Vision Pro, Meta Quest browser, etc.)
 */
export function detectHeadsetDevice(): {
  isHeadset: boolean;
  deviceName: string;
  confidence: "high" | "medium" | "low";
} {
  const ua = navigator.userAgent;

  // Apple Vision Pro: visionOS Safari identifies as iPad with specific traits
  if (ua.includes("VisionOS") || ua.includes("RealityKit")) {
    return { isHeadset: true, deviceName: "Apple Vision Pro", confidence: "high" };
  }

  // visionOS Safari fallback: iPad UA + no touch + specific viewport
  const isIPadUA = /iPad|Macintosh/.test(ua) && "ontouchend" in document;
  const noFinePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const isVisionOSLike =
    isIPadUA &&
    noFinePointer &&
    (navigator as Navigator & { standalone?: boolean }).standalone === undefined;

  if (isVisionOSLike) {
    return { isHeadset: true, deviceName: "Apple Vision Pro (inferred)", confidence: "medium" };
  }

  // Meta Quest Browser
  if (ua.includes("OculusBrowser") || ua.includes("Quest")) {
    return { isHeadset: true, deviceName: "Meta Quest", confidence: "high" };
  }

  // Generic WebXR-capable device with immersive session support
  if ("xr" in navigator) {
    return { isHeadset: false, deviceName: "WebXR-capable", confidence: "low" };
  }

  return { isHeadset: false, deviceName: "standard", confidence: "high" };
}

export class VisionProUI {
  private _viewer: ViewerCore;
  private _config: VisionProUIConfig;
  private _isActive = false;
  private _radialMenu: HTMLElement | null = null;
  private _radialActions: RadialAction[] = [];
  private _gazeTarget: string | null = null;
  private _gazeTimer: ReturnType<typeof setTimeout> | null = null;
  private _hud: HTMLElement | null = null;
  private _cleanups: (() => void)[] = [];

  constructor(viewer: ViewerCore, config?: Partial<VisionProUIConfig>) {
    this._viewer = viewer;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Public API ──────────────────────────────────────────

  /** Whether headset mode is currently active */
  get isActive(): boolean {
    return this._isActive;
  }

  /** Current configuration */
  get config(): Readonly<VisionProUIConfig> {
    return this._config;
  }

  /** Detected device info */
  get deviceInfo(): ReturnType<typeof detectHeadsetDevice> {
    return detectHeadsetDevice();
  }

  /**
   * Initialize headset-friendly UI.
   * If autoDetect is enabled, automatically activates on headset devices.
   * Can also be manually activated via `activate()`.
   */
  init(): void {
    if (this._config.autoDetect) {
      const detection = detectHeadsetDevice();
      if (detection.isHeadset) {
        this.activate();
        console.info(
          `[VisionProUI] Auto-detected ${detection.deviceName} (${detection.confidence} confidence)`,
        );
      }
    }

    // Set up default radial actions
    this._setupDefaultActions();
  }

  /** Manually activate headset mode */
  activate(): void {
    if (this._isActive) return;
    this._isActive = true;

    document.body.classList.add("headset-mode");

    // Create simplified HUD
    this._createHUD();

    // Enable gaze tracking if configured
    if (this._config.gazeEnabled) {
      this._enableGazeFocus();
    }

    // Enable pinch selection if configured
    if (this._config.pinchEnabled) {
      this._enablePinchSelect();
    }

    // Build radial menu (hidden until triggered)
    this._createRadialMenu();

    console.info("[VisionProUI] Headset mode activated.");
  }

  /** Deactivate headset mode and restore standard UI */
  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;

    document.body.classList.remove("headset-mode");

    // Cleanup all listeners
    for (const cleanup of this._cleanups) {
      cleanup();
    }
    this._cleanups = [];

    // Remove HUD
    this._hud?.remove();
    this._hud = null;

    // Remove radial menu
    this._radialMenu?.remove();
    this._radialMenu = null;

    // Clear gaze state
    if (this._gazeTimer) {
      clearTimeout(this._gazeTimer);
      this._gazeTimer = null;
    }
    this._gazeTarget = null;

    console.info("[VisionProUI] Headset mode deactivated.");
  }

  /** Register a custom action in the radial menu */
  addRadialAction(action: RadialAction): void {
    this._radialActions.push(action);
    if (this._isActive) {
      this._rebuildRadialMenu();
    }
  }

  /** Remove a radial action by ID */
  removeRadialAction(id: string): void {
    this._radialActions = this._radialActions.filter((a) => a.id !== id);
    if (this._isActive) {
      this._rebuildRadialMenu();
    }
  }

  /** Show the radial menu at the given screen position */
  showRadialMenu(x: number, y: number): void {
    if (!this._radialMenu) return;
    this._radialMenu.style.left = `${x}px`;
    this._radialMenu.style.top = `${y}px`;
    this._radialMenu.classList.add("visible");
    this._radialMenu.setAttribute("aria-hidden", "false");
  }

  /** Hide the radial menu */
  hideRadialMenu(): void {
    if (!this._radialMenu) return;
    this._radialMenu.classList.remove("visible");
    this._radialMenu.setAttribute("aria-hidden", "true");
  }

  /** Get the simplified HUD element (for testing) */
  get hud(): HTMLElement | null {
    return this._hud;
  }

  /** Get the radial menu element (for testing) */
  get radialMenuElement(): HTMLElement | null {
    return this._radialMenu;
  }

  /** Destroy and cleanup all resources */
  destroy(): void {
    this.deactivate();
    this._radialActions = [];
  }

  // ── Private: HUD ────────────────────────────────────────

  /** Create the simplified headset HUD overlay */
  private _createHUD(): void {
    // Remove existing
    this._hud?.remove();

    const hud = document.createElement("div");
    hud.id = "vision-hud";
    hud.className = "vision-hud";
    hud.setAttribute("role", "toolbar");
    hud.setAttribute("aria-label", "Headset controls");

    // Simplified action buttons — large targets for spatial input
    const actions = [
      { id: "hud-3d", label: "3D View", icon: "🌐", action: () => this._viewer.setMode("3d") },
      { id: "hud-2d", label: "2D Plan", icon: "📐", action: () => this._viewer.setMode("2d") },
      {
        id: "hud-xray",
        label: "X-Ray",
        icon: "👁",
        action: () => {
          const btn = document.getElementById("btn-xray");
          btn?.click();
        },
      },
      {
        id: "hud-section",
        label: "Section",
        icon: "✂️",
        action: () => this._viewer.addSectionPlane(),
      },
      {
        id: "hud-menu",
        label: "Menu",
        icon: "☰",
        action: (e: MouseEvent | TouchEvent) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          this.showRadialMenu(rect.left + rect.width / 2, rect.top - 20);
        },
      },
    ];

    for (const { id, label, icon, action } of actions) {
      const btn = document.createElement("button");
      btn.id = id;
      btn.className = "hud-btn";
      btn.setAttribute("aria-label", label);
      btn.innerHTML = `<span class="hud-icon">${icon}</span><span class="hud-label">${label}</span>`;
      btn.addEventListener("click", action as EventListener);
      hud.appendChild(btn);
    }

    document.body.appendChild(hud);
    this._hud = hud;
  }

  // ── Private: Gaze Focus ─────────────────────────────────

  /**
   * Enable gaze-based focus highlighting.
   * On headset devices, pointer hover acts as gaze direction.
   * Objects under the pointer/gaze for >300ms get highlighted.
   */
  private _enableGazeFocus(): void {
    const canvas = document.getElementById("viewer-canvas");
    if (!canvas) return;

    const GAZE_DWELL_MS = 300;

    const onPointerMove = (e: PointerEvent) => {
      // Get the hovered entity from xeokit scene
      const scene = this._viewer.viewer.scene;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Use scene pick to find entity under cursor
      const pickResult = this._viewer.viewer.scene.pick({
        canvasPos: [x, y],
      });

      const entityId = pickResult?.entity ? String(pickResult.entity.id) : null;

      if (entityId !== this._gazeTarget) {
        // Clear previous gaze highlight
        if (this._gazeTarget) {
          const prev = scene.objects[this._gazeTarget];
          if (prev) prev.highlighted = false;
        }

        this._gazeTarget = entityId;

        if (this._gazeTimer) {
          clearTimeout(this._gazeTimer);
          this._gazeTimer = null;
        }

        if (entityId) {
          // Start dwell timer
          this._gazeTimer = setTimeout(() => {
            const entity = scene.objects[entityId];
            if (entity) {
              entity.highlighted = true;
              this._viewer.viewer.scene.setObjectsHighlighted(
                scene.highlightedObjectIds.filter((id: string) => id !== entityId),
                false,
              );
            }
          }, GAZE_DWELL_MS);
        }
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    this._cleanups.push(() => canvas.removeEventListener("pointermove", onPointerMove));
  }

  // ── Private: Pinch Selection ────────────────────────────

  /**
   * Enable pinch-to-select for spatial input devices.
   * Maps pointerdown (primary button) to object selection
   * with larger hit tolerance for finger input.
   */
  private _enablePinchSelect(): void {
    const canvas = document.getElementById("viewer-canvas");
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      // Only respond to primary button (finger/pinch)
      if (e.button !== 0) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pickResult = this._viewer.viewer.scene.pick({
        canvasPos: [x, y],
        pickSurface: true,
      });

      if (pickResult?.entity) {
        this._viewer.selectEntity(String(pickResult.entity.id));
      } else {
        this._viewer.selectEntity(null);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    this._cleanups.push(() => canvas.removeEventListener("pointerdown", onPointerDown));
  }

  // ── Private: Radial Menu ────────────────────────────────

  /** Set up default radial actions for common viewer operations */
  private _setupDefaultActions(): void {
    this._radialActions = [
      {
        id: "radial-reset-view",
        label: "Reset View",
        icon: "🏠",
        onActivate: () => {
          const aabb = this._viewer.viewer.scene.getAABB(this._viewer.viewer.scene.objectIds);
          this._viewer.viewer.cameraFlight.flyTo({ aabb, duration: 0.5 });
        },
      },
      {
        id: "radial-clear-sections",
        label: "Clear Sections",
        icon: "🗑️",
        onActivate: () => this._viewer.clearSectionPlanes(),
      },
      {
        id: "radial-toggle-xray",
        label: "Toggle X-Ray",
        icon: "👁",
        onActivate: () => {
          const btn = document.getElementById("btn-xray");
          btn?.click();
        },
      },
      {
        id: "radial-measure",
        label: "Measure",
        icon: "📏",
        onActivate: () => {
          const btn = document.getElementById("btn-measure");
          btn?.click();
        },
      },
      {
        id: "radial-annotate",
        label: "Annotate",
        icon: "📌",
        onActivate: () => {
          const btn = document.getElementById("btn-annotate");
          btn?.click();
        },
      },
      {
        id: "radial-close",
        label: "Close",
        icon: "✕",
        onActivate: () => this.hideRadialMenu(),
      },
    ];
  }

  /** Create the radial menu DOM element */
  private _createRadialMenu(): void {
    this._radialMenu?.remove();

    const menu = document.createElement("div");
    menu.id = "radial-menu";
    menu.className = "radial-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Quick actions");
    menu.setAttribute("aria-hidden", "true");

    this._populateRadialMenu(menu);

    // Close on click outside
    const onClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && menu.classList.contains("visible")) {
        this.hideRadialMenu();
      }
    };
    document.addEventListener("click", onClickOutside);
    this._cleanups.push(() => document.removeEventListener("click", onClickOutside));

    document.body.appendChild(menu);
    this._radialMenu = menu;
  }

  /** Populate radial menu with action buttons arranged in a circle */
  private _populateRadialMenu(container: HTMLElement): void {
    container.innerHTML = "";
    const count = this._radialActions.length;
    const radius = 80; // px from center

    for (let i = 0; i < count; i++) {
      const action = this._radialActions[i];
      const angle = (2 * Math.PI * i) / count - Math.PI / 2; // Start from top
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const btn = document.createElement("button");
      btn.className = "radial-btn";
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-label", action.label);
      btn.innerHTML = `<span class="radial-icon">${action.icon}</span><span class="radial-label">${action.label}</span>`;
      btn.style.transform = `translate(${x}px, ${y}px)`;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        action.onActivate();
        this.hideRadialMenu();
      });

      container.appendChild(btn);
    }
  }

  /** Rebuild radial menu after actions change */
  private _rebuildRadialMenu(): void {
    if (this._radialMenu) {
      this._populateRadialMenu(this._radialMenu);
    }
  }
}
