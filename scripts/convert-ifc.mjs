#!/usr/bin/env node
/**
 * convert-ifc.mjs — IFC → glTF/GLB conversion helper (Task 3 — K0)
 *
 * Primary tool: ifcConvert from IfcOpenShell (LGPL-3.0)
 *   - Produces standard glTF/GLB (not xeokit-specific XKT)
 *   - Install: https://ifcopenshell.org/ifcconvert
 *
 * Usage:
 *   node scripts/convert-ifc.mjs <input.ifc> [projectId]
 *
 * Example:
 *   node scripts/convert-ifc.mjs models/bridge.ifc bridge-01
 *
 * Output:
 *   data/<projectId>/model.glb
 *   data/<projectId>/metadata.json   (IFC property sets as JSON)
 *
 * Prerequisites:
 *   - `ifcconvert` binary on PATH  (from IfcOpenShell)
 *   - Node.js >= 20
 *
 * Decision note (I-2):
 *   MVP uses ifcConvert (LGPL-3.0) for standard glTF/GLB output.
 *   XKT support via xeokit convert2xkt is deferred to V1 as an
 *   optional optimisation for xeokit-specific deployments.
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { basename, extname, resolve } from "path";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node scripts/convert-ifc.mjs <input.ifc> [projectId]");
  process.exit(1);
}

const inputPath = resolve(args[0]);
const projectId = args[1] ?? basename(inputPath, extname(inputPath));
const outputDir = resolve(`data/${projectId}`);
const outputGlb = `${outputDir}/model.glb`;
const outputMeta = `${outputDir}/metadata.json`;

if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

// --- Create output directory ---
mkdirSync(outputDir, { recursive: true });
console.log(`[convert-ifc] Output dir: ${outputDir}`);

// --- Check ifcconvert binary ---
try {
  execSync("ifcconvert --version", { stdio: "pipe" });
} catch {
  console.error(
    `[convert-ifc] ERROR: 'ifcconvert' not found on PATH.\n` +
    `Install IfcOpenShell from https://blenderbim.org/docs-python/ifcconvert.html\n` +
    `  macOS (Homebrew):  brew install ifcopenshell\n` +
    `  Linux:             apt-get install ifcopenshell  OR  pip install ifcopenshell\n` +
    `  Windows:           Download from https://ifcopenshell.org/ifcconvert\n`
  );
  process.exit(1);
}

// --- Convert IFC → GLB ---
console.log(`[convert-ifc] Converting ${inputPath} → ${outputGlb} …`);
const startTime = Date.now();

try {
  execSync(
    `ifcconvert "${inputPath}" "${outputGlb}" --use-world-coords --orient-shells`,
    { stdio: "inherit" }
  );
} catch (err) {
  console.error("[convert-ifc] Conversion failed:", err.message);
  process.exit(1);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`[convert-ifc] Conversion complete in ${elapsed}s → ${outputGlb}`);

// --- Write minimal metadata.json ---
const metadata = {
  schemaVersion: "1.0",
  projectId,
  sourceFile: basename(inputPath),
  convertedAt: new Date().toISOString(),
  conversionTool: "ifcconvert (IfcOpenShell)",
  modelUrl: "model.glb",
};
writeFileSync(outputMeta, JSON.stringify(metadata, null, 2));
console.log(`[convert-ifc] Metadata written → ${outputMeta}`);
console.log(`\n✅ Done. Open viewer with: ?projectId=${projectId}`);
