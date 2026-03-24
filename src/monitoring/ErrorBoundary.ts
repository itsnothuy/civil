/**
 * ErrorBoundary.ts — Client-side error handling for the Civil BIM Viewer
 *
 * Provides:
 * - Global unhandled error catching (window.onerror + unhandledrejection)
 * - Module-level error boundary wrapping for try/catch at boundaries
 * - User-friendly error UI (non-destructive overlay)
 * - Integration with Logger for structured error reporting
 *
 * Phase 7, Task 7.2
 */

import { Logger } from "./Logger";

// ── Types ──────────────────────────────────────────────────

export interface ErrorBoundaryConfig {
  /** Container element ID for error overlay (default: "app") */
  containerId?: string;
  /** Whether to show the error overlay UI (default: true) */
  showOverlay?: boolean;
  /** Auto-dismiss overlay after N milliseconds (0 = manual dismiss, default: 0) */
  autoDismissMs?: number;
  /** Optional callback for custom error handling (e.g., Sentry) */
  onError?: (error: Error, context: string) => void;
}

// ── Constants ──────────────────────────────────────────────

const ERROR_OVERLAY_ID = "error-boundary-overlay";

// ── Error Boundary Class ──────────────────────────────────

/**
 * Client-side error boundary that catches unhandled errors and promise rejections.
 * Shows a user-friendly overlay and logs structured error data.
 *
 * Usage:
 * ```typescript
 * const boundary = new ErrorBoundary({ containerId: "app" });
 * boundary.install();
 *
 * // Wrap risky module initialization
 * boundary.wrap("FilterPanel", () => filterPanel.init());
 * ```
 */
export class ErrorBoundary {
  private _config: Required<ErrorBoundaryConfig>;
  private _logger: Logger;
  private _installed = false;
  private _errors: Array<{ error: Error; context: string; timestamp: string }> = [];
  private _windowErrorHandler: ((event: ErrorEvent) => void) | null = null;
  private _rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(config: ErrorBoundaryConfig = {}) {
    this._config = {
      containerId: config.containerId ?? "app",
      showOverlay: config.showOverlay ?? true,
      autoDismissMs: config.autoDismissMs ?? 0,
      onError: config.onError ?? (() => {}),
    };
    this._logger = Logger.getInstance();
  }

  /**
   * Install global error handlers (window.onerror + unhandledrejection).
   * Call once during app initialization.
   */
  install(): void {
    if (this._installed || typeof window === "undefined") return;

    this._windowErrorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      const error = event.error instanceof Error ? event.error : new Error(event.message);
      this._handleError(error, "unhandled");
    };

    this._rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this._handleError(error, "unhandled-promise");
    };

    window.addEventListener("error", this._windowErrorHandler);
    window.addEventListener("unhandledrejection", this._rejectionHandler);
    this._installed = true;

    this._logger.info("ErrorBoundary", "Global error handlers installed.");
  }

  /**
   * Uninstall global error handlers.
   */
  uninstall(): void {
    if (!this._installed || typeof window === "undefined") return;

    if (this._windowErrorHandler) {
      window.removeEventListener("error", this._windowErrorHandler);
    }
    if (this._rejectionHandler) {
      window.removeEventListener("unhandledrejection", this._rejectionHandler);
    }

    this._installed = false;
    this._logger.info("ErrorBoundary", "Global error handlers uninstalled.");
  }

  /**
   * Wrap a synchronous function call with error handling.
   * If the function throws, the error is caught, logged, and optionally displayed.
   * Returns the function result or undefined if an error occurred.
   */
  wrap<T>(context: string, fn: () => T): T | undefined {
    try {
      return fn();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._handleError(error, context);
      return undefined;
    }
  }

  /**
   * Wrap an async function call with error handling.
   * Returns the resolved value or undefined if an error occurred.
   */
  async wrapAsync<T>(context: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._handleError(error, context);
      return undefined;
    }
  }

  /** Get all recorded errors. */
  getErrors(): Array<{ error: Error; context: string; timestamp: string }> {
    return [...this._errors];
  }

  /** Clear recorded errors and dismiss overlay. */
  clearErrors(): void {
    this._errors = [];
    this._dismissOverlay();
  }

  /** Dismiss the error overlay without clearing error history. */
  dismissOverlay(): void {
    this._dismissOverlay();
  }

  // ── Internal ──────────────────────────────────────────

  private _handleError(error: Error, context: string): void {
    const record = {
      error,
      context,
      timestamp: new Date().toISOString(),
    };
    this._errors.push(record);

    // Log structured error
    this._logger.error(
      "ErrorBoundary",
      `Error in ${context}: ${error.message}`,
      { context },
      error,
    );

    // Custom callback (e.g., Sentry)
    try {
      this._config.onError(error, context);
    } catch {
      // Silently ignore callback errors
    }

    // Show overlay
    if (this._config.showOverlay) {
      this._showOverlay(error, context);
    }
  }

  private _showOverlay(error: Error, context: string): void {
    if (typeof document === "undefined") return;

    // Remove existing overlay
    this._dismissOverlay();

    const overlay = document.createElement("div");
    overlay.id = ERROR_OVERLAY_ID;
    overlay.setAttribute("role", "alert");
    overlay.setAttribute("aria-live", "assertive");
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 420px;
      background: #1a1a2e;
      color: #e0e0e0;
      border: 1px solid #c9354d;
      border-radius: 8px;
      padding: 16px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    const safeMessage = error.message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeContext = context.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    overlay.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="color:#c9354d;">⚠ Error</strong>
        <button id="error-boundary-dismiss" aria-label="Dismiss error"
          style="background:none;border:none;color:#e0e0e0;cursor:pointer;font-size:18px;padding:0 4px;">✕</button>
      </div>
      <p style="margin:0 0 4px 0;"><strong>Context:</strong> ${safeContext}</p>
      <p style="margin:0;word-break:break-word;">${safeMessage}</p>
    `;

    document.body.appendChild(overlay);

    // Wire dismiss button
    document.getElementById("error-boundary-dismiss")?.addEventListener("click", () => {
      this._dismissOverlay();
    });

    // Auto-dismiss
    if (this._config.autoDismissMs > 0) {
      setTimeout(() => this._dismissOverlay(), this._config.autoDismissMs);
    }
  }

  private _dismissOverlay(): void {
    if (typeof document === "undefined") return;
    document.getElementById(ERROR_OVERLAY_ID)?.remove();
  }
}
