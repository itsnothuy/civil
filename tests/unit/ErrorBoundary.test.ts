/**
 * ErrorBoundary.test.ts — Unit tests for client-side error boundary
 *
 * Phase 7, Task 7.2
 */

import { ErrorBoundary } from "../../src/monitoring/ErrorBoundary";
import { Logger } from "../../src/monitoring/Logger";

describe("ErrorBoundary", () => {
  let boundary: ErrorBoundary;

  beforeEach(() => {
    Logger.resetInstance();
    Logger.getInstance({ minLevel: "error" });
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    document.body.innerHTML = '<div id="app"></div>';
    boundary = new ErrorBoundary({ showOverlay: false });
  });

  afterEach(() => {
    boundary.uninstall();
    jest.restoreAllMocks();
    Logger.resetInstance();
    document.body.innerHTML = "";
  });

  describe("install/uninstall", () => {
    it("installs global error handlers", () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      boundary.install();
      expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    });

    it("uninstalls global error handlers", () => {
      boundary.install();
      const removeSpy = jest.spyOn(window, "removeEventListener");
      boundary.uninstall();
      expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    });

    it("does not install twice", () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      boundary.install();
      boundary.install();
      const errorCalls = addSpy.mock.calls.filter((c) => c[0] === "error");
      expect(errorCalls).toHaveLength(1);
    });

    it("does not uninstall if not installed", () => {
      const removeSpy = jest.spyOn(window, "removeEventListener");
      boundary.uninstall();
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe("wrap (synchronous)", () => {
    it("returns function result on success", () => {
      const result = boundary.wrap("Test", () => 42);
      expect(result).toBe(42);
    });

    it("returns undefined on error", () => {
      const result = boundary.wrap("Test", () => {
        throw new Error("boom");
      });
      expect(result).toBeUndefined();
    });

    it("records error on failure", () => {
      boundary.wrap("TestModule", () => {
        throw new Error("crash");
      });
      const errors = boundary.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].context).toBe("TestModule");
      expect(errors[0].error.message).toBe("crash");
    });

    it("logs error via Logger", () => {
      boundary.wrap("Test", () => {
        throw new Error("logged");
      });
      expect(console.error).toHaveBeenCalled();
    });

    it("handles non-Error throws", () => {
      boundary.wrap("Test", () => {
        throw "string error"; // eslint-disable-line no-throw-literal
      });
      const errors = boundary.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toBe("string error");
    });
  });

  describe("wrapAsync", () => {
    it("returns promise result on success", async () => {
      const result = await boundary.wrapAsync("Test", async () => 99);
      expect(result).toBe(99);
    });

    it("returns undefined on async error", async () => {
      const result = await boundary.wrapAsync("Test", async () => {
        throw new Error("async boom");
      });
      expect(result).toBeUndefined();
    });

    it("records async error", async () => {
      await boundary.wrapAsync("AsyncModule", async () => {
        throw new Error("async crash");
      });
      const errors = boundary.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].context).toBe("AsyncModule");
    });
  });

  describe("error tracking", () => {
    it("accumulates multiple errors", () => {
      boundary.wrap("A", () => {
        throw new Error("err1");
      });
      boundary.wrap("B", () => {
        throw new Error("err2");
      });
      expect(boundary.getErrors()).toHaveLength(2);
    });

    it("clearErrors() removes all recorded errors", () => {
      boundary.wrap("A", () => {
        throw new Error("err");
      });
      boundary.clearErrors();
      expect(boundary.getErrors()).toHaveLength(0);
    });

    it("errors have timestamps", () => {
      boundary.wrap("Test", () => {
        throw new Error("t");
      });
      expect(boundary.getErrors()[0].timestamp).toMatch(/^\d{4}-\d{2}/);
    });
  });

  describe("overlay", () => {
    it("shows overlay when showOverlay is true", () => {
      const overlayBoundary = new ErrorBoundary({ showOverlay: true });
      overlayBoundary.wrap("Test", () => {
        throw new Error("visible error");
      });
      const overlay = document.getElementById("error-boundary-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay?.getAttribute("role")).toBe("alert");
      overlayBoundary.clearErrors();
    });

    it("does not show overlay when showOverlay is false", () => {
      boundary.wrap("Test", () => {
        throw new Error("hidden error");
      });
      const overlay = document.getElementById("error-boundary-overlay");
      expect(overlay).toBeNull();
    });

    it("dismissOverlay() removes the overlay", () => {
      const overlayBoundary = new ErrorBoundary({ showOverlay: true });
      overlayBoundary.wrap("Test", () => {
        throw new Error("dismiss me");
      });
      expect(document.getElementById("error-boundary-overlay")).not.toBeNull();
      overlayBoundary.dismissOverlay();
      expect(document.getElementById("error-boundary-overlay")).toBeNull();
    });

    it("overlay escapes HTML in error messages", () => {
      const overlayBoundary = new ErrorBoundary({ showOverlay: true });
      overlayBoundary.wrap("Test", () => {
        throw new Error('<script>alert("xss")</script>');
      });
      const overlay = document.getElementById("error-boundary-overlay");
      expect(overlay?.innerHTML).not.toContain("<script>");
      expect(overlay?.innerHTML).toContain("&lt;script&gt;");
      overlayBoundary.clearErrors();
    });

    it("replaces previous overlay on new error", () => {
      const overlayBoundary = new ErrorBoundary({ showOverlay: true });
      overlayBoundary.wrap("A", () => {
        throw new Error("first");
      });
      overlayBoundary.wrap("B", () => {
        throw new Error("second");
      });
      const overlays = document.querySelectorAll("#error-boundary-overlay");
      expect(overlays).toHaveLength(1);
      expect(overlays[0].innerHTML).toContain("second");
      overlayBoundary.clearErrors();
    });
  });

  describe("onError callback", () => {
    it("calls onError callback when error occurs", () => {
      const onError = jest.fn();
      const callbackBoundary = new ErrorBoundary({ showOverlay: false, onError });
      callbackBoundary.wrap("Test", () => {
        throw new Error("callback test");
      });
      expect(onError).toHaveBeenCalledWith(expect.any(Error), "Test");
    });

    it("survives if onError callback throws", () => {
      const badCallback = jest.fn(() => {
        throw new Error("callback crash");
      });
      const callbackBoundary = new ErrorBoundary({ showOverlay: false, onError: badCallback });
      expect(() =>
        callbackBoundary.wrap("Test", () => {
          throw new Error("original");
        }),
      ).not.toThrow();
    });
  });
});
