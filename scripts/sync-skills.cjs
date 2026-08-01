// Regenerate the skill content compiled into src/commands/skills.ts from the
// files under skills/seclai-cli/.
//
// `seclai skills install` writes string constants, not the files on disk, so
// editing skills/ alone changes nothing that ships. This script is the bridge,
// and tests/drift.test.ts fails the build when the two diverge.
//
// The file list is discovered rather than hard-coded: an earlier version named
// four files explicitly, so adding a fifth would have shipped nothing.
const fs = require("fs");
const path = require("path");

const SKILL_DIR = "skills/seclai-cli";
const MARKER_START = "const SKILL_FILES";
const MARKER_END = "// --- Tool detection";

/** Every skill file, SKILL.md first, then references/ sorted for stable output. */
function collect() {
  const refDir = path.join(SKILL_DIR, "references");
  const refs = fs
    .readdirSync(refDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `references/${f}`);
  return ["SKILL.md", ...refs];
}

/** Escape for embedding inside a JS template literal. */
function escapeForTemplate(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const names = collect();
const entries = names
  .map((name) => {
    const body = fs.readFileSync(path.join(SKILL_DIR, name), "utf8");
    return `  { name: ${JSON.stringify(name)}, content: \`${escapeForTemplate(body)}\` },`;
  })
  .join("\n");

const replacement =
  "const SKILL_FILES: Array<{ name: string; content: string }> = [\n" +
  entries +
  "\n];\n\n";

const target = path.join("src", "commands", "skills.ts");
let code = fs.readFileSync(target, "utf8");

/**
 * Offset of the one and only occurrence of `marker`.
 *
 * Everything between the two markers is embedded markdown, so a skill file
 * containing either marker's text would give `indexOf` a second candidate and
 * splice the file at the wrong offset — quietly, since the substring calls
 * below accept any indexes. Insisting on exactly one turns that into an error.
 */
function soleIndexOf(text, marker) {
  const first = text.indexOf(marker);
  if (first === -1) return { index: -1, count: 0 };
  let count = 0;
  for (let i = first; i !== -1; i = text.indexOf(marker, i + marker.length)) count++;
  return { index: first, count };
}

const start = soleIndexOf(code, MARKER_START);
const end = soleIndexOf(code, MARKER_END);
if (start.count === 0 || end.count === 0) {
  console.error(
    `Could not find markers in ${target}. "${MARKER_START}": ${start.count}, "${MARKER_END}": ${end.count}`,
  );
  process.exit(1);
}
if (start.count > 1 || end.count > 1) {
  console.error(
    `Ambiguous markers in ${target} — a skill file under ${SKILL_DIR} contains marker text. ` +
      `"${MARKER_START}": ${start.count}, "${MARKER_END}": ${end.count}`,
  );
  process.exit(1);
}
if (end.index <= start.index) {
  console.error(`Markers out of order in ${target}: "${MARKER_END}" precedes "${MARKER_START}".`);
  process.exit(1);
}

code = code.substring(0, start.index) + replacement + code.substring(end.index);
fs.writeFileSync(target, code, "utf8");
console.log(`Regenerated ${names.length} skill files into ${target}:`);
for (const n of names) console.log(`  ${n}`);
