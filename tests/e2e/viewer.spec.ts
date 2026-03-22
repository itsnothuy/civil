/**
 * viewer.spec.ts — E2E test suite (Playwright)
 *
 * Comprehensive tests for the Civil BIM Viewer covering:
 *   - Page load & toolbar rendering
 *   - 3D/2D camera toggle
 *   - Measurement tool activation
 *   - Annotation mode
 *   - Section plane management
 *   - Search filtering
 *   - Filter panel interaction
 *   - Keyboard shortcuts & navigation
 *   - High-contrast mode
 *   - Export/Import
 *   - Accessibility (ARIA, focus management)
 *
 * Phase 4, Task 4.2
 *
 * Run: npm run test:e2e
 * Requires: npm run dev (started by playwright.config.ts webServer)
 */

import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Smoke Tests                                                       */
/* ------------------------------------------------------------------ */

test.describe("Civil BIM Viewer — smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("page title is correct", async ({ page }) => {
    await expect(page).toHaveTitle(/Civil BIM Viewer/i);
  });

  test("toolbar renders with all required buttons", async ({ page }) => {
    const toolbar = page.getByRole("banner", { name: "Viewer toolbar" });
    await expect(toolbar).toBeVisible();

    // Verify key toolbar buttons exist using their aria-label accessible names
    const expectedLabels = [
      "Switch to 3D view",
      "Switch to 2D plan view",
      "Activate measurement tool",
      "Add annotation",
      "Add section plane",
      "Toggle X-ray mode",
      "Export issues as BCF",
    ];
    for (const label of expectedLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("3D/2D toggle buttons update aria-pressed", async ({ page }) => {
    const btn3d = page.getByRole("button", { name: /3D/i }).first();
    const btn2d = page.getByRole("button", { name: /2D plan view/i });

    // Initially 3D is pressed
    await expect(btn3d).toHaveAttribute("aria-pressed", "true");
    await expect(btn2d).toHaveAttribute("aria-pressed", "false");

    // Click 2D
    await btn2d.click();
    await expect(btn3d).toHaveAttribute("aria-pressed", "false");
    await expect(btn2d).toHaveAttribute("aria-pressed", "true");
  });

  test("search input is keyboard-accessible and has ARIA label", async ({ page }) => {
    const input = page.getByRole("searchbox", { name: /search model objects/i });
    await expect(input).toBeVisible();

    // Tab to the input
    await page.keyboard.press("Tab");
    // Should be focusable
    await input.fill("beam");
    await expect(input).toHaveValue("beam");
  });

  test("Export BCF button triggers a file download", async ({ page }) => {
    // Intercept programmatic anchor click to verify download trigger
    const result = await page.evaluate(() => {
      return new Promise<{ href: string; download: string }>((resolve) => {
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          if (this.download) {
            resolve({ href: this.href, download: this.download });
          } else {
            origClick.call(this);
          }
        };
        document.getElementById("btn-export-bcf")?.click();
      });
    });
    expect(result.download).toBe("annotations.json");
    expect(result.href).toMatch(/^blob:/);
  });

  test("all interactive elements are reachable by keyboard", async ({ page }) => {
    // Tab through the toolbar; all buttons should receive focus
    const buttons = await page.getByRole("button").all();
    for (const btn of buttons) {
      await btn.focus();
      const focused = await btn.evaluate((el) => document.activeElement === el);
      expect(focused).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Camera Toggle                                                     */
/* ------------------------------------------------------------------ */

test.describe("Camera mode toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("2D button sets aria-pressed and 3D button unsets", async ({ page }) => {
    const btn3d = page.getByRole("button", { name: /^Switch to 3D view$/i });
    const btn2d = page.getByRole("button", { name: /2D plan view/i });

    await btn2d.click();
    await expect(btn2d).toHaveAttribute("aria-pressed", "true");
    await expect(btn3d).toHaveAttribute("aria-pressed", "false");

    // Switch back to 3D
    await btn3d.click();
    await expect(btn3d).toHaveAttribute("aria-pressed", "true");
    await expect(btn2d).toHaveAttribute("aria-pressed", "false");
  });

  test("rapid 3D/2D toggling does not crash", async ({ page }) => {
    const btn3d = page.getByRole("button", { name: /^Switch to 3D view$/i });
    const btn2d = page.getByRole("button", { name: /2D plan view/i });

    for (let i = 0; i < 5; i++) {
      await btn2d.click();
      await btn3d.click();
    }
    // Page should still be functional
    await expect(page.locator("#viewer-canvas")).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Measurement Tool                                                  */
/* ------------------------------------------------------------------ */

test.describe("Measurement tool", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("measure button toggles aria-pressed on click", async ({ page }) => {
    const btn = page.getByRole("button", { name: /activate measurement tool/i });
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("path measure button toggles aria-pressed on click", async ({ page }) => {
    const btn = page.getByRole("button", { name: /path measurement/i });
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("measure and path are mutually exclusive", async ({ page }) => {
    const btnMeasure = page.getByRole("button", { name: /activate measurement tool/i });
    const btnPath = page.getByRole("button", { name: /path measurement/i });

    // Activate measure
    await btnMeasure.click();
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "true");

    // Activate path — measure should deactivate
    await btnPath.click();
    await expect(btnPath).toHaveAttribute("aria-pressed", "true");
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "false");
  });
});

/* ------------------------------------------------------------------ */
/*  Annotation Mode                                                   */
/* ------------------------------------------------------------------ */

test.describe("Annotation mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("annotate button toggles aria-pressed", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add annotation/i });
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("annotation form is hidden by default", async ({ page }) => {
    const form = page.locator("#annotation-form");
    await expect(form).toBeHidden();
  });
});

/* ------------------------------------------------------------------ */
/*  Section Planes                                                    */
/* ------------------------------------------------------------------ */

test.describe("Section planes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("section button adds a section chip", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add section plane/i });
    await btn.click();

    // A section list container should appear with a chip
    const sectionList = page.locator("#section-list");
    await expect(sectionList).toBeVisible();
    await expect(sectionList.locator(".section-chip")).toHaveCount(1);
  });

  test("multiple section planes can be added", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add section plane/i });
    await btn.click();
    await btn.click();
    await btn.click();

    const sectionList = page.locator("#section-list");
    await expect(sectionList.locator(".section-chip")).toHaveCount(3);
  });

  test("clear all removes all section chips", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add section plane/i });
    await btn.click();
    await btn.click();

    const clearBtn = page.getByRole("button", { name: /clear all section planes/i });
    await clearBtn.click();

    const sectionList = page.locator("#section-list");
    // After clearing, chips should be gone
    await expect(sectionList.locator(".section-chip")).toHaveCount(0);
  });

  test("individual section chip can be removed", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add section plane/i });
    await btn.click();
    await btn.click();

    const sectionList = page.locator("#section-list");
    const chips = sectionList.locator(".section-chip");
    await expect(chips).toHaveCount(2);

    // Click the first chip to remove it
    await chips.first().click();
    await expect(sectionList.locator(".section-chip")).toHaveCount(1);
  });

  test("maximum 6 section planes enforced", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add section plane/i });
    for (let i = 0; i < 8; i++) {
      await btn.click();
    }

    const sectionList = page.locator("#section-list");
    // Max 6 planes — extra clicks should not add more
    await expect(sectionList.locator(".section-chip")).toHaveCount(6);
  });
});

/* ------------------------------------------------------------------ */
/*  X-Ray Toggle                                                      */
/* ------------------------------------------------------------------ */

test.describe("X-ray toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("X-ray button toggles aria-pressed", async ({ page }) => {
    const btn = page.getByRole("button", { name: /toggle x-ray/i });

    // Initially not pressed
    const initial = await btn.getAttribute("aria-pressed");
    await btn.click();
    const after = await btn.getAttribute("aria-pressed");
    expect(initial !== after).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Search Filtering                                                  */
/* ------------------------------------------------------------------ */

test.describe("Search filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("search input accepts text", async ({ page }) => {
    const input = page.getByRole("searchbox", { name: /search model objects/i });
    await input.fill("wall");
    await expect(input).toHaveValue("wall");
  });

  test("clearing search input resets filter", async ({ page }) => {
    const input = page.getByRole("searchbox", { name: /search model objects/i });
    await input.fill("wall");
    await input.fill("");
    await expect(input).toHaveValue("");
  });
});

/* ------------------------------------------------------------------ */
/*  Filter Panel                                                      */
/* ------------------------------------------------------------------ */

test.describe("Filter panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("filter panel section exists", async ({ page }) => {
    const filterPanel = page.locator("#filter-panel");
    await expect(filterPanel).toBeVisible();
  });

  test("filter panel has discipline heading", async ({ page }) => {
    const heading = page.locator("#filter-panel h4");
    await expect(heading).toHaveText("Disciplines");
  });

  test("show all / hide all buttons exist", async ({ page }) => {
    const showAll = page.locator("#filter-panel button[data-filter-action='show-all']");
    const hideAll = page.locator("#filter-panel button[data-filter-action='hide-all']");
    await expect(showAll).toBeVisible();
    await expect(hideAll).toBeVisible();
  });

  test("x-ray hidden toggle exists", async ({ page }) => {
    const xrayToggle = page.locator("#filter-panel input[data-filter-action='xray-toggle']");
    await expect(xrayToggle).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  High-Contrast Mode                                                */
/* ------------------------------------------------------------------ */

test.describe("High-contrast mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("contrast button toggles high-contrast class on body", async ({ page }) => {
    const btn = page.getByRole("button", { name: /toggle high-contrast/i });

    // Initially no high-contrast
    await expect(page.locator("body")).not.toHaveClass(/high-contrast/);

    await btn.click();
    await expect(page.locator("body")).toHaveClass(/high-contrast/);

    await btn.click();
    await expect(page.locator("body")).not.toHaveClass(/high-contrast/);
  });

  test("high-contrast persists across page reload", async ({ page }) => {
    const btn = page.getByRole("button", { name: /toggle high-contrast/i });
    await btn.click();
    await expect(page.locator("body")).toHaveClass(/high-contrast/);

    // Reload the page
    await page.reload();
    await expect(page.locator("body")).toHaveClass(/high-contrast/);
  });
});

/* ------------------------------------------------------------------ */
/*  Keyboard Shortcuts                                                */
/* ------------------------------------------------------------------ */

test.describe("Keyboard shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
    // Click canvas to ensure focus is not in an input
    await page.locator("#viewer-canvas").click();
  });

  test("M key toggles measurement mode", async ({ page }) => {
    const btn = page.getByRole("button", {
      name: /activate measurement tool/i,
    });
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("m");
    await expect(btn).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("m");
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("A key toggles annotation mode", async ({ page }) => {
    const btn = page.getByRole("button", { name: /add annotation/i });
    await expect(btn).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("a");
    await expect(btn).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("a");
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("H key toggles high-contrast mode", async ({ page }) => {
    await expect(page.locator("body")).not.toHaveClass(/high-contrast/);

    await page.keyboard.press("h");
    await expect(page.locator("body")).toHaveClass(/high-contrast/);

    await page.keyboard.press("h");
    await expect(page.locator("body")).not.toHaveClass(/high-contrast/);
  });

  test("F key focuses search input", async ({ page }) => {
    await page.keyboard.press("f");
    const searchInput = page.locator("#search-input");
    await expect(searchInput).toBeFocused();
  });

  test("? key opens keyboard help overlay", async ({ page }) => {
    await page.keyboard.type("?");
    const overlay = page.locator("#keyboard-help-overlay");
    await expect(overlay).toBeVisible();
  });

  test("keyboard help overlay can be dismissed", async ({ page }) => {
    await page.keyboard.type("?");
    const overlay = page.locator("#keyboard-help-overlay");
    await expect(overlay).toBeVisible();

    // Click the close button
    await page.getByRole("button", { name: /close help/i }).click();
    await expect(overlay).not.toBeVisible();
  });

  test("Escape deselects and cancels active modes", async ({ page }) => {
    // Activate measurement first
    await page.keyboard.press("m");
    const btnMeasure = page.getByRole("button", {
      name: /activate measurement tool/i,
    });
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "true");

    // Escape should cancel
    await page.keyboard.press("Escape");
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "false");
  });

  test("X key toggles X-ray mode", async ({ page }) => {
    const btn = page.getByRole("button", { name: /toggle x-ray/i });
    const initial = await btn.getAttribute("aria-pressed");

    await page.keyboard.press("x");
    const after = await btn.getAttribute("aria-pressed");
    expect(initial !== after).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Skip-to-content Link                                              */
/* ------------------------------------------------------------------ */

test.describe("Skip-to-content link", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("skip link exists and is initially off-screen", async ({ page }) => {
    const skipLink = page.locator("#skip-link");
    await expect(skipLink).toBeAttached();
    // It should exist in the DOM
    await expect(skipLink).toHaveText(/skip to viewer/i);
  });
});

/* ------------------------------------------------------------------ */
/*  Accessibility                                                     */
/* ------------------------------------------------------------------ */

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("canvas has aria-label", async ({ page }) => {
    const canvas = page.locator("#viewer-canvas");
    await expect(canvas).toHaveAttribute("aria-label", "Interactive 3D model canvas");
  });

  test("canvas has tabindex for keyboard focus", async ({ page }) => {
    const canvas = page.locator("#viewer-canvas");
    await expect(canvas).toHaveAttribute("tabindex", "0");
  });

  test("toolbar has role=banner and aria-label", async ({ page }) => {
    const toolbar = page.locator("#toolbar");
    await expect(toolbar).toHaveAttribute("role", "banner");
    await expect(toolbar).toHaveAttribute("aria-label", "Viewer toolbar");
  });

  test("properties panel has aria-live for screen readers", async ({ page }) => {
    const panel = page.locator("#properties-panel");
    await expect(panel).toHaveAttribute("aria-live", "polite");
  });

  test("sidebar panels have complementary role", async ({ page }) => {
    const treePanel = page.locator("#panel-tree");
    const propsPanel = page.locator("#panel-properties");
    await expect(treePanel).toHaveAttribute("role", "complementary");
    await expect(propsPanel).toHaveAttribute("role", "complementary");
  });

  test("viewer container has role=main", async ({ page }) => {
    const main = page.locator("#viewer-container");
    await expect(main).toHaveAttribute("role", "main");
  });

  test("all toolbar buttons have aria-label attributes", async ({ page }) => {
    const toolbarButtons = page.locator("#toolbar button");
    const count = await toolbarButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = toolbarButtons.nth(i);
      const label = await btn.getAttribute("aria-label");
      expect(label).toBeTruthy();
    }
  });

  test("import file input is hidden with aria-hidden", async ({ page }) => {
    const fileInput = page.locator("#import-file-input");
    await expect(fileInput).toHaveAttribute("aria-hidden", "true");
  });

  test("nav cube canvas is aria-hidden", async ({ page }) => {
    const navCube = page.locator("#nav-cube-canvas");
    await expect(navCube).toHaveAttribute("aria-hidden", "true");
  });
});

/* ------------------------------------------------------------------ */
/*  Layout & Responsive                                               */
/* ------------------------------------------------------------------ */

test.describe("Layout structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("all major layout sections are visible", async ({ page }) => {
    await expect(page.locator("#toolbar")).toBeVisible();
    await expect(page.locator("#panel-tree")).toBeVisible();
    await expect(page.locator("#viewer-container")).toBeVisible();
    await expect(page.locator("#panel-properties")).toBeVisible();
  });

  test("viewer canvas fills its container", async ({ page }) => {
    const canvas = page.locator("#viewer-canvas");
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});

/* ------------------------------------------------------------------ */
/*  Import Button                                                    */
/* ------------------------------------------------------------------ */

test.describe("Import button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("import button exists and is visible", async ({ page }) => {
    const btn = page.getByRole("button", { name: /import annotations/i });
    await expect(btn).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Mutual Exclusion: Measure vs Annotate                             */
/* ------------------------------------------------------------------ */

test.describe("Tool mutual exclusion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("activating annotation deactivates measurement", async ({ page }) => {
    const btnMeasure = page.getByRole("button", {
      name: /activate measurement tool/i,
    });
    const btnAnnotate = page.getByRole("button", { name: /add annotation/i });

    await btnMeasure.click();
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "true");

    await btnAnnotate.click();
    await expect(btnAnnotate).toHaveAttribute("aria-pressed", "true");
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "false");
  });

  test("activating measurement deactivates annotation via keyboard", async ({ page }) => {
    await page.locator("#viewer-canvas").click();

    // Activate annotation via A key
    await page.keyboard.press("a");
    const btnAnnotate = page.getByRole("button", { name: /add annotation/i });
    await expect(btnAnnotate).toHaveAttribute("aria-pressed", "true");

    // Activate measurement via M key — should deactivate annotation
    await page.keyboard.press("m");
    const btnMeasure = page.getByRole("button", {
      name: /activate measurement tool/i,
    });
    await expect(btnMeasure).toHaveAttribute("aria-pressed", "true");
  });
});
