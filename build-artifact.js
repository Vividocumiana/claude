// Bundles the multi-file site into ONE self-contained HTML file
// (fonts as base64 data URIs, inline CSS + JS) for hosting as an Artifact.
const fs = require("fs");
const path = require("path");
const ROOT = "/home/user/claude";

// weights actually used per family
const KEEP = {
  "Hanken Grotesk": new Set(["400", "500", "600", "700"]),
  "Source Serif 4": new Set(["400"]),
  "Noto Serif": new Set(["500"]),
};
const KEEP_SUBSETS = new Set(["latin", "latin-ext"]);

const cssRaw = fs.readFileSync(path.join(ROOT, "assets/fonts.css"), "utf8");

// split into "<label> */ @font-face { ... }" chunks
const blocks = [];
const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
let m;
while ((m = re.exec(cssRaw))) blocks.push({ label: m[1], body: m[2] });

let embedded = "";
let kept = 0;
for (const b of blocks) {
  if (!KEEP_SUBSETS.has(b.label)) continue;
  const fam = (b.body.match(/font-family:\s*'([^']+)'/) || [])[1];
  const wght = (b.body.match(/font-weight:\s*(\d+)/) || [])[1];
  if (!fam || !KEEP[fam] || !KEEP[fam].has(wght)) continue;
  const url = (b.body.match(/src:\s*url\(([^)]+)\)/) || [])[1];
  if (!url) continue;
  const file = path.join(ROOT, "assets", url);
  if (!fs.existsSync(file)) { console.warn("missing", file); continue; }
  const b64 = fs.readFileSync(file).toString("base64");
  const newBody = b.body.replace(
    /src:\s*url\([^)]+\)\s*format\('woff2'\)/,
    `src: url(data:font/woff2;base64,${b64}) format('woff2')`
  );
  embedded += newBody + "\n";
  kept++;
}
console.error("embedded font faces:", kept);

// styles.css minus the @import (fonts now embedded)
let styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
styles = styles.replace(/@import\s+url\("assets\/fonts\.css"\);\s*/, "");

const script = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");

// grab the <body> inner content from index.html, drop the external <script> tag
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
let body = html.substring(html.indexOf("<body>") + 6, html.indexOf("</body>"));
body = body.replace(/\s*<script src="script\.js"><\/script>\s*/g, "\n");

// Artifact wraps our file in <!doctype><head></head><body>, so emit content only.
const out = `<title>Gruppo Prospecta — We help organizations truly change</title>
<style>
${embedded}
${styles}
</style>
${body}
<script>
${script}
</script>
`;

fs.writeFileSync(path.join(ROOT, "prospecta-proposal.html"), out);
console.error("wrote prospecta-proposal.html:", (out.length / 1024).toFixed(0) + "kb");
