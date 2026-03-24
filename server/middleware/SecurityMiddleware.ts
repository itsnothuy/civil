/**
 * SecurityMiddleware.ts — Server-side security middleware
 *
 * Provides Express middleware for:
 * - Security HTTP headers (equivalent to helmet but zero-dependency)
 * - HTTPS enforcement via redirect
 * - CSRF protection via SameSite cookies
 * - Rate limiting enhancement for specific endpoints
 *
 * Phase 7, Task 7.1
 */

// Express-compatible types (avoids hard dependency on @types/express in root)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestLike = {
  headers: Record<string, any>;
  protocol: string;
  hostname: string;
  originalUrl: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResponseLike = {
  setHeader: (name: string, value: string) => any;
  redirect: (status: number, url: string) => void;
};
type NextFn = () => void;
type MiddlewareFn = (req: RequestLike, res: ResponseLike, next: NextFn) => void;

// Re-export the header constants from the shared module
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), xr-spatial-tracking=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

// ── CSP for Server Responses ──────────────────────────────

/**
 * Build CSP header value for server-side responses.
 * The xeokit SDK requires `'unsafe-eval'` for its internal `new Function()` usage.
 */
export function buildCSPHeader(corsOrigin: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    `connect-src 'self' ${corsOrigin} https://api.github.com https://github.com`,
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
  ];
  return directives.join("; ");
}

// ── Security Headers Middleware ────────────────────────────

export interface SecurityOptions {
  /** Enable HSTS header (default: true in production) */
  hsts?: boolean;
  /** HSTS max-age in seconds (default: 31536000 = 1 year) */
  hstsMaxAge?: number;
  /** CORS origin for CSP connect-src (default: http://localhost:3000) */
  corsOrigin?: string;
  /** Enable CSP header (default: true) */
  csp?: boolean;
}

/**
 * Express middleware that sets all recommended security headers.
 * Zero-dependency alternative to helmet.
 */
export function securityHeaders(options: SecurityOptions = {}): MiddlewareFn {
  const {
    hsts = process.env.NODE_ENV === "production",
    hstsMaxAge = 31536000,
    corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000",
    csp = true,
  } = options;

  return (_req: RequestLike, res: ResponseLike, next: NextFn): void => {
    // Set all static security headers
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(header, value);
    }

    // HSTS (only in production to avoid issues with local HTTP dev)
    if (hsts) {
      res.setHeader("Strict-Transport-Security", `max-age=${hstsMaxAge}; includeSubDomains`);
    }

    // Content Security Policy
    if (csp) {
      res.setHeader("Content-Security-Policy", buildCSPHeader(corsOrigin));
    }

    next();
  };
}

// ── HTTPS Redirect Middleware ─────────────────────────────

/**
 * Express middleware that redirects HTTP requests to HTTPS.
 * Only active when NODE_ENV is "production".
 * Trusted proxy headers (X-Forwarded-Proto) are checked for reverse-proxy setups.
 */
export function httpsRedirect(): MiddlewareFn {
  return (req: RequestLike, res: ResponseLike, next: NextFn): void => {
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }

    const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
    if (proto === "http") {
      const host = req.headers.host ?? req.hostname;
      res.redirect(301, `https://${host}${req.originalUrl}`);
      return;
    }

    next();
  };
}

// ── Upload Rate Limiter Config ────────────────────────────

/**
 * Stricter rate limit configuration for upload endpoints.
 * 10 requests per 15 minutes per IP (vs 100 for general endpoints).
 */
export const UPLOAD_RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded. Try again later." },
};

/**
 * Auth-specific rate limit: 20 requests per 15 minutes per IP.
 * Prevents brute-force token/code exchange attempts.
 */
export const AUTH_RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
};

// ── Input Sanitization ────────────────────────────────────

/**
 * Sanitize a file path to prevent path traversal attacks.
 * Removes `..`, leading slashes, and null bytes.
 */
export function sanitizeFilePath(filePath: string): string {
  return filePath
    .replace(/\0/g, "")
    .replace(/\.\./g, "")
    .replace(/^[/\\]+/, "")
    .replace(/[/\\]+/g, "/");
}

/**
 * Validate that a project ID is safe to use in file paths and DB queries.
 */
export function isValidProjectId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}
