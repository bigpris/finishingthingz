import fs from "node:fs";
import path from "node:path";

/**
 * Usage:
 * node scripts/add-entry.mjs \
 *   --date=2025-03-14 \
 *   --slug=manifesto-rules \
 *   --thing=finishingthingz manifesto & rules \
 *   --type=system \
 *   --proofUrl=/ \
 *   --proofText=this page \
 *   --reflection=built the container first.
 */

// ---------- helpers ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  })
);

const required = [
  "date",
  "slug",
  "thing",
  "type",
  "proofUrl",
  "proofText",
  "reflection"
];

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- validation ----------
for (const key of required) {
  if (!args[key]) fail(`Missing --${key}`);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
  fail("date must be in YYYY-MM-DD format");
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) {
  fail("slug must be lowercase and hyphenated (e.g. manifesto-rules)");
}

// ---------- paths ----------
const root = process.cwd();
const logDir = path.join(root, "log");
const entryDir = path.join(logDir, args.slug);
const entryFile = path.join(entryDir, "index.html");
const entriesFile = path.join(logDir, "entries.json");

// ---------- load existing entries ----------
let entries = [];
if (fs.existsSync(entriesFile)) {
  entries = JSON.parse(fs.readFileSync(entriesFile, "utf8"));
}

// prevent duplicates
if (entries.some(e => e.slug === args.slug)) {
  fail(`Entry with slug "${args.slug}" already exists`);
}

// ---------- create log page ----------
fs.mkdirSync(entryDir, { recursive: true });

const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(args.thing)} — finishingthingz</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Libre+Baskerville&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css" />
</head>
<body>

<main>
  <header>
    <h1><a href="/" style="text-decoration:none">finishingthingz</a></h1>
    <p class="subtitle">log entry</p>
  </header>

  <hr>

  <article class="entry">
    <p class="date">${escapeHtml(args.date)}</p>
    <p><strong>thing:</strong> ${escapeHtml(args.thing)}</p>
    <p><strong>type:</strong> ${escapeHtml(args.type)}</p>
    <p><strong>proof:</strong> <a href="${escapeHtml(args.proofUrl)}">${escapeHtml(args.proofText)}</a></p>
    <p class="reflection"><strong>reflection:</strong> ${escapeHtml(args.reflection)}</p>
  </article>

  <hr>

  <p class="subtitle"><a href="/#log">← back to log</a></p>
</main>

</body>
</html>
`;

fs.writeFileSync(entryFile, pageHtml, "utf8");

// ---------- update entries.json ----------
const newEntry = {
  date: args.date,
  slug: args.slug,
  thing: args.thing,
  type: args.type,
  proofText: args.proofText,
  proofUrl: args.proofUrl,
  reflection: args.reflection
};

// newest first by date (YYYY-MM-DD); fallback to slug for stable ordering.
entries.unshift(newEntry);
entries.sort((a, b) => {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;
  return a.slug.localeCompare(b.slug);
});

fs.writeFileSync(
  entriesFile,
  JSON.stringify(entries, null, 2) + "\n",
  "utf8"
);

// ---------- done ----------
console.log(`✅ Added /log/${args.slug}/`);
