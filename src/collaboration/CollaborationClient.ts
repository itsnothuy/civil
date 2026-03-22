/**
 * CollaborationClient.ts
 *
 * Frontend client for the optional collaboration backend.
 * Provides save/load annotations remotely, shareable viewpoint URLs,
 * and GitHub OAuth login. Falls back gracefully when backend is
 * unavailable (offline mode / standalone operation).
 *
 * Phase 5, Task 5.5
 */

import type { AnnotationService, Annotation } from "../annotations/AnnotationService";
import type { ViewerCore } from "../viewer/ViewerCore";

/** Backend configuration */
export interface CollaborationConfig {
  /** Base URL of the collaboration API (e.g. "http://localhost:4000/api") */
  apiUrl: string;
  /** GitHub OAuth client ID (for login redirect) */
  githubClientId?: string;
  /** Project identifier for scoping annotations */
  projectId: string;
}

/** User info from GitHub OAuth */
export interface CollaborationUser {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
}

/** Shareable viewpoint link data */
export interface SharedViewpoint {
  id: string;
  eye: number[];
  look: number[];
  up: number[];
  projection: string;
  selectedObjects: string[];
  createdBy: string;
  createdAt: string;
  url: string;
}

/**
 * Connection state for the collaboration backend
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export class CollaborationClient {
  private _viewer: ViewerCore;
  private _annotations: AnnotationService;
  private _config: CollaborationConfig;
  private _user: CollaborationUser | null = null;
  private _token: string | null = null;
  private _state: ConnectionState = "disconnected";
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(viewer: ViewerCore, annotations: AnnotationService, config: CollaborationConfig) {
    this._viewer = viewer;
    this._annotations = annotations;
    this._config = config;

    // Restore token from localStorage if available
    const saved = localStorage.getItem("collab-token");
    if (saved) {
      this._token = saved;
    }
  }

  // ── Public API ──────────────────────────────────────────

  /** Current connection state */
  get state(): ConnectionState {
    return this._state;
  }

  /** Currently logged-in user (null if not logged in) */
  get user(): CollaborationUser | null {
    return this._user;
  }

  /** Whether the backend is connected */
  get isConnected(): boolean {
    return this._state === "connected";
  }

  /** Whether a user is logged in */
  get isLoggedIn(): boolean {
    return this._user !== null && this._token !== null;
  }

  /** API base URL */
  get apiUrl(): string {
    return this._config.apiUrl;
  }

  // ── Authentication ──────────────────────────────────────

  /**
   * Initiate GitHub OAuth login.
   * Redirects the browser to GitHub's authorization page.
   */
  loginWithGitHub(): void {
    if (!this._config.githubClientId) {
      console.warn("[Collaboration] No GitHub Client ID configured.");
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/callback");
    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${this._config.githubClientId}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=read:user`;
    window.location.href = url;
  }

  /**
   * Complete OAuth login by exchanging the code for a token.
   * Called after the OAuth callback redirect.
   */
  async handleOAuthCallback(code: string): Promise<boolean> {
    try {
      this._setState("connecting");
      const res = await fetch(`${this._config.apiUrl}/auth/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        this._setState("error");
        return false;
      }

      const data = (await res.json()) as { token: string; user: CollaborationUser };
      this._token = data.token;
      this._user = data.user;
      localStorage.setItem("collab-token", data.token);
      this._setState("connected");
      this._emit("login", this._user);
      return true;
    } catch {
      this._setState("error");
      return false;
    }
  }

  /** Log out and clear stored token */
  logout(): void {
    this._token = null;
    this._user = null;
    localStorage.removeItem("collab-token");
    this._setState("disconnected");
    this._emit("logout");
  }

  /**
   * Check connection and restore session if token exists.
   * Returns true if the backend is reachable and the token is valid.
   */
  async connect(): Promise<boolean> {
    if (!this._token) {
      this._setState("disconnected");
      return false;
    }

    try {
      this._setState("connecting");
      const res = await fetch(`${this._config.apiUrl}/auth/me`, {
        headers: this._authHeaders(),
      });

      if (res.ok) {
        const data = (await res.json()) as { user: CollaborationUser };
        this._user = data.user;
        this._setState("connected");
        this._emit("connected", this._user);
        return true;
      }

      // Token expired or invalid
      this._token = null;
      localStorage.removeItem("collab-token");
      this._setState("disconnected");
      return false;
    } catch {
      // Backend unreachable — offline mode
      this._setState("error");
      console.warn("[Collaboration] Backend unreachable — working offline.");
      return false;
    }
  }

  // ── Annotations (Remote Sync) ───────────────────────────

  /**
   * Save annotations to the server.
   * Falls back to localStorage if backend is unavailable.
   */
  async saveAnnotations(): Promise<boolean> {
    const annotations = this._annotations.list();

    if (!this.isConnected || !this._token) {
      console.info("[Collaboration] Offline — saving to localStorage only.");
      this._annotations.saveToLocalStorage(this._config.projectId);
      return false;
    }

    try {
      const res = await fetch(
        `${this._config.apiUrl}/projects/${this._config.projectId}/annotations`,
        {
          method: "PUT",
          headers: this._authHeaders(),
          body: JSON.stringify({ annotations }),
        },
      );

      if (res.ok) {
        console.info(`[Collaboration] Saved ${annotations.length} annotation(s) to server.`);
        this._emit("saved", annotations.length);
        return true;
      }

      console.warn("[Collaboration] Save failed — falling back to localStorage.");
      this._annotations.saveToLocalStorage(this._config.projectId);
      return false;
    } catch {
      console.warn("[Collaboration] Network error — saving to localStorage.");
      this._annotations.saveToLocalStorage(this._config.projectId);
      return false;
    }
  }

  /**
   * Load annotations from the server.
   * Falls back to localStorage if backend is unavailable.
   */
  async loadAnnotations(): Promise<Annotation[]> {
    if (!this.isConnected || !this._token) {
      console.info("[Collaboration] Offline — loading from localStorage.");
      this._annotations.loadFromLocalStorage(this._config.projectId);
      return this._annotations.list();
    }

    try {
      const res = await fetch(
        `${this._config.apiUrl}/projects/${this._config.projectId}/annotations`,
        {
          headers: this._authHeaders(),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as { annotations: Annotation[] };
        // Merge remote annotations with any local-only ones
        for (const ann of data.annotations) {
          if (!this._annotations.get(ann.id)) {
            this._annotations.add(this._config.projectId, ann);
          }
        }
        console.info(
          `[Collaboration] Loaded ${data.annotations.length} annotation(s) from server.`,
        );
        this._emit("loaded", data.annotations.length);
        return data.annotations;
      }

      console.warn("[Collaboration] Load failed — falling back to localStorage.");
      this._annotations.loadFromLocalStorage(this._config.projectId);
      return this._annotations.list();
    } catch {
      console.warn("[Collaboration] Network error — loading from localStorage.");
      this._annotations.loadFromLocalStorage(this._config.projectId);
      return this._annotations.list();
    }
  }

  // ── Shareable Viewpoints ────────────────────────────────

  /**
   * Create a shareable viewpoint link for the current camera state.
   * Returns the shared viewpoint with a URL, or null if backend is unavailable.
   */
  async shareViewpoint(): Promise<SharedViewpoint | null> {
    const camera = this._viewer.viewer.camera;
    const selectedIds = this._viewer.viewer.scene.selectedObjectIds ?? [];

    const viewpointData = {
      eye: Array.from(camera.eye),
      look: Array.from(camera.look),
      up: Array.from(camera.up),
      projection: camera.projection,
      selectedObjects: Array.from(selectedIds),
    };

    if (!this.isConnected || !this._token) {
      // Offline: encode viewpoint as URL hash param
      const encoded = btoa(JSON.stringify(viewpointData));
      const url = `${window.location.origin}${window.location.pathname}?projectId=${this._config.projectId}#viewpoint=${encoded}`;
      return {
        id: `local-${Date.now()}`,
        ...viewpointData,
        createdBy: this._user?.login ?? "anonymous",
        createdAt: new Date().toISOString(),
        url,
      };
    }

    try {
      const res = await fetch(
        `${this._config.apiUrl}/projects/${this._config.projectId}/viewpoints`,
        {
          method: "POST",
          headers: this._authHeaders(),
          body: JSON.stringify(viewpointData),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as SharedViewpoint;
        this._emit("viewpoint-shared", data);
        return data;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Restore a viewpoint from a shared URL hash parameter.
   * Call on page load to check for shared viewpoint data.
   */
  restoreSharedViewpoint(): boolean {
    const hash = window.location.hash;
    const match = hash.match(/viewpoint=([A-Za-z0-9+/=]+)/);
    if (!match) return false;

    try {
      const data = JSON.parse(atob(match[1])) as {
        eye: number[];
        look: number[];
        up: number[];
        projection: string;
        selectedObjects: string[];
      };

      const camera = this._viewer.viewer.camera;
      camera.eye = data.eye;
      camera.look = data.look;
      camera.up = data.up;
      camera.projection = data.projection as "perspective" | "ortho" | "frustum" | "customProjection";

      if (data.selectedObjects.length > 0) {
        this._viewer.viewer.scene.setObjectsSelected(data.selectedObjects, true);
      }

      console.info("[Collaboration] Restored shared viewpoint from URL.");
      return true;
    } catch {
      console.warn("[Collaboration] Could not parse shared viewpoint.");
      return false;
    }
  }

  // ── Event Emitter ───────────────────────────────────────

  /** Subscribe to collaboration events */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  // ── Private ─────────────────────────────────────────────

  private _setState(state: ConnectionState): void {
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

  private _authHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
    };
  }
}
