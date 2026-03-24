/**
 * SecurityHeaders.ts — Content Security Policy and security headers for the client
 *
 * Provides CSP meta tag injection, security header constants, and HTTPS enforcement.
 * xeokit-sdk uses `new Function()` internally, so CSP must allow `'unsafe-eval'`
 * for the xeokit chunk. All other inline scripts are blocked.
 *
 * Phase 7, Task 7.1
 */

// ── CSP Directives ────────────────────────────────────────

export interface CSPDirectives {
  "default-src": string[];
  "script-src": string[];
  "style-src": string[];
  "img-src": string[];
  "connect-src": string[];
  "font-src": string[];
  "object-src": string[];
  "frame-src": string[];
  "base-uri": string[];
  "form-action": string[];
  "frame-ancestors": string[];
  "worker-src": string[];
}

/**
 * Default CSP directives for the Civil BIM Viewer.
 *
 * - `'unsafe-eval'` in script-src is required for xeokit-sdk (uses `new Function()`)
 * - `'unsafe-inline'` in style-src is needed for xeokit's inline styles on canvas
 * - `blob:` in worker-src is needed for service worker background sync
 * - `data:` in img-src is needed for nav-cube textures and annotation markers
 */
export function getDefaultCSPDirectives(apiOrigin?: string): CSPDirectives {
  const connectSources = ["'self'", "https://api.github.com", "https://github.com"];
  if (apiOrigin) {
    connectSources.push(apiOrigin);
  }

  return {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://avatars.githubusercontent.com"],
    "connect-src": connectSources,
    "font-src": ["'self'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "worker-src": ["'self'", "blob:"],
  };
}

/**
 * Serialize CSP directives into a policy string suitable for
 * a `<meta http-equiv="Content-Security-Policy">` tag or HTTP header.
 */
export function serializeCSP(directives: CSPDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Inject a CSP `<meta>` tag into the document `<head>`.
 * This is the client-side fallback when no server-side headers are available.
 * If a CSP meta tag already exists, it will be updated.
 */
export function injectCSPMetaTag(apiOrigin?: string): void {
  if (typeof document === "undefined") return;

  const directives = getDefaultCSPDirectives(apiOrigin);
  const content = serializeCSP(directives);

  let meta = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]',
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// ── HTTPS Enforcement ─────────────────────────────────────

/**
 * Redirect to HTTPS if the page is served over HTTP in production.
 * Skips redirect for localhost / 127.0.0.1 (development).
 */
export function enforceHTTPS(): void {
  if (typeof window === "undefined") return;

  const { protocol, hostname } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (protocol === "http:" && !isLocal) {
    window.location.href = window.location.href.replace("http:", "https:");
  }
}

// ── XSS Sanitization ─────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS.
 * Use this for ALL user-generated or IFC-sourced strings before inserting into DOM.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitize a URL to prevent javascript: protocol injection.
 * Returns the URL if safe, or an empty string if suspicious.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:text/html") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "";
  }
  return url;
}

// ── Security Constants ────────────────────────────────────

/**
 * Recommended HTTP security headers for the server.
 * These should be applied via middleware (helmet or manual).
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), xr-spatial-tracking=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

/**
 * Initialize all client-side security measures.
 * Call this early in `main.ts` before any other initialization.
 */
export function initClientSecurity(apiOrigin?: string): void {
  enforceHTTPS();
  injectCSPMetaTag(apiOrigin);
}
