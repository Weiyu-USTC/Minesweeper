// Check local file destinations in this project's HTML and Markdown documents.
// External websites and section anchors are intentionally not fetched/validated.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skipped = new Set(['.git', '.local-artifacts', 'node_modules', '.venv', 'build', 'qa', 'preview']);
const failures = [];
let documents = 0;
let links = 0;

function check(file, value) {
  if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return;
  const raw = value.split(/[?#]/, 1)[0];
  if (!raw) return;
  let target;
  try { target = decodeURIComponent(raw); }
  catch { failures.push(`${path.relative(root, file)}: invalid URL ${value}`); return; }
  links++;
  const absolute = path.resolve(path.dirname(file), target);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !fs.existsSync(absolute)) {
    failures.push(`${path.relative(root, file)}: missing or nonportable target ${value}`);
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.isFile() || !/\.(?:html|md)$/i.test(entry.name)) continue;
    documents++;
    let source = fs.readFileSync(file, 'utf8');
    if (/\.html$/i.test(entry.name)) {
      source = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
      for (const match of source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) check(file, match[1]);
    } else {
      source = source.replace(/```[\s\S]*?```/g, '');
      for (const match of source.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) check(file, match[1] || match[2]);
    }
  }
}

walk(root);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Checked ${links} local file links across ${documents} documents.`);
}
