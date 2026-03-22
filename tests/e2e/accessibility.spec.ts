/**
 * accessibility.spec.ts — Automated accessibility audit (Playwright + axe-core)
 *
 * Task 4.3: Accessibility Audit
 *   - axe-core scan for WCAG 2.1 AA violations
 *   - Tests across multiple states: default, high-contrast, measurement active,
 *     annotation active, keyboard help overlay open
 *   - AC: 0 critical violations, 0 serious violations
 *
 * Run: npx playwright test tests/e2e/accessibility.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
// eslint-disable-next-line import/no-named-as-default
import AxeBuilder from "@axe-core/playwright";

/* ------------------------------------------------------------------ */
/*  Helper: run axe and assert no critical/serious violations         */
/* ------------------------------------------------------------------ */

async function assertNoA11yViolations(page: import("@playwright/test").Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");

  if (critical.length > 0 || serious.length > 0) {
    const summary = [...critical, ...serious]
      .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instance(s))`)
      .join("\n  ");
    throw new Error(`Accessibility violations in "${context}":\n  ${summary}`);
  }

  // Log minor/moderate violations for awareness but don't fail
  const minor = results.violations.filter((v) => v.impact === "minor" || v.impact === "moderate");
  if (minor.length > 0) {
    console.warn(`[a11y] ${context}: ${minor.length} minor/moderate violation(s)`);
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

test.describe("Accessibility audit (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?projectId=sample");
  });

  test("default state has no critical/serious violations", async ({ page }) => {
    await assertNoA11yViolations(page, "default state");
  });

  test("high-contrast mode has no critical/serious violations", async ({ page }) => {
    await page.getByRole("button", { name: /toggle high-contrast/i }).click();
    await expect(page.locator("body")).toHaveClass(/high-contrast/);
    // Wait for CSS variables to repaint
    await page.waitForTimeout(500);
    await assertNoA11yViolations(page, "high-contrast mode");
  });

  test("measurement tool active has no critical/serious violations", async ({ page }) => {
    await page.getByRole("button", { name: /activate measurement tool/i }).click();
    await assertNoA11yViolations(page, "measurement tool active");
  });

  test("annotation mode active has no critical/serious violations", async ({ page }) => {
    await page.getByRole("button", { name: /add annotation/i }).click();
    await assertNoA11yViolations(page, "annotation mode active");
  });

  test("section plane added has no critical/serious violations", async ({ page }) => {
    await page.getByRole("button", { name: /add section plane/i }).click();
    await assertNoA11yViolations(page, "section plane added");
  });

  test("keyboard help overlay has no critical/serious violations", async ({ page }) => {
    // Focus canvas first, then open help
    await page.locator("#viewer-canvas").click();
    await page.keyboard.type("?");
    await expect(page.locator("#keyboard-help-overlay")).toBeVisible();
    await assertNoA11yViolations(page, "keyboard help overlay");
  });

  test("total violations count summary", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Log full violation summary
    console.log(`Total axe violations: ${results.violations.length}`);
    console.log(`  Critical: ${results.violations.filter((v) => v.impact === "critical").length}`);
    console.log(`  Serious: ${results.violations.filter((v) => v.impact === "serious").length}`);
    console.log(`  Moderate: ${results.violations.filter((v) => v.impact === "moderate").length}`);
    console.log(`  Minor: ${results.violations.filter((v) => v.impact === "minor").length}`);
    console.log(`Passes: ${results.passes.length}`);

    // AC: 0 critical violations
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});
