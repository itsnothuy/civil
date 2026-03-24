/**
 * RealtimeSync.ts
 *
 * WebSocket-based real-time collaboration client for the Civil BIM Viewer.
 * Provides:
 * - WebSocket connection with automatic reconnect
 * - User presence tracking (who's online)
 * - Real-time annotation sync with last-write-wins conflict resolution
 * - Role-based permissions (viewer, editor, admin)
 * - Offline queue that replays when reconnected
 * - Client-side rate limiting on outgoing messages
 *
 * Phase 6, Task 6.3
 */

import type { Annotation } from "../annotations/AnnotationService";

// ── Types ──────────────────────────────────────────────────

/** Role determines what operations a user may perform */
export type UserRole = "viewer" | "editor" | "admin";

/** Presence entry for a connected user */
export interface PresenceEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  joinedAt: number;
  lastSeen: number;
}

/** Incoming / outgoing WebSocket message envelope */
export interface SyncMessage {
  type:
    | "join"
    | "leave"
    | "presence"
    | "annotation-create"
    | "annotation-update"
    | "annotation-delete"
    | "annotation-bulk"
    | "role-change"
    | "error"
    | "ping"
    | "pong";
  payload: Record<string, unknown>;
  /** ISO-8601 timestamp of creation (used for last-write-wins) */
  timestamp: string;
  /** Sender's userId */
  senderId: string;
}

/** Options for constructing a RealtimeSync */
export interface RealtimeSyncOptions {
  /** WebSocket URL, e.g. "ws://localhost:4000/ws" */
  wsUrl: string;
  /** Project / room identifier */
  projectId: string;
  /** Auth token (JWT) */
  token: string;
  /** Display name shown to others */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Maximum reconnect attempts (default 10) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnect attempts in ms (default 1000, doubles each attempt) */
  reconnectBaseDelay?: number;
  /** Rate limit — max outgoing messages per second (default 10) */
  maxMessagesPerSecond?: number;
}

export type SyncState = "disconnected" | "connecting" | "connected" | "reconnecting" | "closed";

// ── Class ──────────────────────────────────────────────────

export class RealtimeSync {
  // ── Configuration ─────────────────────────────────────
  private readonly _wsUrl: string;
  private readonly _projectId: string;
  private readonly _token: string;
  private readonly _displayName: string;
  private readonly _avatarUrl: string;
  private readonly _maxReconnect: number;
  private readonly _reconnectBase: number;
  private readonly _maxMsgPerSec: number;

  // ── Runtime state ─────────────────────────────────────
  private _ws: WebSocket | null = null;
  private _state: SyncState = "disconnected";
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _pingTimer: ReturnType<typeof setInterval> | null = null;
  private _presence: Map<string, PresenceEntry> = new Map();
  private _role: UserRole = "viewer";
  private _userId = "";
  private _offlineQueue: SyncMessage[] = [];
  private _sentTimestamps: number[] = [];
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _destroyed = false;

  constructor(options: RealtimeSyncOptions) {
    this._wsUrl = options.wsUrl;
    this._projectId = options.projectId;
    this._token = options.token;
    this._displayName = options.displayName;
    this._avatarUrl = options.avatarUrl ?? "";
    this._maxReconnect = options.maxReconnectAttempts ?? 10;
    this._reconnectBase = options.reconnectBaseDelay ?? 1000;
    this._maxMsgPerSec = options.maxMessagesPerSecond ?? 10;
    this._userId = `user-${Date.now()}`;
  }

  // ── Public getters ────────────────────────────────────

  get state(): SyncState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === "connected";
  }

  get role(): UserRole {
    return this._role;
  }

  get userId(): string {
    return this._userId;
  }

  /** Snapshot of all currently present users */
  get presenceList(): PresenceEntry[] {
    return Array.from(this._presence.values());
  }

  get offlineQueueSize(): number {
    return this._offlineQueue.length;
  }

  // ── Connection lifecycle ──────────────────────────────

  /**
   * Open the WebSocket connection. Resolves `true` when connected,
   * `false` on immediate failure.
   */
  connect(): boolean {
    if (this._destroyed) return false;
    if (this._state === "connected" || this._state === "connecting") {
      return false;
    }
    this._setState("connecting");
    try {
      const url = `${this._wsUrl}?project=${encodeURIComponent(this._projectId)}&token=${encodeURIComponent(this._token)}`;
      this._ws = new WebSocket(url);
      this._ws.onopen = () => this._onOpen();
      this._ws.onmessage = (ev: MessageEvent) => this._onMessage(ev);
      this._ws.onclose = (ev: CloseEvent) => this._onClose(ev);
      this._ws.onerror = () => this._onError();
      return true;
    } catch {
      this._setState("disconnected");
      return false;
    }
  }

  /** Gracefully close the connection (no reconnect). */
  disconnect(): void {
    this._clearTimers();
    if (this._ws) {
      // Send leave message before closing
      this._sendRaw({
        type: "leave",
        payload: { userId: this._userId },
        timestamp: new Date().toISOString(),
        senderId: this._userId,
      });
      this._ws.onclose = null; // prevent reconnect
      this._ws.close(1000, "Client disconnected");
      this._ws = null;
    }
    this._presence.clear();
    this._setState("closed");
  }

  /** Tear down everything. After this, the instance is unusable. */
  destroy(): void {
    this._destroyed = true;
    this.disconnect();
    this._offlineQueue = [];
    this._listeners.clear();
  }

  // ── Annotation operations ─────────────────────────────

  /** Broadcast a newly created annotation */
  sendAnnotationCreate(annotation: Annotation): boolean {
    if (!this._canEdit()) return false;
    return this._sendMessage({
      type: "annotation-create",
      payload: { annotation },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });
  }

  /** Broadcast an updated annotation (last-write-wins via timestamp) */
  sendAnnotationUpdate(annotation: Annotation): boolean {
    if (!this._canEdit()) return false;
    return this._sendMessage({
      type: "annotation-update",
      payload: { annotation },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });
  }

  /** Broadcast deletion of an annotation */
  sendAnnotationDelete(annotationId: string): boolean {
    if (!this._canEdit()) return false;
    return this._sendMessage({
      type: "annotation-delete",
      payload: { annotationId },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });
  }

  /** Bulk sync — send all annotations at once (e.g. after reconnect) */
  sendAnnotationBulk(annotations: Annotation[]): boolean {
    if (!this._canEdit()) return false;
    return this._sendMessage({
      type: "annotation-bulk",
      payload: { annotations },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });
  }

  // ── Role management (admin only) ─────────────────────

  /** Change another user's role. Only admins may do this. */
  changeRole(targetUserId: string, newRole: UserRole): boolean {
    if (this._role !== "admin") {
      this._emit("error", "Only admins can change roles.");
      return false;
    }
    return this._sendMessage({
      type: "role-change",
      payload: { targetUserId, newRole },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });
  }

  // ── Last-write-wins resolver ──────────────────────────

  /**
   * Given a local annotation and a remote annotation with timestamps,
   * return the one that wins (most recent timestamp).
   */
  static resolveConflict(
    local: { annotation: Annotation; timestamp: string },
    remote: { annotation: Annotation; timestamp: string },
  ): Annotation {
    const localTime = new Date(local.timestamp).getTime();
    const remoteTime = new Date(remote.timestamp).getTime();
    return remoteTime >= localTime ? remote.annotation : local.annotation;
  }

  // ── Event emitter ─────────────────────────────────────

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  // ── Private: WebSocket handlers ───────────────────────

  private _onOpen(): void {
    this._reconnectAttempts = 0;
    this._setState("connected");

    // Send join message
    this._sendRaw({
      type: "join",
      payload: {
        userId: this._userId,
        displayName: this._displayName,
        avatarUrl: this._avatarUrl,
        projectId: this._projectId,
      },
      timestamp: new Date().toISOString(),
      senderId: this._userId,
    });

    // Start heartbeat
    this._pingTimer = setInterval(() => {
      this._sendRaw({
        type: "ping",
        payload: {},
        timestamp: new Date().toISOString(),
        senderId: this._userId,
      });
    }, 30_000);

    // Flush offline queue
    this._flushOfflineQueue();
  }

  private _onMessage(ev: MessageEvent): void {
    let msg: SyncMessage;
    try {
      msg = JSON.parse(String(ev.data)) as SyncMessage;
    } catch {
      return; // Ignore malformed messages
    }

    switch (msg.type) {
      case "presence":
        this._handlePresence(msg);
        break;
      case "join":
        this._handleJoin(msg);
        break;
      case "leave":
        this._handleLeave(msg);
        break;
      case "annotation-create":
      case "annotation-update":
      case "annotation-delete":
      case "annotation-bulk":
        this._emit(msg.type, msg.payload, msg.timestamp, msg.senderId);
        break;
      case "role-change":
        this._handleRoleChange(msg);
        break;
      case "pong":
        // Heartbeat acknowledged — nothing to do
        break;
      case "error":
        this._emit("error", msg.payload.message ?? "Unknown server error");
        break;
    }
  }

  private _onClose(ev: CloseEvent): void {
    this._clearPingTimer();
    if (this._destroyed || ev.code === 1000) {
      this._setState("closed");
      return;
    }
    // Attempt reconnect with exponential backoff
    if (this._reconnectAttempts < this._maxReconnect) {
      this._setState("reconnecting");
      const delay = this._reconnectBase * Math.pow(2, this._reconnectAttempts);
      this._reconnectAttempts++;
      this._reconnectTimer = setTimeout(() => {
        this._reconnectTimer = null;
        this.connect();
      }, delay);
      this._emit("reconnecting", this._reconnectAttempts, delay);
    } else {
      this._setState("disconnected");
      this._emit("error", "Max reconnect attempts reached.");
    }
  }

  private _onError(): void {
    // The close handler will fire after an error — let it handle reconnect
    this._emit("ws-error", "WebSocket error");
  }

  // ── Private: Message dispatch ─────────────────────────

  private _handlePresence(msg: SyncMessage): void {
    const users = msg.payload.users as PresenceEntry[] | undefined;
    if (Array.isArray(users)) {
      this._presence.clear();
      for (const u of users) {
        this._presence.set(u.userId, u);
      }
      // Check if server assigned us a role
      const me = this._presence.get(this._userId);
      if (me) {
        this._role = me.role;
      }
      this._emit("presence", this.presenceList);
    }
  }

  private _handleJoin(msg: SyncMessage): void {
    const p = msg.payload as Partial<PresenceEntry>;
    if (p.userId && p.userId !== this._userId) {
      this._presence.set(p.userId, {
        userId: p.userId,
        displayName: p.displayName ?? "Unknown",
        avatarUrl: p.avatarUrl ?? "",
        role: p.role ?? "viewer",
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      });
      this._emit("user-joined", p);
      this._emit("presence", this.presenceList);
    }
  }

  private _handleLeave(msg: SyncMessage): void {
    const userId = msg.payload.userId as string | undefined;
    if (userId) {
      this._presence.delete(userId);
      this._emit("user-left", { userId });
      this._emit("presence", this.presenceList);
    }
  }

  private _handleRoleChange(msg: SyncMessage): void {
    const targetUserId = msg.payload.targetUserId as string;
    const newRole = msg.payload.newRole as UserRole;
    if (targetUserId === this._userId) {
      this._role = newRole;
      this._emit("role-changed", newRole);
    }
    const entry = this._presence.get(targetUserId);
    if (entry) {
      entry.role = newRole;
      this._emit("presence", this.presenceList);
    }
  }

  // ── Private: Sending ──────────────────────────────────

  /**
   * Send a message through WebSocket or queue it if offline.
   * Applies client-side rate limiting.
   */
  private _sendMessage(msg: SyncMessage): boolean {
    if (this._state === "connected" && this._ws?.readyState === WebSocket.OPEN) {
      if (!this._checkRateLimit()) {
        this._emit("rate-limited", msg.type);
        return false;
      }
      return this._sendRaw(msg);
    }
    // Queue for later delivery
    this._offlineQueue.push(msg);
    this._emit("queued", this._offlineQueue.length);
    return false;
  }

  /** Send raw without rate-limit check (used for control messages) */
  private _sendRaw(msg: SyncMessage): boolean {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return false;
    try {
      this._ws.send(JSON.stringify(msg));
      this._sentTimestamps.push(Date.now());
      return true;
    } catch {
      return false;
    }
  }

  /** Flush queued messages after reconnect */
  private _flushOfflineQueue(): void {
    const queue = [...this._offlineQueue];
    this._offlineQueue = [];
    let flushed = 0;
    for (const msg of queue) {
      if (this._sendRaw(msg)) {
        flushed++;
      } else {
        // Re-queue if still can't send
        this._offlineQueue.push(msg);
      }
    }
    if (flushed > 0) {
      this._emit("queue-flushed", flushed);
    }
  }

  // ── Private: Rate limiting ────────────────────────────

  private _checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 1000;
    // Remove timestamps older than 1 second
    this._sentTimestamps = this._sentTimestamps.filter((t) => t > windowStart);
    return this._sentTimestamps.length < this._maxMsgPerSec;
  }

  // ── Private: Permission check ─────────────────────────

  private _canEdit(): boolean {
    if (this._role === "viewer") {
      this._emit("error", "Viewers cannot modify annotations.");
      return false;
    }
    return true;
  }

  // ── Private: State management ─────────────────────────

  private _setState(state: SyncState): void {
    const prev = this._state;
    this._state = state;
    if (prev !== state) {
      this._emit("state-change", state, prev);
    }
  }

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const fn of listeners) {
        fn(...args);
      }
    }
  }

  // ── Private: Timer cleanup ────────────────────────────

  private _clearPingTimer(): void {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  private _clearTimers(): void {
    this._clearPingTimer();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }
}
