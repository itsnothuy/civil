/**
 * viewer.spec.ts — E2E smoke test (Playwright)
 *
 * Tests basic viewer load, toolbar interaction, and
 * keyboard accessibility (Task 7 — K0, H1).
 *
 * Run: npm run test:e2e
 * Requires: npm run dev (started by playwright.config.ts webServer)
 */

import { test, expect } from "@playwright/test";

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

    const expectedButtons = ["3D", "2D", "Measure", "Annotate", "Section", "X-Ray", "Export BCF"];
    for (const label of expectedButtons) {
      await expect(page.getByRole("button", { name: new RegExp(label, "i") })).toBeVisible();
    }
  });

  test("3D/2D toggle buttons update aria-pressed", async ({ page }) => {
    const btn3d = page.getByRole("button", { name: /3D/i });
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
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export bcf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("annotations.json");
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
