#!/usr/bin/env node

/**
 * Release Script — Civil BIM Viewer
 *
 * Usage:
 *   npm run release -- patch|minor|major   # bump, update CHANGELOG, commit, tag
 *   npm run release:dry -- patch           # dry-run (print what would happen)
 *
 * This script:
 *  1. Validates the working directory is clean
 *  2. Bumps the version in package.json (semver)
 *  3. Prepends a new entry to CHANGELOG.md with auto-generated notes
 *  4. Commits the version bump
 *  5. Creates a git tag (v<version>)
 *  6. Prints instructions to push the tag (which triggers release.yml)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a semver string into { major, minor, patch, prerelease }. */
export function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

/** Bump a semver version by the given type. */
export function bumpVersion(current, type) {
  const v = parseSemver(current);
  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}. Use major|minor|patch`);
  }
}

/** Build a CHANGELOG entry from conventional commits since the last tag. */
export function buildChangelogEntry(version, commits) {
  const date = new Date().toISOString().slice(0, 10);
  const groups = { feat: [], fix: [], docs: [], refactor: [], test: [], other: [] };

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

  const sections = [];
  if (groups.feat.length) sections.push(`### Added\n${groups.feat.join("\n")}`);
  if (groups.fix.length) sections.push(`### Fixed\n${groups.fix.join("\n")}`);
  if (groups.refactor.length) sections.push(`### Changed\n${groups.refactor.join("\n")}`);
  if (groups.docs.length) sections.push(`### Documentation\n${groups.docs.join("\n")}`);
  if (groups.test.length) sections.push(`### Tests\n${groups.test.join("\n")}`);
  if (groups.other.length) sections.push(`### Other\n${groups.other.join("\n")}`);

  return `## [${version}] — ${date}\n\n${sections.join("\n\n") || "- Release v" + version}`;
}

/** Get conventional commits since the last tag. */
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
      encoding: "utf8",
      cwd: ROOT,
    }).trim();
    const log = execSync(`git log ${lastTag}..HEAD --oneline`, {
      encoding: "utf8",
      cwd: ROOT,
    });
    return log.trim().split("\n").filter(Boolean);
  } catch {
    // No tags yet — get all commits
    const log = execSync("git log --oneline", {
      encoding: "utf8",
      cwd: ROOT,
    });
    return log.trim().split("\n").filter(Boolean);
  }
}

/** Check if the git working directory is clean. */
function isWorkingDirClean() {
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
  return status.length === 0;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = process.env.DRY_RUN === "true" || args.includes("--dry-run");
  const bumpType = args.find((a) => ["major", "minor", "patch"].includes(a));

  if (!bumpType) {
    console.error("Usage: npm run release -- patch|minor|major [--dry-run]");
    process.exit(1);
  }

  // 1. Check working directory
  if (!dryRun && !isWorkingDirClean()) {
    console.error("Error: Working directory is not clean. Commit or stash changes first.");
    process.exit(1);
  }

  // 2. Read current version
  const pkgPath = resolve(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const currentVersion = pkg.version;
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`\n📦 Release: ${currentVersion} → ${newVersion} (${bumpType})\n`);

  // 3. Get commits for CHANGELOG
  const commits = getCommitsSinceLastTag();
  const changelogEntry = buildChangelogEntry(newVersion, commits);

  if (dryRun) {
    console.log("=== DRY RUN ===\n");
    console.log(`Would bump: ${currentVersion} → ${newVersion}`);
    console.log(`\nCHANGELOG entry:\n${changelogEntry}\n`);
    console.log(`Would commit: "chore(release): v${newVersion}"`);
    console.log(`Would tag: v${newVersion}`);
    console.log("\n=== END DRY RUN ===");
    return;
  }

  // 4. Update package.json
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✅ Updated package.json → ${newVersion}`);

  // 5. Update CHANGELOG.md
  const changelogPath = resolve(ROOT, "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  const insertPoint = changelog.indexOf("\n## [");
  const newChangelog =
    insertPoint >= 0
      ? changelog.slice(0, insertPoint) +
        "\n" +
        changelogEntry +
        "\n" +
        changelog.slice(insertPoint)
      : changelog + "\n" + changelogEntry + "\n";
  writeFileSync(changelogPath, newChangelog);
  console.log("✅ Updated CHANGELOG.md");

  // 6. Git commit & tag
  execSync("git add package.json CHANGELOG.md", { cwd: ROOT, stdio: "inherit" });
  execSync(`git commit -m "chore(release): v${newVersion}"`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log(`✅ Created tag v${newVersion}`);

  // 7. Instructions
  console.log(`
🚀 Release v${newVersion} prepared!

To publish:
  git push origin main --follow-tags

This will trigger the GitHub Release workflow which:
  • Runs CI (lint, test, build)
  • Creates a GitHub Release with auto-generated notes
  • Uploads build artifacts (.tar.gz + .zip)
  • Builds and pushes Docker image to ghcr.io
`);
}

main();
