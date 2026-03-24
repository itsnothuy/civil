/**
 * Community & Governance tests — validates documentation,
 * templates, governance docs, and architecture documentation.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");

/** Read file content, return empty string if not found. */
function readFileOrEmpty(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

describe("Community & Governance", () => {
  // ── Architecture documentation ────────────────────────────────────────
  describe("Architecture documentation", () => {
    const archPath = path.join(ROOT, "docs/architecture.md");

    it("docs/architecture.md exists", () => {
      expect(fs.existsSync(archPath)).toBe(true);
    });

    it("contains Mermaid diagrams", () => {
      const content = readFileOrEmpty(archPath);
      expect(content).toContain("```mermaid");
    });

    it("documents all major modules", () => {
      const content = readFileOrEmpty(archPath);
      const modules = [
        "ViewerCore",
        "ModelLoader",
        "AnnotationService",
        "MeasurementTool",
        "FilterPanel",
        "UIController",
        "CollaborationClient",
        "I18nService",
        "SecurityHeaders",
        "Logger",
        "ErrorBoundary",
        "PluginLoader",
        "ServiceWorkerManager",
      ];
      for (const mod of modules) {
        expect(content).toContain(mod);
      }
    });

    it("documents the technology stack", () => {
      const content = readFileOrEmpty(archPath);
      expect(content).toContain("xeokit-sdk");
      expect(content).toContain("TypeScript");
      expect(content).toContain("Vite");
      expect(content).toContain("Jest");
      expect(content).toContain("Playwright");
    });

    it("documents key design decisions", () => {
      const content = readFileOrEmpty(archPath);
      expect(content).toContain("Design Decisions");
      expect(content).toContain("unsafe-eval");
    });

    it("includes deployment options", () => {
      const content = readFileOrEmpty(archPath);
      expect(content).toContain("Deployment");
      expect(content).toContain("GitHub Pages");
      expect(content).toContain("Docker");
    });
  });

  // ── Feature guides ────────────────────────────────────────────────────
  describe("Feature guides", () => {
    const guidesDir = path.join(ROOT, "docs/feature-guides");

    it("feature-guides directory exists", () => {
      expect(fs.existsSync(guidesDir)).toBe(true);
    });

    it("has at least 3 feature guides", () => {
      const files = fs.readdirSync(guidesDir).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThanOrEqual(3);
    });

    it("measurement tool guide exists with content", () => {
      const p = path.join(guidesDir, "measurement-tool.md");
      const content = readFileOrEmpty(p);
      expect(content).toContain("Measurement");
      expect(content).toContain("Quick Start");
      expect(content).toContain("Keyboard Shortcuts");
    });

    it("annotations guide exists with content", () => {
      const p = path.join(guidesDir, "annotations.md");
      const content = readFileOrEmpty(p);
      expect(content).toContain("Annotation");
      expect(content).toContain("BCF");
      expect(content).toContain("Severity");
    });

    it("filter/layers guide exists with content", () => {
      const p = path.join(guidesDir, "filter-layers.md");
      const content = readFileOrEmpty(p);
      expect(content).toContain("Filter");
      expect(content).toContain("X-ray");
      expect(content).toContain("discipline");
    });

    it("each guide has API reference section", () => {
      const files = fs.readdirSync(guidesDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const content = readFileOrEmpty(path.join(guidesDir, file));
        expect(content).toContain("API Reference");
      }
    });
  });

  // ── Governance ─────────────────────────────────────────────────────────
  describe("GOVERNANCE.md", () => {
    const govPath = path.join(ROOT, "GOVERNANCE.md");

    it("exists", () => {
      expect(fs.existsSync(govPath)).toBe(true);
    });

    it("defines maintainer roles", () => {
      const content = readFileOrEmpty(govPath);
      expect(content).toContain("Maintainer");
      expect(content).toContain("Contributor");
    });

    it("describes decision process", () => {
      const content = readFileOrEmpty(govPath);
      expect(content).toContain("Decision Process");
    });

    it("includes security policy reference", () => {
      const content = readFileOrEmpty(govPath);
      expect(content).toContain("Security");
      expect(content).toContain("SECURITY.md");
    });

    it("includes community outreach plan", () => {
      const content = readFileOrEmpty(govPath);
      expect(content).toContain("Outreach");
      expect(content).toContain("OSArch");
    });

    it("describes licensing model", () => {
      const content = readFileOrEmpty(govPath);
      expect(content).toContain("AGPL-3.0");
      expect(content).toContain("dual-licensed");
    });
  });

  // ── Issue templates ───────────────────────────────────────────────────
  describe("Issue templates", () => {
    it("bug report template exists", () => {
      const p = path.join(ROOT, ".github/ISSUE_TEMPLATE/bug_report.md");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("bug report template has required sections", () => {
      const content = readFileOrEmpty(path.join(ROOT, ".github/ISSUE_TEMPLATE/bug_report.md"));
      expect(content).toContain("Describe the bug");
      expect(content).toContain("Steps to reproduce");
      expect(content).toContain("Environment");
    });

    it("feature request template exists", () => {
      const p = path.join(ROOT, ".github/ISSUE_TEMPLATE/feature_request.md");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("feature request template has required sections", () => {
      const content = readFileOrEmpty(path.join(ROOT, ".github/ISSUE_TEMPLATE/feature_request.md"));
      expect(content).toContain("Summary");
      expect(content).toContain("Motivation");
      expect(content).toContain("Acceptance criteria");
    });
  });

  // ── PR template ───────────────────────────────────────────────────────
  describe("PR template", () => {
    it("exists", () => {
      const p = path.join(ROOT, ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("has CI checklist items", () => {
      const content = readFileOrEmpty(
        path.join(ROOT, ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md"),
      );
      expect(content).toContain("npm test");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run typecheck");
      expect(content).toContain("npm run build");
    });

    it("requires CLA signature", () => {
      const content = readFileOrEmpty(
        path.join(ROOT, ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md"),
      );
      expect(content).toContain("CLA");
    });
  });

  // ── CONTRIBUTING.md ───────────────────────────────────────────────────
  describe("CONTRIBUTING.md", () => {
    const contribPath = path.join(ROOT, "CONTRIBUTING.md");

    it("exists", () => {
      expect(fs.existsSync(contribPath)).toBe(true);
    });

    it("references architecture docs", () => {
      const content = readFileOrEmpty(contribPath);
      expect(content).toContain("architecture.md");
    });

    it("references feature guides", () => {
      const content = readFileOrEmpty(contribPath);
      expect(content).toContain("feature-guides");
    });

    it("references governance", () => {
      const content = readFileOrEmpty(contribPath);
      expect(content).toContain("GOVERNANCE.md");
    });

    it("documents release process", () => {
      const content = readFileOrEmpty(contribPath);
      expect(content).toContain("npm run release");
      expect(content).toContain("Semantic Versioning");
    });

    it("documents CLA requirement", () => {
      const content = readFileOrEmpty(contribPath);
      expect(content).toContain("Contributor License Agreement");
    });
  });

  // ── CODE_OF_CONDUCT.md ───────────────────────────────────────────────
  describe("CODE_OF_CONDUCT.md", () => {
    it("exists", () => {
      const p = path.join(ROOT, "CODE_OF_CONDUCT.md");
      expect(fs.existsSync(p)).toBe(true);
    });
  });

  // ── SECURITY.md ──────────────────────────────────────────────────────
  describe("SECURITY.md", () => {
    it("exists", () => {
      const p = path.join(ROOT, "SECURITY.md");
      expect(fs.existsSync(p)).toBe(true);
    });
  });
});
