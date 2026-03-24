/**
 * SecurityHeaders.test.ts — Unit tests for client-side security measures
 *
 * Phase 7, Task 7.1
 */

import {
  getDefaultCSPDirectives,
  serializeCSP,
  injectCSPMetaTag,
  enforceHTTPS,
  escapeHtml,
  sanitizeUrl,
  initClientSecurity,
  SECURITY_HEADERS,
} from "../../src/security/SecurityHeaders";

// ── Helpers ───────────────────────────────────────────────

function resetDOM(): void {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
}

// ── Tests ─────────────────────────────────────────────────

describe("SecurityHeaders", () => {
  beforeEach(() => {
    resetDOM();
  });

  describe("getDefaultCSPDirectives", () => {
    it("returns all required directive keys", () => {
      const directives = getDefaultCSPDirectives();
      const keys = Object.keys(directives);
      expect(keys).toContain("default-src");
      expect(keys).toContain("script-src");
      expect(keys).toContain("style-src");
      expect(keys).toContain("img-src");
      expect(keys).toContain("connect-src");
      expect(keys).toContain("object-src");
      expect(keys).toContain("frame-src");
      expect(keys).toContain("frame-ancestors");
      expect(keys).toContain("worker-src");
    });

    it("blocks object-src and frame-src by default", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["object-src"]).toEqual(["'none'"]);
      expect(directives["frame-src"]).toEqual(["'none'"]);
    });

    it("allows unsafe-eval in script-src for xeokit compatibility", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["script-src"]).toContain("'unsafe-eval'");
    });

    it("includes self in default-src", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["default-src"]).toContain("'self'");
    });

    it("adds custom API origin to connect-src", () => {
      const directives = getDefaultCSPDirectives("https://api.example.com");
      expect(directives["connect-src"]).toContain("https://api.example.com");
    });

    it("includes GitHub API in connect-src for OAuth", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["connect-src"]).toContain("https://api.github.com");
    });

    it("allows blob: and data: for img-src (nav-cube textures)", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["img-src"]).toContain("data:");
      expect(directives["img-src"]).toContain("blob:");
    });

    it("allows blob: in worker-src for service workers", () => {
      const directives = getDefaultCSPDirectives();
      expect(directives["worker-src"]).toContain("blob:");
    });
  });

  describe("serializeCSP", () => {
    it("serializes directives into a valid CSP string", () => {
      const directives = getDefaultCSPDirectives();
      const csp = serializeCSP(directives);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-eval'");
      expect(csp).toContain("object-src 'none'");
    });

    it("separates directives with semicolons", () => {
      const directives = getDefaultCSPDirectives();
      const csp = serializeCSP(directives);
      const parts = csp.split("; ");
      expect(parts.length).toBeGreaterThan(5);
    });
  });

  describe("injectCSPMetaTag", () => {
    it("creates a meta tag in the head", () => {
      injectCSPMetaTag();
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute("content")).toContain("default-src");
    });

    it("updates existing meta tag instead of creating duplicate", () => {
      injectCSPMetaTag();
      injectCSPMetaTag("https://custom-api.com");
      const metas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      expect(metas.length).toBe(1);
      expect(metas[0].getAttribute("content")).toContain("https://custom-api.com");
    });

    it("includes custom API origin in the CSP", () => {
      injectCSPMetaTag("https://my-api.example.com");
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta?.getAttribute("content")).toContain("https://my-api.example.com");
    });
  });

  describe("enforceHTTPS", () => {
    const originalLocation = window.location;

    afterEach(() => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("does not redirect on localhost", () => {
      const mockLocation = {
        ...originalLocation,
        protocol: "http:",
        hostname: "localhost",
        href: "http://localhost:3000",
      };
      Object.defineProperty(window, "location", { writable: true, value: mockLocation });
      enforceHTTPS();
      // Should NOT modify href (no redirect)
      expect(window.location.href).toBe("http://localhost:3000");
    });

    it("does not redirect on 127.0.0.1", () => {
      const mockLocation = {
        ...originalLocation,
        protocol: "http:",
        hostname: "127.0.0.1",
        href: "http://127.0.0.1:3000",
      };
      Object.defineProperty(window, "location", { writable: true, value: mockLocation });
      enforceHTTPS();
      expect(window.location.href).toBe("http://127.0.0.1:3000");
    });
  });

  describe("escapeHtml", () => {
    it("escapes ampersands", () => {
      expect(escapeHtml("a&b")).toBe("a&amp;b");
    });

    it("escapes angle brackets", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("escapes quotes", () => {
      expect(escapeHtml("\"hello'")).toBe("&quot;hello&#039;");
    });

    it("returns safe strings unchanged", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });

    it("handles empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("escapes all XSS vectors", () => {
      const input = '<img onerror="alert(1)" src=x>';
      const escaped = escapeHtml(input);
      expect(escaped).not.toContain("<");
      expect(escaped).not.toContain(">");
    });
  });

  describe("sanitizeUrl", () => {
    it("blocks javascript: protocol", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    });

    it("blocks JavaScript: (case-insensitive)", () => {
      expect(sanitizeUrl("JavaScript:alert(1)")).toBe("");
    });

    it("blocks vbscript: protocol", () => {
      expect(sanitizeUrl("vbscript:exec")).toBe("");
    });

    it("blocks data:text/html", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    });

    it("allows https: URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("allows http: URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("allows relative URLs", () => {
      expect(sanitizeUrl("/path/to/resource")).toBe("/path/to/resource");
    });

    it("trims whitespace before checking", () => {
      expect(sanitizeUrl("  javascript:alert(1)")).toBe("");
    });
  });

  describe("SECURITY_HEADERS", () => {
    it("includes X-Content-Type-Options", () => {
      expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("includes X-Frame-Options DENY", () => {
      expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    });

    it("disables X-XSS-Protection (modern best practice)", () => {
      expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("0");
    });

    it("includes Referrer-Policy", () => {
      expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("includes HSTS with 1 year max-age", () => {
      expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("31536000");
    });
  });

  describe("initClientSecurity", () => {
    it("injects CSP meta tag", () => {
      initClientSecurity("https://api.example.com");
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta).not.toBeNull();
    });

    it("works without API origin parameter", () => {
      initClientSecurity();
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(meta).not.toBeNull();
    });
  });
});
