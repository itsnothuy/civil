/**
 * WebXRSession.ts
 *
 * WebXR immersive viewing prototype for Civil BIM Viewer.
 * Enables optional immersive-ar or immersive-vr sessions
 * in browsers supporting WebXR (Safari on visionOS, Chrome on Quest).
 *
 * Maps transient-pointer input (gaze + pinch) to object selection.
 * Falls back gracefully when WebXR is unavailable.
 *
 * This is a PROTOTYPE / proof-of-concept. The xeokit SDK does not
 * natively support WebXR, so this module bridges xeokit's WebGL
 * context with the WebXR Device API directly.
 *
 * Phase 6, Task 6.2 — F1 Track 2
 *
 * Scope decision: Prototype-level integration. Full production
 * WebXR would require either xeokit's own XR support or a
 * Three.js bridge for proper stereoscopic rendering.
 */

import type { ViewerCore } from "../viewer/ViewerCore";

/** WebXR session modes supported by this prototype */
export type XRSessionMode = "immersive-vr" | "immersive-ar" | "inline";

/** WebXR session state */
export type XRSessionState =
  | "unavailable"
  | "available"
  | "requesting"
  | "active"
  | "ended"
  | "error";

/** WebXR capability report */
export interface XRCapabilities {
  /** Whether the WebXR API exists in this browser */
  apiAvailable: boolean;
  /** Whether immersive-vr is supported */
  vrSupported: boolean;
  /** Whether immersive-ar is supported */
  arSupported: boolean;
  /** Best available session mode */
  bestMode: XRSessionMode | null;
  /** Human-readable status message */
  message: string;
}

/** Comfort evaluation metrics */
export interface ComfortReport {
  sessionDurationMs: number;
  avgFrameTimeMs: number;
  droppedFrames: number;
  motionIntensity: "low" | "medium" | "high";
  recommendation: string;
}

export class WebXRSession {
  private _viewer: ViewerCore;
  private _state: XRSessionState = "unavailable";
  private _session: XRSession | null = null;
  private _refSpace: XRReferenceSpace | null = null;
  private _animFrameHandle: number | null = null;
  private _capabilities: XRCapabilities | null = null;
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _sessionStart = 0;
  private _frameCount = 0;
  private _droppedFrames = 0;
  private _lastFrameTime = 0;
  private _totalFrameTime = 0;
  private _enterButton: HTMLButtonElement | null = null;

  constructor(viewer: ViewerCore) {
    this._viewer = viewer;
  }

  // ── Public API ──────────────────────────────────────────

  /** Current session state */
  get state(): XRSessionState {
    return this._state;
  }

  /** Whether an XR session is currently active */
  get isActive(): boolean {
    return this._state === "active";
  }

  /** The raw XRSession (null when not active) */
  get session(): XRSession | null {
    return this._session;
  }

  /**
   * Check WebXR capabilities of the current device/browser.
   * Caches the result for subsequent calls.
   */
  async checkCapabilities(): Promise<XRCapabilities> {
    if (this._capabilities) return this._capabilities;

    // Check if WebXR API exists
    if (!("xr" in navigator) || !navigator.xr) {
      this._capabilities = {
        apiAvailable: false,
        vrSupported: false,
        arSupported: false,
        bestMode: null,
        message: "WebXR API not available in this browser.",
      };
      this._setState("unavailable");
      return this._capabilities;
    }

    const xr = navigator.xr;

    // Check supported modes
    let vrSupported = false;
    let arSupported = false;

    try {
      vrSupported = await xr.isSessionSupported("immersive-vr");
    } catch {
      /* not supported */
    }

    try {
      arSupported = await xr.isSessionSupported("immersive-ar");
    } catch {
      /* not supported */
    }

    const bestMode: XRSessionMode | null = arSupported
      ? "immersive-ar"
      : vrSupported
        ? "immersive-vr"
        : null;

    this._capabilities = {
      apiAvailable: true,
      vrSupported,
      arSupported,
      bestMode,
      message: bestMode
        ? `WebXR available: ${arSupported ? "AR" : ""}${arSupported && vrSupported ? " + " : ""}${vrSupported ? "VR" : ""} supported.`
        : "WebXR API present but no immersive sessions supported.",
    };

    this._setState(bestMode ? "available" : "unavailable");
    return this._capabilities;
  }

  /**
   * Enter an immersive XR session.
   * Automatically selects the best available mode if not specified.
   * Returns true if session started successfully.
   */
  async enterXR(mode?: XRSessionMode): Promise<boolean> {
    if (this._state === "active") {
      console.warn("[WebXR] Already in an active session.");
      return false;
    }

    const caps = await this.checkCapabilities();
    const sessionMode = mode ?? caps.bestMode;

    if (!sessionMode || sessionMode === "inline") {
      console.warn("[WebXR] No immersive session mode available.");
      this._emit("error", "No immersive session mode available.");
      return false;
    }

    if (!navigator.xr) {
      this._setState("error");
      return false;
    }

    try {
      this._setState("requesting");
      this._emit("requesting");

      const session = await navigator.xr.requestSession(sessionMode, {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking"],
      });

      this._session = session;
      this._sessionStart = performance.now();
      this._frameCount = 0;
      this._droppedFrames = 0;
      this._totalFrameTime = 0;
      this._lastFrameTime = 0;

      // Set up reference space
      this._refSpace = await session.requestReferenceSpace("local-floor");

      // Wire input sources for selection
      session.addEventListener("inputsourceschange", this._onInputSourcesChange.bind(this));
      session.addEventListener("select", this._onSelect.bind(this));
      session.addEventListener("end", this._onSessionEnd.bind(this));

      // Start XR render loop
      this._startXRRenderLoop(session);

      this._setState("active");
      this._emit("session-started", sessionMode);
      console.info(`[WebXR] Entered ${sessionMode} session.`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[WebXR] Failed to enter session: ${msg}`);
      this._setState("error");
      this._emit("error", msg);
      return false;
    }
  }

  /**
   * Exit the current XR session and return to normal viewing.
   */
  async exitXR(): Promise<void> {
    if (!this._session) return;

    try {
      await this._session.end();
    } catch {
      // Session may already have ended
    }

    this._cleanup();
    console.info("[WebXR] Exited XR session.");
  }

  /**
   * Generate a comfort evaluation report for the current/last session.
   */
  getComfortReport(): ComfortReport {
    const duration = this._sessionStart ? performance.now() - this._sessionStart : 0;
    const avgFrameTime = this._frameCount > 0 ? this._totalFrameTime / this._frameCount : 0;
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    let motionIntensity: ComfortReport["motionIntensity"] = "low";
    if (fps < 60) motionIntensity = "medium";
    if (fps < 30) motionIntensity = "high";

    let recommendation = "Session metrics are within comfortable ranges.";
    if (fps < 72) {
      recommendation =
        "Frame rate below 72 FPS — may cause discomfort. Consider reducing model complexity.";
    }
    if (this._droppedFrames > this._frameCount * 0.05) {
      recommendation =
        "More than 5% dropped frames detected. Simplify the scene or use LOD to improve comfort.";
    }

    return {
      sessionDurationMs: duration,
      avgFrameTimeMs: avgFrameTime,
      droppedFrames: this._droppedFrames,
      motionIntensity,
      recommendation,
    };
  }

  /**
   * Create an "Enter XR" button that can be placed in the UI.
   * Automatically shows/hides based on WebXR availability.
   */
  async createEnterButton(container?: HTMLElement): Promise<HTMLButtonElement> {
    const btn = document.createElement("button");
    btn.className = "webxr-enter-btn";
    btn.textContent = "Enter XR";
    btn.setAttribute("aria-label", "Enter immersive XR mode");
    btn.disabled = true;

    const caps = await this.checkCapabilities();

    if (caps.bestMode) {
      btn.disabled = false;
      btn.textContent = caps.arSupported ? "Enter AR" : "Enter VR";
      btn.addEventListener("click", async () => {
        if (this.isActive) {
          await this.exitXR();
          btn.textContent = caps.arSupported ? "Enter AR" : "Enter VR";
        } else {
          const success = await this.enterXR();
          if (success) {
            btn.textContent = "Exit XR";
          }
        }
      });
    } else {
      btn.textContent = "XR Unavailable";
      btn.title = caps.message;
    }

    const target = container ?? document.body;
    const wrapper = document.createElement("div");
    wrapper.className = "webxr-overlay";
    wrapper.appendChild(btn);
    target.appendChild(wrapper);

    this._enterButton = btn;
    return btn;
  }

  /** Subscribe to XR events */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  /** Destroy and release resources */
  destroy(): void {
    if (this._session) {
      this._session.end().catch(() => {});
    }
    this._cleanup();
    this._enterButton?.parentElement?.remove();
    this._enterButton = null;
    this._listeners.clear();
    this._capabilities = null;
  }

  // ── Private ─────────────────────────────────────────────

  private _setState(state: XRSessionState): void {
    this._state = state;
    this._emit("state-change", state);
  }

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const fn of listeners) {
        fn(...args);
      }
    }
  }

  /** Start the XR animation frame loop */
  private _startXRRenderLoop(session: XRSession): void {
    const onFrame = (_time: DOMHighResTimeStamp, frame: XRFrame) => {
      if (!this._session || this._state !== "active") return;

      const now = performance.now();
      if (this._lastFrameTime > 0) {
        const delta = now - this._lastFrameTime;
        this._totalFrameTime += delta;
        if (delta > 20) this._droppedFrames++; // >20ms = below 50fps
      }
      this._lastFrameTime = now;
      this._frameCount++;

      // Get viewer pose for this frame
      if (this._refSpace) {
        const pose = frame.getViewerPose(this._refSpace);
        if (pose) {
          // In a full implementation, we would update the xeokit camera
          // from the XR pose here. For the prototype, we log that we
          // have a valid pose to confirm the pipeline works.
          this._emit("frame", {
            frameNumber: this._frameCount,
            views: pose.views.length,
          });
        }
      }

      // Continue the loop
      this._animFrameHandle = session.requestAnimationFrame(onFrame);
    };

    this._animFrameHandle = session.requestAnimationFrame(onFrame);
  }

  /** Handle XR input source changes (controller added/removed) */
  private _onInputSourcesChange(event: XRInputSourcesChangeEvent): void {
    for (const source of event.added) {
      console.info(`[WebXR] Input source added: ${source.targetRayMode}`);
    }
    for (const source of event.removed) {
      console.info(`[WebXR] Input source removed: ${source.targetRayMode}`);
    }
    this._emit("input-sources-change", {
      added: event.added.length,
      removed: event.removed.length,
    });
  }

  /** Handle XR select event (pinch/click in XR space) */
  private _onSelect(event: XRInputSourceEvent): void {
    const source = event.inputSource;

    // For transient-pointer (gaze+pinch on Vision Pro), map to world space
    if (source.targetRayMode === "transient-pointer" || source.targetRayMode === "gaze") {
      // In a full implementation, we would raycast into the xeokit scene.
      // For this prototype, emit an event with the input source info.
      this._emit("xr-select", {
        mode: source.targetRayMode,
        handedness: source.handedness,
      });
      console.info(`[WebXR] Select via ${source.targetRayMode} (${source.handedness})`);
    } else if (source.targetRayMode === "tracked-pointer") {
      this._emit("xr-select", {
        mode: "tracked-pointer",
        handedness: source.handedness,
      });
      console.info(`[WebXR] Select via tracked-pointer (${source.handedness})`);
    }
  }

  /** Handle session end */
  private _onSessionEnd(): void {
    const report = this.getComfortReport();
    console.info(
      `[WebXR] Session ended. Duration: ${(report.sessionDurationMs / 1000).toFixed(1)}s, ` +
        `Dropped: ${report.droppedFrames}/${this._frameCount} frames.`,
    );
    this._emit("session-ended", report);
    this._cleanup();
  }

  /** Clean up session state */
  private _cleanup(): void {
    if (this._animFrameHandle !== null && this._session) {
      this._session.cancelAnimationFrame(this._animFrameHandle);
    }
    this._animFrameHandle = null;
    this._session = null;
    this._refSpace = null;
    this._setState("available");
  }
}
