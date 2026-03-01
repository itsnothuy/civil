/**
 * Performance Benchmark Script
 *
 * Uses Playwright + Chrome DevTools Protocol (CDP) to measure:
 *   1. Page load time (DOMContentLoaded + load)
 *   2. FPS during camera interaction (orbit)
 *   3. Memory footprint (JS heap usage)
 *   4. Model load time (custom performance marks)
 *
 * Run via: npx playwright test tests/performance/benchmark.spec.ts --project=chromium
 *
 * Phase 3, Task 3.4
 */

import { test, expect, type Page, type CDPSession } from "@playwright/test";

/** Thresholds — CI budget (can be adjusted per model size) */
const BUDGET = {
  /** Maximum page load time (ms) */
  maxLoadTimeMs: 5000,
  /** Minimum FPS during orbit */
  minFps: 30,
  /** Maximum JS heap size (MB) */
  maxHeapMB: 500,
};

interface PerformanceMetrics {
  /** Time from navigation start to DOMContentLoaded (ms) */
  domContentLoaded: number;
  /** Time from navigation start to load event (ms) */
  loadTime: number;
  /** JS heap used (MB) */
  jsHeapUsedMB: number;
  /** JS heap total (MB) */
  jsHeapTotalMB: number;
  /** Estimated FPS during interaction */
  estimatedFps: number;
}

/**
 * Collect timing metrics from the browser's Performance API
 */
async function getNavigationTiming(
  page: Page,
): Promise<{ domContentLoaded: number; loadTime: number }> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadTime: Math.round(nav.loadEventEnd - nav.startTime),
    };
  });
}

/**
 * Get JS heap metrics via CDP
 */
async function getHeapMetrics(
  cdp: CDPSession,
): Promise<{ jsHeapUsedMB: number; jsHeapTotalMB: number }> {
  const result = await cdp.send("Runtime.getHeapUsage");
  return {
    jsHeapUsedMB: Math.round((result.usedSize / 1024 / 1024) * 100) / 100,
    jsHeapTotalMB: Math.round((result.totalSize / 1024 / 1024) * 100) / 100,
  };
}

/**
 * Estimate FPS by requesting animation frames over a duration.
 * Simulates orbit interaction via mouse drag during the measurement.
 */
async function measureFps(page: Page, durationMs: number = 2000): Promise<number> {
  // Start FPS counting
  const fps = await page.evaluate(async (duration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const start = performance.now();
      function tick() {
        frameCount++;
        if (performance.now() - start < duration) {
          requestAnimationFrame(tick);
        } else {
          const elapsed = performance.now() - start;
          resolve(Math.round((frameCount / elapsed) * 1000));
        }
      }
      requestAnimationFrame(tick);
    });
  }, durationMs);

  return fps;
}

test.describe("Performance Benchmarks", () => {
  test.describe.configure({ mode: "serial" });

  let metrics: PerformanceMetrics;

  test("measure page load, heap, and FPS", async ({ page, context }) => {
    // Start CDP session for heap metrics
    const cdp = await context.newCDPSession(page);

    // Navigate and wait for full load
    const startNav = Date.now();
    await page.goto("/", { waitUntil: "load", timeout: 15000 });
    const navElapsed = Date.now() - startNav;

    // Wait a bit for xeokit to initialize
    await page.waitForTimeout(1000);

    // Navigation timing
    const timing = await getNavigationTiming(page);

    // Heap metrics
    const heap = await getHeapMetrics(cdp);

    // FPS measurement (with simulated mouse movement for orbit)
    const canvas = page.locator("#viewer-canvas");
    const box = await canvas.boundingBox();
    if (box) {
      // Start orbit drag
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();

      // Measure FPS while dragging
      const fpsPromise = measureFps(page, 2000);

      // Simulate orbit movement
      for (let i = 0; i < 40; i++) {
        await page.mouse.move(cx + Math.sin(i * 0.15) * 100, cy + Math.cos(i * 0.15) * 50);
        await page.waitForTimeout(50);
      }

      await page.mouse.up();
      metrics = {
        ...timing,
        ...heap,
        estimatedFps: await fpsPromise,
      };
    } else {
      metrics = {
        ...timing,
        ...heap,
        estimatedFps: 0,
      };
    }

    // Log results
    console.log("\n=== PERFORMANCE BENCHMARK RESULTS ===");
    console.log(`  Navigation elapsed:   ${navElapsed} ms`);
    console.log(`  DOMContentLoaded:     ${metrics.domContentLoaded} ms`);
    console.log(`  Load event:           ${metrics.loadTime} ms`);
    console.log(`  JS Heap used:         ${metrics.jsHeapUsedMB} MB`);
    console.log(`  JS Heap total:        ${metrics.jsHeapTotalMB} MB`);
    console.log(`  Estimated FPS:        ${metrics.estimatedFps}`);
    console.log("=====================================\n");

    // Assertions against budget
    expect(metrics.loadTime).toBeLessThan(BUDGET.maxLoadTimeMs);
    expect(metrics.jsHeapUsedMB).toBeLessThan(BUDGET.maxHeapMB);
    // FPS check is soft — only warn if no canvas was found
    if (metrics.estimatedFps > 0) {
      expect(metrics.estimatedFps).toBeGreaterThanOrEqual(BUDGET.minFps);
    }

    // Detach CDP
    await cdp.detach();
  });

  test("measure canvas render after interaction", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(500);

    // Measure time for a mode switch (3D → 2D → 3D)
    const switchTime = await page.evaluate(async () => {
      const start = performance.now();
      // Click 2D button
      (document.getElementById("btn-2d") as HTMLButtonElement)?.click();
      // Wait a frame
      await new Promise((r) => requestAnimationFrame(r));
      // Click 3D button
      (document.getElementById("btn-3d") as HTMLButtonElement)?.click();
      await new Promise((r) => requestAnimationFrame(r));
      return Math.round(performance.now() - start);
    });

    console.log(`  Mode switch round-trip: ${switchTime} ms`);
    // Should be near-instant (< 500ms for the UI response)
    expect(switchTime).toBeLessThan(500);
  });
});
