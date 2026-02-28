/**
 * Performance Benchmark Script
 *
 * Uses Playwright with Chrome DevTools Protocol (CDP) to measure:
 *  - Model load time (navigation to DOMContentLoaded → viewer ready)
 *  - FPS during simulated orbit interaction
 *  - Memory footprint (JS heap size)
 *
 * Phase 3, Task 3.4 — Performance Benchmarks
 *
 * Usage:
 *   npx tsx tests/performance/benchmark.ts [projectId]
 *
 * Requires the dev server to be running:
 *   npm run dev
 *
 * Budget thresholds (CI):
 *   - Load time:     < 5000 ms
 *   - FPS (orbit):   > 30 fps
 *   - Memory:        < 500 MB (for models up to 100 MB)
 */

import { chromium, type CDPSession, type Page } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PROJECT_ID = process.argv[2] ?? "sample";
const ORBIT_DURATION_MS = 3000;
const ORBIT_STEPS = 60;

/** CI budget thresholds */
const BUDGET = {
  loadTimeMs: 5000,
  minFps: 30,
  maxMemoryMb: 500,
};

// ── Helpers ───────────────────────────────────────────────

interface PerformanceMetrics {
  loadTimeMs: number;
  fps: number;
  jsHeapUsedMb: number;
  jsHeapTotalMb: number;
}

async function getJSHeapSize(cdp: CDPSession): Promise<{ used: number; total: number }> {
  const result = await cdp.send("Runtime.getHeapUsage");
  return {
    used: result.usedSize / (1024 * 1024),
    total: result.totalSize / (1024 * 1024),
  };
}

async function measureFPS(page: Page, durationMs: number): Promise<number> {
  // Use requestAnimationFrame counting within the page context
  const fps = await page.evaluate(
    ({ duration }) => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const start = performance.now();

        function countFrame() {
          frameCount++;
          if (performance.now() - start < duration) {
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = performance.now() - start;
            resolve((frameCount / elapsed) * 1000);
          }
        }

        requestAnimationFrame(countFrame);
      });
    },
    { duration: durationMs },
  );
  return fps;
}

async function simulateOrbit(page: Page, steps: number, durationMs: number): Promise<void> {
  const canvas = page.locator("#viewer-canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    console.warn("[Benchmark] Canvas not found — skipping orbit simulation.");
    return;
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radius = Math.min(box.width, box.height) * 0.3;
  const stepDelay = durationMs / steps;

  // Simulate a circular drag (orbit)
  await page.mouse.move(cx + radius, cy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    await page.mouse.move(x, y);
    await new Promise((r) => setTimeout(r, stepDelay));
  }
  await page.mouse.up();
}

// ── Main Benchmark ────────────────────────────────────────

async function runBenchmark(): Promise<PerformanceMetrics> {
  console.info(`\n📊 Civil BIM Viewer — Performance Benchmark`);
  console.info(`   URL:       ${BASE_URL}?projectId=${PROJECT_ID}`);
  console.info(`   Orbit:     ${ORBIT_DURATION_MS} ms, ${ORBIT_STEPS} steps\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu-sandbox", "--use-gl=swiftshader"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");

  // ── 1. Measure load time ────────────────────────────────
  const loadStart = Date.now();
  await page.goto(`${BASE_URL}?projectId=${PROJECT_ID}`, {
    waitUntil: "networkidle",
  });
  // Wait for canvas to be visible
  await page.waitForSelector("#viewer-canvas", { state: "visible", timeout: 10000 });
  // Small delay for xeokit to finish initializing
  await page.waitForTimeout(1000);
  const loadTimeMs = Date.now() - loadStart;

  console.info(`⏱  Load time:  ${loadTimeMs} ms`);

  // ── 2. Measure memory ───────────────────────────────────
  const heap = await getJSHeapSize(cdp);
  console.info(
    `🧠 JS Heap:    ${heap.used.toFixed(1)} MB used / ${heap.total.toFixed(1)} MB total`,
  );

  // ── 3. Measure FPS during orbit ─────────────────────────
  // Start FPS counting and orbit simulation in parallel
  const [fps] = await Promise.all([
    measureFPS(page, ORBIT_DURATION_MS),
    simulateOrbit(page, ORBIT_STEPS, ORBIT_DURATION_MS),
  ]);
  console.info(`🎞  FPS (orbit): ${fps.toFixed(1)}`);

  // ── 4. Memory after interaction ─────────────────────────
  const heapAfter = await getJSHeapSize(cdp);
  console.info(
    `🧠 JS Heap (after orbit): ${heapAfter.used.toFixed(1)} MB used / ${heapAfter.total.toFixed(1)} MB total`,
  );

  await browser.close();

  return {
    loadTimeMs,
    fps,
    jsHeapUsedMb: heapAfter.used,
    jsHeapTotalMb: heapAfter.total,
  };
}

// ── Budget Check ──────────────────────────────────────────

function checkBudget(metrics: PerformanceMetrics): boolean {
  let pass = true;

  console.info(`\n── Budget Check ──`);

  if (metrics.loadTimeMs > BUDGET.loadTimeMs) {
    console.error(`❌ Load time: ${metrics.loadTimeMs} ms > ${BUDGET.loadTimeMs} ms budget`);
    pass = false;
  } else {
    console.info(`✅ Load time: ${metrics.loadTimeMs} ms (budget: ${BUDGET.loadTimeMs} ms)`);
  }

  if (metrics.fps < BUDGET.minFps) {
    console.error(`❌ FPS: ${metrics.fps.toFixed(1)} < ${BUDGET.minFps} fps budget`);
    pass = false;
  } else {
    console.info(`✅ FPS: ${metrics.fps.toFixed(1)} (budget: ≥${BUDGET.minFps} fps)`);
  }

  if (metrics.jsHeapUsedMb > BUDGET.maxMemoryMb) {
    console.error(
      `❌ Memory: ${metrics.jsHeapUsedMb.toFixed(1)} MB > ${BUDGET.maxMemoryMb} MB budget`,
    );
    pass = false;
  } else {
    console.info(
      `✅ Memory: ${metrics.jsHeapUsedMb.toFixed(1)} MB (budget: ${BUDGET.maxMemoryMb} MB)`,
    );
  }

  console.info(pass ? "\n🎉 All budgets passed!" : "\n⚠️  Some budgets exceeded.");
  return pass;
}

// ── Entry Point ───────────────────────────────────────────

async function main(): Promise<void> {
  try {
    const metrics = await runBenchmark();

    // Write results as JSON for CI artifact collection
    const resultJson = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        projectId: PROJECT_ID,
        metrics,
        budget: BUDGET,
      },
      null,
      2,
    );
    console.info(`\n📄 Results JSON:\n${resultJson}`);

    const pass = checkBudget(metrics);
    if (!pass && process.env.CI) {
      process.exit(1);
    }
  } catch (err) {
    console.error("[Benchmark] Failed:", err);
    process.exit(1);
  }
}

main();
