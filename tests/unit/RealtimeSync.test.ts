/**
 * RealtimeSync.test.ts — Unit tests for real-time collaboration
 * Phase 6, Task 6.3
 */

import {
  RealtimeSync,
  type RealtimeSyncOptions,
  type SyncMessage,
  type PresenceEntry,
  type UserRole,
} from "../../src/collaboration/RealtimeSync";
import type { Annotation } from "../../src/annotations/AnnotationService";

// ── Mock WebSocket ─────────────────────────────────────────

type WSHandler = (ev: Record<string, unknown>) => void;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: WSHandler | null = null;
  onmessage: WSHandler | null = null;
  onclose: WSHandler | null = null;
  onerror: WSHandler | null = null;
  sentMessages: string[] = [];
  closeCode?: number;
  closeReason?: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code ?? 1000, reason: reason ?? "" });
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({});
  }

  simulateMessage(msg: SyncMessage): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(msg) });
    }
  }

  simulateClose(code = 1006, reason = ""): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }

  simulateError(): void {
    if (this.onerror) this.onerror({});
  }
}

let mockWSInstances: MockWebSocket[] = [];

function installMockWebSocket(): void {
  mockWSInstances = [];
  (globalThis as Record<string, unknown>).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWSInstances.push(this);
    }
  } as unknown as typeof WebSocket;
}

function latestWS(): MockWebSocket {
  return mockWSInstances[mockWSInstances.length - 1];
}

// ── Helpers ────────────────────────────────────────────────

function defaultOptions(overrides?: Partial<RealtimeSyncOptions>): RealtimeSyncOptions {
  return {
    wsUrl: "ws://localhost:4000/ws",
    projectId: "test-project",
    token: "test-token",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    maxReconnectAttempts: 3,
    reconnectBaseDelay: 50,
    maxMessagesPerSecond: 5,
    ...overrides,
  };
}

function makeAnnotation(id = "ann-1", comment = "Test annotation"): Annotation {
  return {
    id,
    schemaVersion: "1.0",
    type: "text",
    anchor: { type: "object", objectId: "obj-1" },
    author: "tester",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comment,
    severity: "info",
    status: "open",
  } as Annotation;
}

function connectSync(sync: RealtimeSync): MockWebSocket {
  sync.connect();
  const ws = latestWS();
  ws.simulateOpen();
  return ws;
}

// ── Tests ──────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  installMockWebSocket();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("RealtimeSync", () => {
  describe("initial state", () => {
    it("starts as disconnected", () => {
      const sync = new RealtimeSync(defaultOptions());
      expect(sync.state).toBe("disconnected");
    });

    it("is not connected", () => {
      const sync = new RealtimeSync(defaultOptions());
      expect(sync.isConnected).toBe(false);
    });

    it("has empty presence list", () => {
      const sync = new RealtimeSync(defaultOptions());
      expect(sync.presenceList).toEqual([]);
    });

    it("starts with viewer role", () => {
      const sync = new RealtimeSync(defaultOptions());
      expect(sync.role).toBe("viewer");
    });

    it("has empty offline queue", () => {
      const sync = new RealtimeSync(defaultOptions());
      expect(sync.offlineQueueSize).toBe(0);
    });
  });

  describe("connect", () => {
    it("creates a WebSocket with correct URL", () => {
      const sync = new RealtimeSync(defaultOptions());
      sync.connect();
      const ws = latestWS();
      expect(ws.url).toContain("ws://localhost:4000/ws");
      expect(ws.url).toContain("project=test-project");
      expect(ws.url).toContain("token=test-token");
      sync.destroy();
    });

    it("transitions to connecting state", () => {
      const sync = new RealtimeSync(defaultOptions());
      sync.connect();
      expect(sync.state).toBe("connecting");
      sync.destroy();
    });

    it("transitions to connected on open", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      expect(sync.state).toBe("connected");
      expect(sync.isConnected).toBe(true);
      sync.destroy();
    });

    it("sends join message on open", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      expect(ws.sentMessages.length).toBeGreaterThanOrEqual(1);
      const join = JSON.parse(ws.sentMessages[0]) as SyncMessage;
      expect(join.type).toBe("join");
      expect(join.payload.displayName).toBe("Test User");
      expect(join.payload.projectId).toBe("test-project");
      sync.destroy();
    });

    it("returns false if already connected", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      expect(sync.connect()).toBe(false);
      sync.destroy();
    });

    it("returns false if destroyed", () => {
      const sync = new RealtimeSync(defaultOptions());
      sync.destroy();
      expect(sync.connect()).toBe(false);
    });
  });

  describe("disconnect", () => {
    it("sends leave message and closes socket", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      sync.disconnect();
      // Last sent message should be leave
      const msgs = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const leave = msgs.find((m) => m.type === "leave");
      expect(leave).toBeDefined();
      expect(sync.state).toBe("closed");
    });

    it("clears presence list", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "join",
        payload: { userId: "other-user", displayName: "Other" },
        timestamp: new Date().toISOString(),
        senderId: "other-user",
      });
      expect(sync.presenceList.length).toBe(1);
      sync.disconnect();
      expect(sync.presenceList).toEqual([]);
    });
  });

  describe("presence tracking", () => {
    it("tracks user joins", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "join",
        payload: {
          userId: "user-2",
          displayName: "Alice",
          avatarUrl: "https://a.com/img.png",
          role: "editor",
        },
        timestamp: new Date().toISOString(),
        senderId: "user-2",
      });
      expect(sync.presenceList).toHaveLength(1);
      expect(sync.presenceList[0].displayName).toBe("Alice");
      expect(sync.presenceList[0].role).toBe("editor");
      sync.destroy();
    });

    it("tracks user leaves", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "join",
        payload: { userId: "user-2", displayName: "Alice" },
        timestamp: new Date().toISOString(),
        senderId: "user-2",
      });
      expect(sync.presenceList).toHaveLength(1);
      ws.simulateMessage({
        type: "leave",
        payload: { userId: "user-2" },
        timestamp: new Date().toISOString(),
        senderId: "user-2",
      });
      expect(sync.presenceList).toHaveLength(0);
      sync.destroy();
    });

    it("handles bulk presence update", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const users: PresenceEntry[] = [
        {
          userId: "u1",
          displayName: "A",
          avatarUrl: "",
          role: "admin",
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
        {
          userId: "u2",
          displayName: "B",
          avatarUrl: "",
          role: "editor",
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      ];
      ws.simulateMessage({
        type: "presence",
        payload: { users },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      expect(sync.presenceList).toHaveLength(2);
      sync.destroy();
    });

    it("emits presence event on join", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const cb = jest.fn();
      sync.on("presence", cb);
      ws.simulateMessage({
        type: "join",
        payload: { userId: "user-3", displayName: "Bob" },
        timestamp: new Date().toISOString(),
        senderId: "user-3",
      });
      expect(cb).toHaveBeenCalled();
      sync.destroy();
    });

    it("does not track self in join messages", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "join",
        payload: { userId: sync.userId, displayName: "Self" },
        timestamp: new Date().toISOString(),
        senderId: sync.userId,
      });
      expect(sync.presenceList).toHaveLength(0);
      sync.destroy();
    });
  });

  describe("role-based permissions", () => {
    it("viewers cannot send annotation creates", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      // Default role is viewer
      const errCb = jest.fn();
      sync.on("error", errCb);
      const result = sync.sendAnnotationCreate(makeAnnotation());
      expect(result).toBe(false);
      expect(errCb).toHaveBeenCalledWith("Viewers cannot modify annotations.");
      sync.destroy();
    });

    it("viewers cannot send annotation updates", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      expect(sync.sendAnnotationUpdate(makeAnnotation())).toBe(false);
      sync.destroy();
    });

    it("viewers cannot send annotation deletes", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      expect(sync.sendAnnotationDelete("ann-1")).toBe(false);
      sync.destroy();
    });

    it("editors can send annotation operations", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      // Promote to editor via presence
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "Test User",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      expect(sync.role).toBe("editor");
      const result = sync.sendAnnotationCreate(makeAnnotation());
      expect(result).toBe(true);
      sync.destroy();
    });

    it("admins can change roles", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      // Promote to admin
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "Test User",
              avatarUrl: "",
              role: "admin" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      expect(sync.role).toBe("admin");
      const result = sync.changeRole("user-2", "editor");
      expect(result).toBe(true);
      const sent = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const roleMsg = sent.find((m) => m.type === "role-change");
      expect(roleMsg).toBeDefined();
      expect(roleMsg!.payload.targetUserId).toBe("user-2");
      expect(roleMsg!.payload.newRole).toBe("editor");
      sync.destroy();
    });

    it("non-admins cannot change roles", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      const errCb = jest.fn();
      sync.on("error", errCb);
      expect(sync.changeRole("user-2", "editor")).toBe(false);
      expect(errCb).toHaveBeenCalledWith("Only admins can change roles.");
      sync.destroy();
    });

    it("handles role-change message for self", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const roleCb = jest.fn();
      sync.on("role-changed", roleCb);
      ws.simulateMessage({
        type: "role-change",
        payload: { targetUserId: sync.userId, newRole: "editor" },
        timestamp: new Date().toISOString(),
        senderId: "admin-user",
      });
      expect(sync.role).toBe("editor");
      expect(roleCb).toHaveBeenCalledWith("editor");
      sync.destroy();
    });
  });

  describe("annotation sync", () => {
    function editorSync(): { sync: RealtimeSync; ws: MockWebSocket } {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      // Promote to editor
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      return { sync, ws };
    }

    it("sends annotation-create message", () => {
      const { sync, ws } = editorSync();
      sync.sendAnnotationCreate(makeAnnotation("a1"));
      const sent = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const create = sent.find((m) => m.type === "annotation-create");
      expect(create).toBeDefined();
      expect((create!.payload.annotation as Annotation).id).toBe("a1");
      sync.destroy();
    });

    it("sends annotation-update message", () => {
      const { sync, ws } = editorSync();
      sync.sendAnnotationUpdate(makeAnnotation("a2"));
      const sent = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const update = sent.find((m) => m.type === "annotation-update");
      expect(update).toBeDefined();
      sync.destroy();
    });

    it("sends annotation-delete message", () => {
      const { sync, ws } = editorSync();
      sync.sendAnnotationDelete("a3");
      const sent = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const del = sent.find((m) => m.type === "annotation-delete");
      expect(del).toBeDefined();
      expect(del!.payload.annotationId).toBe("a3");
      sync.destroy();
    });

    it("sends annotation-bulk message", () => {
      const { sync, ws } = editorSync();
      sync.sendAnnotationBulk([makeAnnotation("b1"), makeAnnotation("b2")]);
      const sent = ws.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const bulk = sent.find((m) => m.type === "annotation-bulk");
      expect(bulk).toBeDefined();
      expect((bulk!.payload.annotations as Annotation[]).length).toBe(2);
      sync.destroy();
    });

    it("emits annotation events on incoming messages", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const createCb = jest.fn();
      const updateCb = jest.fn();
      const deleteCb = jest.fn();
      sync.on("annotation-create", createCb);
      sync.on("annotation-update", updateCb);
      sync.on("annotation-delete", deleteCb);

      ws.simulateMessage({
        type: "annotation-create",
        payload: { annotation: makeAnnotation() },
        timestamp: new Date().toISOString(),
        senderId: "other",
      });
      ws.simulateMessage({
        type: "annotation-update",
        payload: { annotation: makeAnnotation() },
        timestamp: new Date().toISOString(),
        senderId: "other",
      });
      ws.simulateMessage({
        type: "annotation-delete",
        payload: { annotationId: "a1" },
        timestamp: new Date().toISOString(),
        senderId: "other",
      });

      expect(createCb).toHaveBeenCalledTimes(1);
      expect(updateCb).toHaveBeenCalledTimes(1);
      expect(deleteCb).toHaveBeenCalledTimes(1);
      sync.destroy();
    });
  });

  describe("last-write-wins conflict resolution", () => {
    it("remote wins when remote is newer", () => {
      const local = {
        annotation: { ...makeAnnotation("c1", "local") },
        timestamp: "2025-01-01T00:00:00Z",
      };
      const remote = {
        annotation: { ...makeAnnotation("c1", "remote") },
        timestamp: "2025-01-01T00:01:00Z",
      };
      const winner = RealtimeSync.resolveConflict(local, remote);
      expect(winner.comment).toBe("remote");
    });

    it("local wins when local is newer", () => {
      const local = {
        annotation: { ...makeAnnotation("c2", "local") },
        timestamp: "2025-01-01T00:02:00Z",
      };
      const remote = {
        annotation: { ...makeAnnotation("c2", "remote") },
        timestamp: "2025-01-01T00:01:00Z",
      };
      const winner = RealtimeSync.resolveConflict(local, remote);
      expect(winner.comment).toBe("local");
    });

    it("remote wins on tie (remote >= local)", () => {
      const ts = "2025-01-01T00:00:00Z";
      const local = { annotation: makeAnnotation("c3", "local"), timestamp: ts };
      const remote = {
        annotation: { ...makeAnnotation("c3", "remote") },
        timestamp: ts,
      };
      const winner = RealtimeSync.resolveConflict(local, remote);
      expect(winner.comment).toBe("remote");
    });
  });

  describe("offline queue", () => {
    it("queues messages when disconnected", () => {
      const sync = new RealtimeSync(defaultOptions());
      // Don't connect — just try to send
      // Need to be editor to send (but role check happens first)
      // Use internal state to set editor role
      // Actually, _canEdit() checks role, so viewer can't queue either
      // Let's test via connect → disconnect → send
      const ws = connectSync(sync);
      // Promote to editor
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      // Simulate abnormal close (triggers reconnecting state)
      ws.simulateClose(1006);

      // Now in reconnecting state, messages should be queued
      sync.sendAnnotationCreate(makeAnnotation("q1"));
      expect(sync.offlineQueueSize).toBe(1);
      sync.destroy();
    });

    it("flushes queue on reconnect", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws1 = connectSync(sync);
      // Promote to editor
      ws1.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      // Disconnect abnormally
      ws1.simulateClose(1006);

      // Queue a message
      sync.sendAnnotationCreate(makeAnnotation("q2"));
      expect(sync.offlineQueueSize).toBe(1);

      // Advance timer to trigger reconnect
      jest.advanceTimersByTime(100);

      // New WS instance should have been created
      const ws2 = latestWS();
      expect(ws2).not.toBe(ws1);
      ws2.simulateOpen();

      // Queue should be flushed
      expect(sync.offlineQueueSize).toBe(0);
      // ws2 should have received the queued message (after join)
      const msgs = ws2.sentMessages.map((m) => JSON.parse(m) as SyncMessage);
      const create = msgs.find((m) => m.type === "annotation-create");
      expect(create).toBeDefined();
      sync.destroy();
    });

    it("emits queued event", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      ws.simulateClose(1006);

      const cb = jest.fn();
      sync.on("queued", cb);
      sync.sendAnnotationCreate(makeAnnotation());
      expect(cb).toHaveBeenCalledWith(1);
      sync.destroy();
    });
  });

  describe("reconnect", () => {
    it("attempts reconnect on abnormal close", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const reconCb = jest.fn();
      sync.on("reconnecting", reconCb);

      ws.simulateClose(1006); // Abnormal
      expect(sync.state).toBe("reconnecting");
      expect(reconCb).toHaveBeenCalledTimes(1);

      // Advance timer for reconnect
      jest.advanceTimersByTime(50);
      expect(mockWSInstances.length).toBe(2); // New WS created
      sync.destroy();
    });

    it("does not reconnect on clean close (1000)", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      ws.onclose = null; // Prevent double-fire from mock
      // Simulate clean close directly
      sync.disconnect();
      expect(sync.state).toBe("closed");
      expect(mockWSInstances.length).toBe(1); // No new WS
    });

    it("uses exponential backoff", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const reconCb = jest.fn();
      sync.on("reconnecting", reconCb);

      // First close
      ws.simulateClose(1006);
      expect(reconCb).toHaveBeenCalledWith(1, 50); // attempt 1, delay 50ms

      // Advance to trigger first reconnect
      jest.advanceTimersByTime(50);
      const ws2 = latestWS();
      ws2.simulateClose(1006);
      expect(reconCb).toHaveBeenCalledWith(2, 100); // attempt 2, delay 100ms

      sync.destroy();
    });

    it("gives up after max attempts", () => {
      const sync = new RealtimeSync(defaultOptions({ maxReconnectAttempts: 2 }));
      const ws = connectSync(sync);
      const errCb = jest.fn();
      sync.on("error", errCb);

      // Close 1
      ws.simulateClose(1006);
      jest.advanceTimersByTime(50);
      // Close 2
      latestWS().simulateClose(1006);
      jest.advanceTimersByTime(100);
      // Close 3 — should give up
      latestWS().simulateClose(1006);

      expect(sync.state).toBe("disconnected");
      expect(errCb).toHaveBeenCalledWith("Max reconnect attempts reached.");
      sync.destroy();
    });
  });

  describe("rate limiting", () => {
    it("allows messages within rate limit", () => {
      const sync = new RealtimeSync(defaultOptions({ maxMessagesPerSecond: 5 }));
      const ws = connectSync(sync);
      // Promote to editor
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });

      // The join message already consumed 1 slot
      // Sending 3 more should be fine (join + presence response reading doesn't count as sends from _sendMessage)
      let sent = 0;
      for (let i = 0; i < 3; i++) {
        if (sync.sendAnnotationCreate(makeAnnotation(`r${i}`))) sent++;
      }
      expect(sent).toBe(3);
      sync.destroy();
    });

    it("blocks messages over rate limit", () => {
      const sync = new RealtimeSync(defaultOptions({ maxMessagesPerSecond: 3 }));
      const ws = connectSync(sync);
      ws.simulateMessage({
        type: "presence",
        payload: {
          users: [
            {
              userId: sync.userId,
              displayName: "T",
              avatarUrl: "",
              role: "editor" as UserRole,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
            },
          ],
        },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });

      const rateCb = jest.fn();
      sync.on("rate-limited", rateCb);

      // Send many messages quickly — join already sent 1 raw
      let blocked = 0;
      for (let i = 0; i < 10; i++) {
        if (!sync.sendAnnotationCreate(makeAnnotation(`rl${i}`))) blocked++;
      }
      expect(blocked).toBeGreaterThan(0);
      expect(rateCb).toHaveBeenCalled();
      sync.destroy();
    });
  });

  describe("heartbeat", () => {
    it("sends ping every 30 seconds", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const initialCount = ws.sentMessages.length;

      jest.advanceTimersByTime(30_000);
      const msgs = ws.sentMessages.slice(initialCount).map((m) => JSON.parse(m) as SyncMessage);
      const pings = msgs.filter((m) => m.type === "ping");
      expect(pings.length).toBe(1);
      sync.destroy();
    });
  });

  describe("event emitter", () => {
    it("on returns unsubscribe function", () => {
      const sync = new RealtimeSync(defaultOptions());
      const cb = jest.fn();
      const unsub = sync.on("state-change", cb);
      sync.connect(); // triggers state-change
      expect(cb).toHaveBeenCalled();
      cb.mockClear();
      unsub();
      sync.disconnect(); // should NOT trigger cb
      expect(cb).not.toHaveBeenCalled();
    });

    it("emits state-change on connect", () => {
      const sync = new RealtimeSync(defaultOptions());
      const states: string[] = [];
      sync.on("state-change", (state) => states.push(state as string));
      connectSync(sync);
      expect(states).toContain("connecting");
      expect(states).toContain("connected");
      sync.destroy();
    });
  });

  describe("error handling", () => {
    it("ignores malformed messages", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      // Simulate a non-JSON message
      if (ws.onmessage) {
        ws.onmessage({ data: "not json {{{" });
      }
      // Should not throw, state unchanged
      expect(sync.isConnected).toBe(true);
      sync.destroy();
    });

    it("emits error on server error message", () => {
      const sync = new RealtimeSync(defaultOptions());
      const ws = connectSync(sync);
      const errCb = jest.fn();
      sync.on("error", errCb);
      ws.simulateMessage({
        type: "error",
        payload: { message: "Server overloaded" },
        timestamp: new Date().toISOString(),
        senderId: "server",
      });
      expect(errCb).toHaveBeenCalledWith("Server overloaded");
      sync.destroy();
    });
  });

  describe("destroy", () => {
    it("cleans up everything", () => {
      const sync = new RealtimeSync(defaultOptions());
      connectSync(sync);
      sync.destroy();
      expect(sync.state).toBe("closed");
      expect(sync.offlineQueueSize).toBe(0);
      expect(sync.connect()).toBe(false);
    });
  });
});
