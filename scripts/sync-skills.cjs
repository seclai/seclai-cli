const fs = require("fs");

// Read all static skill files
const skillMd = fs.readFileSync("skills/seclai-cli/SKILL.md", "utf8");
const streaming = fs.readFileSync("skills/seclai-cli/references/streaming.md", "utf8");
const uploads = fs.readFileSync("skills/seclai-cli/references/uploads.md", "utf8");
const evaluations = fs.readFileSync("skills/seclai-cli/references/evaluations.md", "utf8");

// Escape for embedding inside JS template literals
function escapeForTemplate(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const replacement =
  "const SKILL_MD = `" + escapeForTemplate(skillMd) + "`;\n\n" +
  "const STREAMING_REF = `" + escapeForTemplate(streaming) + "`;\n\n" +
  "const UPLOADS_REF = `" + escapeForTemplate(uploads) + "`;\n\n" +
  "const EVALUATIONS_REF = `" + escapeForTemplate(evaluations) + "`;\n\n";

// Read the source file
let code = fs.readFileSync("src/commands/skills.ts", "utf8");

// Find and replace from SKILL_MD to the tool detection section
const start = code.indexOf("const SKILL_MD");
const end = code.indexOf("// --- Tool detection");

if (start === -1 || end === -1) {
  console.error("Could not find markers. start:", start, "end:", end);
  process.exit(1);
}

code = code.substring(0, start) + replacement + code.substring(end);
fs.writeFileSync("src/commands/skills.ts", code, "utf8");
console.log("Regenerated ALL template constants from static files");
