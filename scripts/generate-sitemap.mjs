// Generates a visual site map of the Concertium app.
//
//   node scripts/generate-sitemap.mjs           → writes docs/sitemap.svg (+ .png if available)
//   node scripts/generate-sitemap.mjs --check    → fails (exit 1) if docs/sitemap.svg is out of date
//
// Routes are DISCOVERED from src/app, so the map auto-updates when pages are
// added or removed. Curated descriptions live in META below; any new route
// without an entry still appears (with a default card) and prints a warning.
//
// SVG generation is dependency-free. PNG rendering uses @resvg/resvg-js if it
// is installed (it's a devDependency); if not, the PNG step is skipped.
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP_DIR = join(ROOT, "src", "app");
const CHECK = process.argv.includes("--check");

const COLORS = {
  bg: "#f8fafc",
  ink: "#0f172a",
  sub: "#64748b",
  faint: "#94a3b8",
  cardRing: "#e2e8f0",
  auth: "#64748b",
  dashboard: "#2147d8",
  clients: "#16a34a",
  projects: "#4f46e5",
  reports: "#d97706",
  team: "#9333ea",
};
const FALLBACK_PALETTE = ["#0891b2", "#db2777", "#ca8a04", "#65a30d", "#7c3aed"];

const SANS = "DejaVu Sans, Liberation Sans, Arial, sans-serif";
const MONO = "DejaVu Sans Mono, Liberation Mono, monospace";

// Curated section order + display.
const SECTION_ORDER = ["dashboard", "clients", "projects", "reports", "team"];
const SECTION_META = {
  dashboard: { name: "Dashboard", color: COLORS.dashboard },
  clients: { name: "Clients", color: COLORS.clients },
  projects: { name: "Projects", color: COLORS.projects },
  reports: { name: "Reports", color: COLORS.reports },
  team: { name: "Team", color: COLORS.team, suffix: "admin" },
};

// Curated per-route content. Routes not listed still render with defaults.
const META = {
  "/login": { title: "Sign in", desc: "Email + password", tag: "public" },
  "/register": { title: "Create first account", desc: "Bootstrap only → first user = admin", tag: "public" },
  "/": {
    title: "Dashboard",
    tag: "home",
    desc: [
      "• Interactive client selector",
      "• Project-lifecycle graph (drill-in)",
      "• Status breakdown + stat cards",
      "• Needs-attention · deadlines · recent",
    ],
  },
  "/clients": { title: "Clients", desc: "Directory of all clients", tag: "list" },
  "/clients/new": { title: "New client", desc: "Create a client", tag: "form" },
  "/clients/[id]": { title: "Client detail", desc: "Contact info, projects, per-client report, delete" },
  "/clients/[id]/edit": { title: "Edit client", desc: "Update details", tag: "form" },
  "/projects": { title: "Projects", desc: "List with status & client filters", tag: "list" },
  "/projects/new": { title: "New project", desc: "Create a project", tag: "form" },
  "/projects/[id]": { title: "Project detail", desc: "Status, progress, owner, updates timeline, delete" },
  "/projects/[id]/edit": { title: "Edit project", desc: "Update fields", tag: "form" },
  "/reports": {
    title: "Status reports",
    desc: [
      "Pick a client or all clients",
      "Preview the generated report, then:",
      "• Draft in your mail client (mailto/copy)",
      "• Send automatically via SMTP",
    ],
  },
  "/team": {
    title: "Team",
    tag: "admin",
    desc: ["Admin-only.", "List members; add a teammate", "(member or admin role)."],
  },
};

// ---------------- route discovery ----------------
function discover(dir, base = "") {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  let routes = [];
  if (entries.some((e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name))) {
    routes.push(base === "" ? "/" : base);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const seg = e.name;
    if (seg.startsWith("_") || seg === "actions" || seg === "components") continue;
    const isGroup = seg.startsWith("(") && seg.endsWith(")");
    routes = routes.concat(discover(join(dir, seg), isGroup ? base : `${base}/${seg}`));
  }
  return routes;
}

const sectionKey = (route) =>
  route === "/login" || route === "/register"
    ? "auth"
    : route === "/"
    ? "dashboard"
    : route.split("/")[1];

const depthOf = (route) => (route === "/" ? 0 : route.split("/").filter(Boolean).length - 1);
const parentOf = (route) => {
  const parts = route.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return "/" + parts.slice(0, -1).join("/");
};

function prettify(route) {
  const last = route.split("/").filter(Boolean).pop() || "Home";
  return last.replace(/[[\]]/g, "").replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// ---------------- svg helpers ----------------
const out = [];
const push = (s) => out.push(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function text(x, y, str, { size = 13, color = COLORS.ink, weight = "normal", family = SANS, anchor = "start" } = {}) {
  push(`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(str)}</text>`);
}
function rrect(x, y, w, h, r, { fill = "#fff", stroke = COLORS.cardRing, sw = 1, shadow = false } = {}) {
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${shadow ? ' filter="url(#shadow)"' : ""}/>`);
}
function wrap(str, width, size) {
  const max = Math.max(1, Math.floor(width / (size * 0.53)));
  const words = String(str).split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
function descLines(meta, width) {
  if (!meta.desc) return [];
  return Array.isArray(meta.desc) ? meta.desc : wrap(meta.desc, width - 30, 11);
}
function cardHeight(meta, width) {
  return 46 + descLines(meta, width).length * 14 + 12;
}
function card(node) {
  const { x, y, w, h, accent, title, path, lines, tag } = node;
  rrect(x, y, w, h, 10, { shadow: true });
  push(`<path d="M ${x} ${y + 10} q 0 -10 10 -10 v ${h - 20} q -10 0 -10 -10 Z" fill="${accent}"/>`);
  const tx = x + 18;
  text(tx, y + 24, title, { size: 14.5, weight: "bold" });
  if (path) text(tx, y + 41, path, { size: 11, color: accent, family: MONO });
  if (tag) {
    const tagW = tag.length * 6.4 + 14;
    rrect(x + w - tagW - 10, y + 10, tagW, 18, 9, { fill: accent + "1a", stroke: accent + "55" });
    text(x + w - tagW / 2 - 10, y + 22.5, tag, { size: 10, color: accent, weight: "bold", anchor: "middle" });
  }
  lines.forEach((ln, i) => text(tx, y + 58 + i * 14, ln, { size: 11, color: COLORS.sub }));
}
function elbow(parent, child, color) {
  const railX = parent.x + 11;
  const cy = child.y + 20;
  push(`<path d="M ${railX} ${parent.y + parent.h} V ${cy} H ${child.x}" fill="none" stroke="${color}" stroke-width="1.6"/>`);
  push(`<circle cx="${child.x}" cy="${cy}" r="2.6" fill="${color}"/>`);
}

// ---------------- build model ----------------
const routes = discover(APP_DIR).sort();
const warnings = [];
for (const r of routes) if (!META[r]) warnings.push(r);

const authRoutes = routes.filter((r) => sectionKey(r) === "auth").sort();

// Build the ordered section list (known order first, then any new sections).
const presentKeys = [...new Set(routes.map(sectionKey))].filter((k) => k !== "auth");
const orderedKeys = [
  ...SECTION_ORDER.filter((k) => presentKeys.includes(k)),
  ...presentKeys.filter((k) => !SECTION_ORDER.includes(k)).sort(),
];
let fb = 0;
const sections = orderedKeys.map((key) => ({
  key,
  name: SECTION_META[key]?.name || prettify("/" + key),
  color: SECTION_META[key]?.color || FALLBACK_PALETTE[fb++ % FALLBACK_PALETTE.length],
  suffix: SECTION_META[key]?.suffix,
  routes: routes.filter((r) => sectionKey(r) === key).sort(),
}));

// ---------------- layout ----------------
const W = 1480;
const MARGIN = 40;
const usableW = W - 2 * MARGIN;
const colGap = 26;
const colCount = Math.max(1, sections.length);
const colW = (usableW - (colCount - 1) * colGap) / colCount;
const colX = (i) => MARGIN + i * (colW + colGap);
const INDENT = 18;
const colTop = 326;
const navY = 222;
const navH = 54;

// place nodes per section
let maxBottom = colTop;
sections.forEach((sec, ci) => {
  let cursor = colTop;
  sec.nodes = [];
  sec.routes.forEach((route) => {
    const meta = META[route] || { title: prettify(route), desc: "" };
    const depth = depthOf(route);
    const w = colW - depth * INDENT;
    const lines = descLines(meta, w);
    const h = cardHeight(meta, w);
    sec.nodes.push({
      route,
      x: colX(ci) + depth * INDENT,
      y: cursor,
      w,
      h,
      accent: sec.color,
      title: meta.title || prettify(route),
      path: route,
      lines,
      tag: meta.tag || null,
      parentRoute: parentOf(route),
    });
    cursor += h + 16;
  });
  maxBottom = Math.max(maxBottom, cursor);
});

const flowY = maxBottom + 20;
const flowH = 150;
const H = flowY + flowH + 40;

// ---------------- render ----------------
push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">`);
push(`<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.10"/></filter>`);
push(`<marker id="arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${COLORS.auth}"/></marker></defs>`);
rrect(0, 0, W, H, 0, { fill: COLORS.bg, stroke: COLORS.bg });

// header
push(`<rect x="${MARGIN}" y="34" width="34" height="34" rx="8" fill="${COLORS.dashboard}"/>`);
text(MARGIN + 17, 58, "C", { size: 20, weight: "bold", color: "#fff", anchor: "middle" });
text(MARGIN + 46, 52, "Concertium — Site Map", { size: 27, weight: "bold" });
text(MARGIN + 46, 74, "Team project management · routes, hierarchy & navigation", { size: 14, color: COLORS.sub });

// legend
const legendItems = [["auth", "Auth / public"], ...sections.map((s) => [s.key, s.name + (s.suffix ? " (admin)" : "")])];
const lx0 = W - MARGIN - 470;
legendItems.slice(0, 6).forEach(([k, label], i) => {
  const cx = lx0 + (i % 3) * 160;
  const cyy = 44 + Math.floor(i / 3) * 22;
  const color = k === "auth" ? COLORS.auth : sections.find((s) => s.key === k)?.color || COLORS.sub;
  push(`<circle cx="${cx}" cy="${cyy - 4}" r="6" fill="${color}"/>`);
  text(cx + 12, cyy, label, { size: 12, color: COLORS.ink });
});

// auth row
text(MARGIN, 116, "ENTRY  ·  AUTHENTICATION", { size: 12, weight: "bold", color: COLORS.faint });
const authW = 300;
authRoutes.forEach((route, i) => {
  const meta = META[route] || { title: prettify(route) };
  const x = MARGIN + i * (authW + 22);
  const w = authW;
  const lines = descLines(meta, w);
  card({ x, y: 128, w, h: 62, accent: COLORS.auth, title: meta.title || prettify(route), path: route, lines, tag: meta.tag || null });
});
const noteX = MARGIN + authRoutes.length * (authW + 22) + 48;
if (noteX < W - MARGIN - 120) {
  rrect(noteX, 128, W - MARGIN - noteX, 62, 10, { fill: "#fff7ed", stroke: "#fed7aa" });
  text(noteX + 16, 150, "🔒  Middleware protects every other route", { size: 12.5, weight: "bold", color: "#9a3412" });
  wrap("Unauthenticated visitors are redirected to /login (with a ?next= return path). Sessions use a signed JWT cookie.", W - MARGIN - noteX - 30, 11).forEach((ln, i) =>
    text(noteX + 16, 168 + i * 13, ln, { size: 11, color: "#9a3412" })
  );
}

// navbar
rrect(MARGIN, navY, usableW, navH, 12, { fill: "#eef4ff", stroke: "#bcd2ff" });
text(MARGIN + 18, navY + 22, "APP SHELL", { size: 11, weight: "bold", color: COLORS.dashboard });
text(MARGIN + 18, navY + 38, "Persistent top nav", { size: 11, color: COLORS.sub });
if (authRoutes.length) {
  push(`<path d="M ${MARGIN + authW / 2} 190 V ${navY}" fill="none" stroke="${COLORS.auth}" stroke-width="1.6" marker-end="url(#arrow)"/>`);
}
sections.forEach((sec, i) => {
  const pillW = colW - 20;
  const px = colX(i) + 10;
  rrect(px, navY + 13, pillW, 28, 14, { fill: "#fff", stroke: "#bcd2ff" });
  text(px + pillW / 2, navY + 31, sec.name + (sec.suffix ? "  ·  " + sec.suffix : ""), { size: 12.5, weight: "bold", color: COLORS.dashboard, anchor: "middle" });
  push(`<path d="M ${colX(i) + colW / 2} ${navY + navH} V ${colTop}" fill="none" stroke="${sec.color}" stroke-width="1.4" stroke-dasharray="2 4"/>`);
});

// section nodes + connectors
sections.forEach((sec) => {
  const byRoute = Object.fromEntries(sec.nodes.map((n) => [n.route, n]));
  sec.nodes.forEach((n) => {
    const parent = n.parentRoute && byRoute[n.parentRoute];
    if (parent) elbow(parent, n, sec.color);
  });
  sec.nodes.forEach((n) => card(n));
});

// key flows box
rrect(MARGIN, flowY, usableW, flowH, 12, { fill: "#fff", stroke: COLORS.cardRing, shadow: true });
text(MARGIN + 20, flowY + 28, "KEY NAVIGATION FLOWS & CROSS-LINKS", { size: 12.5, weight: "bold", color: COLORS.ink });
const flows = [
  ["dashboard", "Dashboard → filtered Projects list and a per-client Status report (carries the selected client through)."],
  ["clients", "Client detail → “New project” pre-filled with that client, and a one-click per-client Status report."],
  ["projects", "Project detail ↔ Client detail; posting a status update can also change the project’s status."],
  ["reports", "Updates & statuses feed the Dashboard graph and the Status reports in real time."],
  ["team", "Admin adds teammates from Team; everyone signs in at /login (no public self-registration after the first user)."],
];
flows.forEach(([k, txt], i) => {
  const fy = flowY + 52 + i * 19;
  const color = sections.find((s) => s.key === k)?.color || COLORS.sub;
  push(`<circle cx="${MARGIN + 26}" cy="${fy - 4}" r="5" fill="${color}"/>`);
  text(MARGIN + 40, fy, txt, { size: 12, color: COLORS.ink });
});

// footer (stable — no timestamp, so rebuilds don't churn the diff)
text(MARGIN, H - 14, "Concertium site map · auto-generated from src/app — do not edit by hand", { size: 10.5, color: COLORS.faint });
text(W - MARGIN, H - 14, `${routes.length} routes · Next.js App Router`, { size: 10.5, color: COLORS.faint, anchor: "end" });

push(`</svg>`);
const svg = out.join("\n");

// ---------------- output / check ----------------
const svgPath = join(ROOT, "docs", "sitemap.svg");

if (CHECK) {
  const current = existsSync(svgPath) ? readFileSync(svgPath, "utf8") : "";
  if (current !== svg) {
    console.error("✗ docs/sitemap.svg is out of date. Run: npm run sitemap");
    process.exit(1);
  }
  console.log("✓ Site map is up to date.");
  process.exit(0);
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(svgPath, svg);
console.log(`Wrote docs/sitemap.svg (${routes.length} routes)`);
if (warnings.length) {
  console.warn(`⚠ ${warnings.length} route(s) without a description in META — add them for nicer cards:`);
  warnings.forEach((r) => console.warn(`   ${r}`));
}

// Optional PNG (skipped silently if @resvg/resvg-js isn't installed).
try {
  const { Resvg } = await import("@resvg/resvg-js");
  const r = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    font: { fontDirs: ["/usr/share/fonts"], loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  });
  writeFileSync(join(ROOT, "docs", "sitemap.png"), r.render().asPng());
  console.log("Wrote docs/sitemap.png");
} catch (e) {
  console.log("PNG step skipped (install @resvg/resvg-js to enable):", e.message);
}
