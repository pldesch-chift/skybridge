import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Handles two `dist/server.js` shapes:
// - new: `export default server` — wrapper sets the manifest and awaits run().
// - legacy: `export default await server.run()` (pre-wrapper templates) —
//   wrapper passes the value through so existing projects keep booting after
//   a skybridge upgrade without rebuilding.
export const ENTRY_WRAPPER_CONTENT = `import manifest from "./vite-manifest.js";
import userExport from "./server.js";

let resolved;
if (userExport && typeof userExport.setViteManifest === "function") {
  userExport.setViteManifest(manifest);
  resolved = await userExport.run();
} else {
  resolved = userExport;
}

export default resolved;
`;

// Dev counterpart to the prod entry wrapper. Skips setViteManifest (Vite
// middleware serves views in dev) and only calls run() when the user export
// is still an McpServer instance. Legacy templates that top-level-await
// run() themselves leave a resolved value here; the typeof guard makes this
// a no-op for them.
export const DEV_ENTRY_CONTENT = `import userExport from "../src/server.js";

if (userExport && typeof userExport.run === "function") {
  await userExport.run();
}
`;

export function emitEntryWrapper(distDir: string): void {
  writeFileSync(path.join(distDir, "__entry.js"), ENTRY_WRAPPER_CONTENT);
}

export function emitDevEntry(projectRoot: string): void {
  const dir = path.join(projectRoot, ".skybridge");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "dev-entry.ts"), DEV_ENTRY_CONTENT);
}

export function emitManifestModule(
  manifestPath: string,
  outPath: string,
): void {
  const manifest = readFileSync(manifestPath, "utf-8");
  writeFileSync(outPath, `export default ${manifest};\n`);
}
