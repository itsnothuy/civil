/**
 * Collaboration Server — Optional backend for Civil BIM Viewer
 *
 * Provides:
 * - GitHub OAuth authentication
 * - Remote annotation storage (in-memory, replaceable with DB)
 * - Shareable viewpoint links
 *
 * IMPORTANT: This server is OPTIONAL. The frontend viewer works
 * fully standalone without this server.
 *
 * Configuration via environment variables:
 *   PORT              — Server port (default: 4000)
 *   GITHUB_CLIENT_ID  — GitHub OAuth App client ID
 *   GITHUB_SECRET     — GitHub OAuth App client secret
 *   CORS_ORIGIN       — Allowed CORS origin (default: http://localhost:3000)
 *   JWT_SECRET        — Secret for signing tokens (default: dev-secret)
 *
 * Usage:
 *   cd server && npm install && npm start
 *
 * Phase 5, Task 5.5
 */

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import {
  securityHeaders,
  httpsRedirect,
  AUTH_RATE_LIMIT_CONFIG,
} from "./middleware/SecurityMiddleware";

const app = express();
const PORT = parseInt(process.env.PORT ?? "4000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_SECRET = process.env.GITHUB_SECRET ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

// ── Security (Phase 7, Task 7.1) ──────────────────────────

// HTTPS redirect in production (behind reverse proxy)
app.set("trust proxy", 1);
app.use(httpsRedirect());

// Security headers: CSP, HSTS, X-Frame-Options, etc.
app.use(securityHeaders({ corsOrigin: CORS_ORIGIN }));

// ── Middleware ─────────────────────────────────────────────

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit(AUTH_RATE_LIMIT_CONFIG);

// ── In-Memory Storage (replace with DB in production) ──────

interface StoredAnnotation {
  id: string;
  [key: string]: unknown;
}

interface StoredViewpoint {
  id: string;
  projectId: string;
  eye: number[];
  look: number[];
  up: number[];
  projection: string;
  selectedObjects: string[];
  createdBy: string;
  createdAt: string;
  url: string;
}

interface UserSession {
  token: string;
  user: {
    id: string;
    login: string;
    name: string;
    avatarUrl: string;
  };
  expiresAt: number;
}

const annotationsStore = new Map<string, StoredAnnotation[]>(); // projectId → annotations
const viewpointsStore = new Map<string, StoredViewpoint[]>(); // projectId → viewpoints
const sessions = new Map<string, UserSession>(); // token → session

// ── Auth Middleware ────────────────────────────────────────

function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    res.status(401).json({ error: "Token expired or invalid" });
    return;
  }

  // Attach user to request
  (req as express.Request & { user: UserSession["user"] }).user = session.user;
  next();
}

// ── Input Validation Helpers ──────────────────────────────

function isValidProjectId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>"'&]/g, "");
}

// ── Routes: Auth ──────────────────────────────────────────

/** GitHub OAuth callback — exchange code for token */
app.post("/api/auth/github", authLimiter, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_SECRET) {
    res.status(500).json({ error: "GitHub OAuth not configured on server" });
    return;
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      res.status(401).json({ error: tokenData.error ?? "Failed to get access token" });
      return;
    }

    // Fetch user info from GitHub
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: "Failed to get user info" });
      return;
    }

    const ghUser = (await userRes.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
    };

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const user = {
      id: String(ghUser.id),
      login: sanitizeString(ghUser.login),
      name: sanitizeString(ghUser.name ?? ghUser.login),
      avatarUrl: ghUser.avatar_url,
    };

    sessions.set(token, {
      token,
      user,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ token, user });
  } catch (err: unknown) {
    console.error("[Auth] GitHub OAuth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

/** Get current user info */
app.get("/api/auth/me", authenticate, (req, res) => {
  const user = (req as express.Request & { user: UserSession["user"] }).user;
  res.json({ user });
});

// ── Routes: Annotations ───────────────────────────────────

/** Get annotations for a project */
app.get("/api/projects/:projectId/annotations", authenticate, (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const annotations = annotationsStore.get(projectId) ?? [];
  res.json({ annotations });
});

/** Save annotations for a project (replace all) */
app.put("/api/projects/:projectId/annotations", authenticate, (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { annotations } = req.body as { annotations?: StoredAnnotation[] };
  if (!Array.isArray(annotations)) {
    res.status(400).json({ error: "annotations must be an array" });
    return;
  }

  // Limit to 1000 annotations per project
  if (annotations.length > 1000) {
    res.status(400).json({ error: "Maximum 1000 annotations per project" });
    return;
  }

  annotationsStore.set(projectId, annotations);
  res.json({ saved: annotations.length });
});

// ── Routes: Viewpoints ────────────────────────────────────

/** Create a shareable viewpoint */
app.post("/api/projects/:projectId/viewpoints", authenticate, (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { eye, look, up, projection, selectedObjects } = req.body as {
    eye?: number[];
    look?: number[];
    up?: number[];
    projection?: string;
    selectedObjects?: string[];
  };

  if (!eye || !look || !up) {
    res.status(400).json({ error: "Missing camera data (eye, look, up)" });
    return;
  }

  const user = (req as express.Request & { user: UserSession["user"] }).user;
  const id = crypto.randomUUID();
  const viewpoint: StoredViewpoint = {
    id,
    projectId,
    eye,
    look,
    up,
    projection: projection ?? "perspective",
    selectedObjects: selectedObjects ?? [],
    createdBy: user.login,
    createdAt: new Date().toISOString(),
    url: `${CORS_ORIGIN}/?projectId=${projectId}#viewpoint-id=${id}`,
  };

  if (!viewpointsStore.has(projectId)) {
    viewpointsStore.set(projectId, []);
  }
  viewpointsStore.get(projectId)!.push(viewpoint);

  res.status(201).json(viewpoint);
});

/** Get a viewpoint by ID */
app.get("/api/projects/:projectId/viewpoints/:vpId", (req, res) => {
  const { projectId, vpId } = req.params;
  if (!isValidProjectId(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const viewpoints = viewpointsStore.get(projectId) ?? [];
  const vp = viewpoints.find((v) => v.id === vpId);
  if (!vp) {
    res.status(404).json({ error: "Viewpoint not found" });
    return;
  }

  res.json(vp);
});

// ── Health Check (enhanced Phase 7) ──────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "2.0.0",
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    stores: {
      projects: annotationsStore.size,
      sessions: sessions.size,
      viewpoints: viewpointsStore.size,
    },
  });
});

// ── Start Server ──────────────────────────────────────────

app.listen(PORT, () => {
  console.info(`[CollabServer] Listening on http://localhost:${PORT}`);
  console.info(`[CollabServer] CORS origin: ${CORS_ORIGIN}`);
  if (!GITHUB_CLIENT_ID) {
    console.warn("[CollabServer] GITHUB_CLIENT_ID not set — OAuth will not work.");
  }
});

export { app };
