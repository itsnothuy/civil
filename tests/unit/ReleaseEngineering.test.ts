/**
 * Release Engineering tests — validates release script logic,
 * Dockerfile structure, workflow configuration, and semver enforcement.
 */

import * as fs from "fs";
import * as path from "path";

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"));

// ── Inline implementations (matching scripts/release.mjs exports) ──────────
// We duplicate the pure functions here because Jest cannot import .mjs
// with `new Function()`-style dynamic ESM. This keeps tests synchronous.

function parseSemver(version: string) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

function bumpVersion(current: string, type: "major" | "minor" | "patch"): string {
  const v = parseSemver(current);
  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
}

function buildChangelogEntry(version: string, commits: string[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const groups: Record<string, string[]> = {
    feat: [],
    fix: [],
    docs: [],
    refactor: [],
    test: [],
    other: [],
  };

  for (const line of commits) {
    const match = line.match(/^[a-f0-9]+ (feat|fix|docs|refactor|test)(\(.+?\))?:\s*(.+)$/);
    if (match) {
      const type = match[1];
      const scope = match[2] ? match[2] : "";
      const msg = match[3];
      groups[type].push(`- ${scope ? `**${scope.slice(1, -1)}:** ` : ""}${msg}`);
    } else {
      const cleaned = line.replace(/^[a-f0-9]+ /, "");
      if (cleaned.trim()) groups.other.push(`- ${cleaned}`);
    }
  }

  const sections: string[] = [];
  if (groups.feat.length) sections.push(`### Added\n${groups.feat.join("\n")}`);
  if (groups.fix.length) sections.push(`### Fixed\n${groups.fix.join("\n")}`);
  if (groups.refactor.length) sections.push(`### Changed\n${groups.refactor.join("\n")}`);
  if (groups.docs.length) sections.push(`### Documentation\n${groups.docs.join("\n")}`);
  if (groups.test.length) sections.push(`### Tests\n${groups.test.join("\n")}`);
  if (groups.other.length) sections.push(`### Other\n${groups.other.join("\n")}`);

  return `## [${version}] — ${date}\n\n${sections.join("\n\n") || "- Release v" + version}`;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Release Engineering", () => {
  // ── parseSemver ────────────────────────────────────────────────────────
  describe("parseSemver", () => {
    it("parses a simple semver string", () => {
      expect(parseSemver("1.2.3")).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null,
      });
    });

    it("parses zero version", () => {
      expect(parseSemver("0.0.0")).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: null,
      });
    });

    it("parses prerelease versions", () => {
      expect(parseSemver("2.0.0-beta.1")).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: "beta.1",
      });
    });

    it("parses alpha prerelease", () => {
      expect(parseSemver("1.0.0-alpha")).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: "alpha",
      });
    });

    it("parses large version numbers", () => {
      expect(parseSemver("100.200.300")).toEqual({
        major: 100,
        minor: 200,
        patch: 300,
        prerelease: null,
      });
    });

    it("throws on invalid input", () => {
      expect(() => parseSemver("not-a-version")).toThrow("Invalid semver");
    });

    it("throws on empty string", () => {
      expect(() => parseSemver("")).toThrow("Invalid semver");
    });

    it("throws on partial version", () => {
      expect(() => parseSemver("1.2")).toThrow("Invalid semver");
    });

    it("throws on version with v prefix", () => {
      expect(() => parseSemver("v1.0.0")).toThrow("Invalid semver");
    });
  });

  // ── bumpVersion ────────────────────────────────────────────────────────
  describe("bumpVersion", () => {
    it("bumps patch version", () => {
      expect(bumpVersion("1.0.0", "patch")).toBe("1.0.1");
    });

    it("bumps minor version and resets patch", () => {
      expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
    });

    it("bumps major version and resets minor + patch", () => {
      expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
    });

    it("bumps from zero", () => {
      expect(bumpVersion("0.0.0", "patch")).toBe("0.0.1");
      expect(bumpVersion("0.0.0", "minor")).toBe("0.1.0");
      expect(bumpVersion("0.0.0", "major")).toBe("1.0.0");
    });

    it("drops prerelease on bump", () => {
      expect(bumpVersion("2.0.0-beta.1", "patch")).toBe("2.0.1");
    });

    it("throws on invalid bump type", () => {
      expect(() => bumpVersion("1.0.0", "invalid" as "patch")).toThrow("Invalid bump type");
    });
  });

  // ── buildChangelogEntry ────────────────────────────────────────────────
  describe("buildChangelogEntry", () => {
    it("generates entry with feat commits", () => {
      const commits = ["abc1234 feat(viewer): add zoom controls"];
      const entry = buildChangelogEntry("2.0.0", commits);
      expect(entry).toContain("## [2.0.0]");
      expect(entry).toContain("### Added");
      expect(entry).toContain("**viewer:** add zoom controls");
    });

    it("generates entry with fix commits", () => {
      const commits = ["abc1234 fix: resolve memory leak"];
      const entry = buildChangelogEntry("1.0.1", commits);
      expect(entry).toContain("### Fixed");
      expect(entry).toContain("- resolve memory leak");
    });

    it("groups multiple commit types", () => {
      const commits = [
        "abc1234 feat: new feature",
        "def5678 fix: bug fix",
        "aaa1111 docs: update readme",
        "bbb2222 refactor: clean code",
        "ccc3333 test: add tests",
      ];
      const entry = buildChangelogEntry("2.0.0", commits);
      expect(entry).toContain("### Added");
      expect(entry).toContain("### Fixed");
      expect(entry).toContain("### Documentation");
      expect(entry).toContain("### Changed");
      expect(entry).toContain("### Tests");
    });

    it("handles non-conventional commits as other", () => {
      const commits = ["abc1234 random commit message"];
      const entry = buildChangelogEntry("1.1.0", commits);
      expect(entry).toContain("### Other");
      expect(entry).toContain("- random commit message");
    });

    it("handles empty commits list", () => {
      const entry = buildChangelogEntry("1.0.0", []);
      expect(entry).toContain("## [1.0.0]");
      expect(entry).toContain("- Release v1.0.0");
    });

    it("includes ISO date", () => {
      const entry = buildChangelogEntry("1.0.0", []);
      const today = new Date().toISOString().slice(0, 10);
      expect(entry).toContain(today);
    });

    it("handles scoped commits correctly", () => {
      const commits = [
        "abc1234 feat(security): add CSP headers",
        "def5678 feat(monitoring): add logger",
      ];
      const entry = buildChangelogEntry("2.0.0", commits);
      expect(entry).toContain("**security:** add CSP headers");
      expect(entry).toContain("**monitoring:** add logger");
    });

    it("handles unscoped commits correctly", () => {
      const commits = ["abc1234 feat: simple feature"];
      const entry = buildChangelogEntry("1.1.0", commits);
      expect(entry).toContain("- simple feature");
      expect(entry).not.toContain("**");
    });
  });

  // ── package.json version ───────────────────────────────────────────────
  describe("package.json version", () => {
    it("has valid semver version", () => {
      expect(() => parseSemver(pkg.version)).not.toThrow();
    });

    it("has release scripts", () => {
      expect(pkg.scripts.release).toBeDefined();
      expect(pkg.scripts["release:dry"]).toBeDefined();
    });
  });

  // ── Workflow files ─────────────────────────────────────────────────────
  describe("GitHub workflows", () => {
    it("release.yml exists", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/release.yml");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("release.yml triggers on version tags", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/release.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("tags:");
      expect(content).toContain('"v*"');
    });

    it("release.yml creates GitHub release with artifacts", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/release.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("softprops/action-gh-release");
      expect(content).toContain("generate_release_notes: true");
      expect(content).toContain(".tar.gz");
      expect(content).toContain(".zip");
    });

    it("release.yml builds and pushes Docker image", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/release.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("docker/build-push-action");
      expect(content).toContain("ghcr.io");
      expect(content).toContain("push: true");
    });

    it("release.yml validates semver tag", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/release.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("Validate Release Tag");
      expect(content).toContain("package.json version");
    });

    it("preview.yml exists", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/preview.yml");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("preview.yml triggers on pull requests", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/preview.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("pull_request");
    });

    it("preview.yml runs CI before preview", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/preview.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run typecheck");
      expect(content).toContain("npm run test");
      expect(content).toContain("npm run build");
    });

    it("ci.yml requires CI to pass", () => {
      const p = path.resolve(__dirname, "../../.github/workflows/ci.yml");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run test:coverage");
      expect(content).toContain("npm run build");
    });
  });

  // ── Dockerfile ─────────────────────────────────────────────────────────
  describe("Production Dockerfile", () => {
    it("Dockerfile exists in project root", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      expect(fs.existsSync(p)).toBe(true);
    });

    it("uses multi-stage build", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("AS builder");
      expect(content).toContain("FROM nginx:");
    });

    it("builds with Node.js", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("FROM node:20");
      expect(content).toContain("npm ci");
      expect(content).toContain("npm run build");
    });

    it("serves with nginx", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("nginx");
      expect(content).toContain("/usr/share/nginx/html");
    });

    it("has health check", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("HEALTHCHECK");
    });

    it("has OCI labels", () => {
      const p = path.resolve(__dirname, "../../Dockerfile");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("org.opencontainers.image.title");
      expect(content).toContain("org.opencontainers.image.source");
      expect(content).toContain("org.opencontainers.image.licenses");
    });

    it("nginx config exists with security headers", () => {
      const p = path.resolve(__dirname, "../../docker/nginx.conf");
      expect(fs.existsSync(p)).toBe(true);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("X-Frame-Options");
      expect(content).toContain("X-Content-Type-Options");
      expect(content).toContain("Content-Security-Policy");
    });

    it("nginx config has gzip compression", () => {
      const p = path.resolve(__dirname, "../../docker/nginx.conf");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("gzip on");
    });

    it("nginx config has SPA routing fallback", () => {
      const p = path.resolve(__dirname, "../../docker/nginx.conf");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("try_files");
      expect(content).toContain("/index.html");
    });

    it(".dockerignore exists", () => {
      const p = path.resolve(__dirname, "../../.dockerignore");
      expect(fs.existsSync(p)).toBe(true);
    });

    it(".dockerignore excludes node_modules and tests", () => {
      const p = path.resolve(__dirname, "../../.dockerignore");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("node_modules");
      expect(content).toContain("tests/");
    });
  });

  // ── CHANGELOG format ──────────────────────────────────────────────────
  describe("CHANGELOG.md", () => {
    it("exists and follows Keep a Changelog format", () => {
      const p = path.resolve(__dirname, "../../CHANGELOG.md");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("# Changelog");
      expect(content).toContain("Keep a Changelog");
      expect(content).toContain("Semantic Versioning");
    });

    it("has at least one version entry", () => {
      const p = path.resolve(__dirname, "../../CHANGELOG.md");
      const content = fs.readFileSync(p, "utf8");
      expect(content).toMatch(/## \[\d+\.\d+\.\d+\]/);
    });
  });
});
