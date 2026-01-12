import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (mode !== "apply" && mode !== "restore") {
  console.error("Usage: node scripts/set-version.mjs <apply|restore>");
  process.exit(2);
}

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJsonPath = path.join(repoRoot, "package.json");
const backupPath = path.join(repoRoot, ".package.json.bak");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n");
}

if (mode === "apply") {
  const version = process.env.VERSION;
  if (!version) {
    console.error("Missing VERSION env var.");
    process.exit(2);
  }

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(packageJsonPath, backupPath);
  }

  const pkg = readJson(packageJsonPath);
  pkg.version = version;
  writeJson(packageJsonPath, pkg);
}

if (mode === "restore") {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, packageJsonPath);
    fs.rmSync(backupPath);
  }
}
