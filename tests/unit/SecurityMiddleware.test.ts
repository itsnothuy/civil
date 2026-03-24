/**
 * SecurityMiddleware.test.ts — Unit tests for server-side security middleware
 *
 * Phase 7, Task 7.1
 */

import {
  securityHeaders,
  httpsRedirect,
  buildCSPHeader,
  sanitizeFilePath,
  isValidProjectId,
  SECURITY_HEADERS,
  UPLOAD_RATE_LIMIT_CONFIG,
  AUTH_RATE_LIMIT_CONFIG,
} from "../../server/middleware/SecurityMiddleware";

// ── Mock Express types ────────────────────────────────────

interface MockRequest {
  headers: Record<string, string | undefined>;
  protocol: string;
  hostname: string;
  originalUrl: string;
}

interface MockResponse {
  setHeader: jest.Mock;
  redirect: jest.Mock;
  headers: Record<string, string>;
}

function createMockReq(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    headers: {},
    protocol: "https",
    hostname: "example.com",
    originalUrl: "/api/test",
    ...overrides,
  };
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    headers: {},
    setHeader: jest.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    redirect: jest.fn(),
  };
  return res;
}

// ── Tests ─────────────────────────────────────────────────

describe("SecurityMiddleware", () => {
  describe("SECURITY_HEADERS constant", () => {
    it("contains X-Content-Type-Options: nosniff", () => {
      expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("contains X-Frame-Options: DENY", () => {
      expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    });

    it("disables X-XSS-Protection", () => {
      expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("0");
    });

    it("sets Cross-Origin-Opener-Policy: same-origin", () => {
      expect(SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    });

    it("sets Cross-Origin-Resource-Policy: same-origin", () => {
      expect(SECURITY_HEADERS["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    });
  });

  describe("buildCSPHeader", () => {
    it("returns a string containing default-src 'self'", () => {
      const csp = buildCSPHeader("http://localhost:3000");
      expect(csp).toContain("default-src 'self'");
    });

    it("allows unsafe-eval for xeokit compatibility", () => {
      const csp = buildCSPHeader("http://localhost:3000");
      expect(csp).toContain("'unsafe-eval'");
    });

    it("includes the CORS origin in connect-src", () => {
      const csp = buildCSPHeader("https://api.myapp.com");
      expect(csp).toContain("https://api.myapp.com");
    });

    it("blocks frame-src and object-src", () => {
      const csp = buildCSPHeader("http://localhost:3000");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it("includes GitHub API for OAuth", () => {
      const csp = buildCSPHeader("http://localhost:3000");
      expect(csp).toContain("https://api.github.com");
    });
  });

  describe("securityHeaders middleware", () => {
    it("sets all static security headers", () => {
      const middleware = securityHeaders({ hsts: false, csp: false });
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
      expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );
      expect(next).toHaveBeenCalled();
    });

    it("sets CSP header when csp option is true", () => {
      const middleware = securityHeaders({ hsts: false, csp: true });
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("default-src 'self'"),
      );
    });

    it("sets HSTS header when hsts option is true", () => {
      const middleware = securityHeaders({ hsts: true, csp: false });
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Strict-Transport-Security",
        expect.stringContaining("max-age=31536000"),
      );
    });

    it("skips HSTS header when hsts option is false", () => {
      const middleware = securityHeaders({ hsts: false, csp: false });
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      const hstsCall = res.setHeader.mock.calls.find(
        (c: string[]) => c[0] === "Strict-Transport-Security",
      );
      expect(hstsCall).toBeUndefined();
    });

    it("always calls next()", () => {
      const middleware = securityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("uses custom CORS origin in CSP", () => {
      const middleware = securityHeaders({
        corsOrigin: "https://myapp.com",
        hsts: false,
        csp: true,
      });
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      const cspCall = res.setHeader.mock.calls.find(
        (c: string[]) => c[0] === "Content-Security-Policy",
      );
      expect(cspCall?.[1]).toContain("https://myapp.com");
    });
  });

  describe("httpsRedirect middleware", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("does nothing in development", () => {
      process.env.NODE_ENV = "development";
      const middleware = httpsRedirect();
      const req = createMockReq({ protocol: "http" });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("redirects HTTP to HTTPS in production", () => {
      process.env.NODE_ENV = "production";
      const middleware = httpsRedirect();
      const req = createMockReq({
        headers: { "x-forwarded-proto": "http", host: "example.com" },
        protocol: "http",
        originalUrl: "/api/test",
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.redirect).toHaveBeenCalledWith(301, "https://example.com/api/test");
      expect(next).not.toHaveBeenCalled();
    });

    it("passes through HTTPS requests in production", () => {
      process.env.NODE_ENV = "production";
      const middleware = httpsRedirect();
      const req = createMockReq({
        headers: { "x-forwarded-proto": "https" },
        protocol: "https",
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as never, res as never, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("sanitizeFilePath", () => {
    it("removes path traversal sequences", () => {
      expect(sanitizeFilePath("../../etc/passwd")).toBe("etc/passwd");
    });

    it("removes null bytes", () => {
      expect(sanitizeFilePath("file\0name.ifc")).toBe("filename.ifc");
    });

    it("removes leading slashes", () => {
      expect(sanitizeFilePath("/root/file.ifc")).toBe("root/file.ifc");
    });

    it("normalizes multiple slashes", () => {
      expect(sanitizeFilePath("path//to///file.ifc")).toBe("path/to/file.ifc");
    });

    it("handles safe paths unchanged", () => {
      expect(sanitizeFilePath("models/my-project/model.ifc")).toBe("models/my-project/model.ifc");
    });

    it("handles empty string", () => {
      expect(sanitizeFilePath("")).toBe("");
    });
  });

  describe("isValidProjectId", () => {
    it("accepts alphanumeric IDs", () => {
      expect(isValidProjectId("myProject123")).toBe(true);
    });

    it("accepts hyphens and underscores", () => {
      expect(isValidProjectId("my-project_01")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidProjectId("")).toBe(false);
    });

    it("rejects IDs with special characters", () => {
      expect(isValidProjectId("../etc/passwd")).toBe(false);
    });

    it("rejects IDs longer than 64 characters", () => {
      expect(isValidProjectId("a".repeat(65))).toBe(false);
    });

    it("accepts IDs of exactly 64 characters", () => {
      expect(isValidProjectId("a".repeat(64))).toBe(true);
    });

    it("rejects IDs with spaces", () => {
      expect(isValidProjectId("my project")).toBe(false);
    });
  });

  describe("Rate limit configs", () => {
    it("UPLOAD_RATE_LIMIT_CONFIG has stricter limits than general", () => {
      expect(UPLOAD_RATE_LIMIT_CONFIG.max).toBe(10);
      expect(UPLOAD_RATE_LIMIT_CONFIG.windowMs).toBe(15 * 60 * 1000);
    });

    it("AUTH_RATE_LIMIT_CONFIG limits auth attempts", () => {
      expect(AUTH_RATE_LIMIT_CONFIG.max).toBe(20);
      expect(AUTH_RATE_LIMIT_CONFIG.windowMs).toBe(15 * 60 * 1000);
    });
  });
});
