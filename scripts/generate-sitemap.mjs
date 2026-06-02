// Generates a visual site map of the Concertium app as an SVG.
// Pure Node, no dependencies:  node scripts/generate-sitemap.mjs
// Output: docs/sitemap.svg
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const W = 1480;
const H = 920;
const MARGIN = 40;

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

const SANS = "DejaVu Sans, Liberation Sans, Arial, sans-serif";
const MONO = "DejaVu Sans Mono, Liberation Mono, monospace";

const out = [];
const push = (s) => out.push(s);

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function text(x, y, str, { size = 13, color = COLORS.ink, weight = "normal", family = SANS, anchor = "start" } = {}) {
  push(
    `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(str)}</text>`
  );
}

function rrect(x, y, w, h, r, { fill = "#fff", stroke = COLORS.cardRing, sw = 1, shadow = false } = {}) {
  const filter = shadow ? ' filter="url(#shadow)"' : "";
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${filter}/>`);
}

// crude word-wrap by character estimate
function wrap(str, width, size) {
  const max = Math.max(1, Math.floor(width / (size * 0.53)));
  const words = str.split(" ");
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

// ---------- card ----------
function card(node) {
  const { x, y, w, h, accent, title, path, desc, tag } = node;
  rrect(x, y, w, h, 10, { shadow: true });
  // left accent bar
  push(`<path d="M ${x} ${y + 10} q 0 -10 10 -10 v ${h - 20} q -10 0 -10 -10 Z" fill="${accent}"/>`);
  const tx = x + 18;
  text(tx, y + 24, title, { size: 14.5, weight: "bold" });
  if (path) text(tx, y + 41, path, { size: 11, color: accent, family: MONO });
  if (tag) {
    const tagW = tag.length * 6.4 + 14;
    rrect(x + w - tagW - 10, y + 10, tagW, 18, 9, { fill: accent + "1a", stroke: accent + "55" });
    text(x + w - tagW / 2 - 10, y + 22.5, tag, { size: 10, color: accent, weight: "bold", anchor: "middle" });
  }
  if (desc) {
    const lines = Array.isArray(desc) ? desc : wrap(desc, w - 30, 11);
    lines.forEach((ln, i) => text(tx, y + 58 + i * 14, ln, { size: 11, color: COLORS.sub }));
  }
}

// elbow connector from a parent's left rail to a child's left edge
function elbow(parent, child, color) {
  const railX = parent.x + 11;
  const cy = child.y + 20;
  push(`<path d="M ${railX} ${parent.y + parent.h} V ${cy} H ${child.x}" fill="none" stroke="${color}" stroke-width="1.6"/>`);
  push(`<circle cx="${child.x}" cy="${cy}" r="2.6" fill="${color}"/>`);
}

function vconn(x1, y1, x2, y2, color) {
  push(`<path d="M ${x1} ${y1} V ${(y1 + y2) / 2} H ${x2} V ${y2}" fill="none" stroke="${color}" stroke-width="1.6"/>`);
}

// ================= build =================
push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">`);
push(`<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.10"/></filter></defs>`);
rrect(0, 0, W, H, 0, { fill: COLORS.bg, stroke: COLORS.bg });

// Header
push(`<rect x="${MARGIN}" y="34" width="34" height="34" rx="8" fill="${COLORS.dashboard}"/>`);
text(MARGIN + 17, 58, "C", { size: 20, weight: "bold", color: "#fff", anchor: "middle" });
text(MARGIN + 46, 52, "Concertium — Site Map", { size: 27, weight: "bold" });
text(MARGIN + 46, 74, "Team project management · routes, hierarchy & navigation", { size: 14, color: COLORS.sub });

// Legend (top-right)
const legend = [
  ["auth", "Auth / public"],
  ["dashboard", "Dashboard"],
  ["clients", "Clients"],
  ["projects", "Projects"],
  ["reports", "Reports"],
  ["team", "Team (admin)"],
];
let lx = W - MARGIN - 470;
legend.forEach(([k, label], i) => {
  const cx = lx + (i % 3) * 160;
  const cyy = 44 + Math.floor(i / 3) * 22;
  push(`<circle cx="${cx}" cy="${cyy - 4}" r="6" fill="${COLORS[k]}"/>`);
  text(cx + 12, cyy, label, { size: 12, color: COLORS.ink });
});

// ---- Auth row ----
text(MARGIN, 116, "ENTRY  ·  AUTHENTICATION", { size: 12, weight: "bold", color: COLORS.faint });
const authW = 300;
const login = { x: MARGIN, y: 128, w: authW, h: 62, accent: COLORS.auth, title: "Sign in", path: "/login", desc: "Email + password", tag: "public" };
const register = { x: MARGIN + authW + 22, y: 128, w: authW, h: 62, accent: COLORS.auth, title: "Create first account", path: "/register", desc: "Bootstrap only → first user = admin", tag: "public" };
card(login);
card(register);
// auth note
const noteX = MARGIN + 2 * authW + 70;
rrect(noteX, 128, W - MARGIN - noteX, 62, 10, { fill: "#fff7ed", stroke: "#fed7aa" });
text(noteX + 16, 150, "🔒  Middleware protects every other route", { size: 12.5, weight: "bold", color: "#9a3412" });
wrap("Unauthenticated visitors are redirected to /login (with a ?next= return path). Sessions use a signed JWT cookie.", W - MARGIN - noteX - 30, 11).forEach((ln, i) =>
  text(noteX + 16, 168 + i * 13, ln, { size: 11, color: "#9a3412" })
);

// ---- NavBar bar ----
const navY = 222;
const navH = 54;
rrect(MARGIN, navY, W - 2 * MARGIN, navH, 12, { fill: "#eef4ff", stroke: "#bcd2ff" });
text(MARGIN + 18, navY + 22, "APP SHELL", { size: 11, weight: "bold", color: COLORS.dashboard });
text(MARGIN + 18, navY + 38, "Persistent top nav", { size: 11, color: COLORS.sub });

// arrow auth -> navbar
push(`<path d="M ${MARGIN + authW / 2} 190 V ${navY}" fill="none" stroke="${COLORS.auth}" stroke-width="1.6" marker-end="url(#arrow)"/>`);
push(`<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${COLORS.auth}"/></marker></defs>`);

// ---- Columns ----
const usableW = W - 2 * MARGIN;
const colGap = 26;
const colW = (usableW - 4 * colGap) / 5;
const colX = (i) => MARGIN + i * (colW + colGap);
const INDENT = 18;
const colTop = 326;
const sectionColors = [COLORS.dashboard, COLORS.clients, COLORS.projects, COLORS.reports, COLORS.team];
const sectionNames = ["Dashboard", "Clients", "Projects", "Reports", "Team"];

// nav pills aligned over each column
sectionNames.forEach((name, i) => {
  const pillW = colW - 20;
  const px = colX(i) + 10;
  rrect(px, navY + 13, pillW, 28, 14, { fill: "#fff", stroke: "#bcd2ff" });
  text(px + pillW / 2, navY + 31, name + (i === 4 ? "  ·  admin" : ""), { size: 12.5, weight: "bold", color: COLORS.dashboard, anchor: "middle" });
  // connector pill -> column root
  push(`<path d="M ${colX(i) + colW / 2} ${navY + navH} V ${colTop}" fill="none" stroke="${sectionColors[i]}" stroke-width="1.4" stroke-dasharray="2 4"/>`);
});

// column definitions: [depth, title, path, desc, height, parentIndexWithinColumn|null, tag]
const columns = [
  // Dashboard
  [
    [0, "Dashboard", "/", [
      "• Interactive client selector",
      "• Project-lifecycle graph (drill-in)",
      "• Status breakdown + stat cards",
      "• Needs-attention · deadlines · recent",
    ], 150, null, "home"],
  ],
  // Clients
  [
    [0, "Clients", "/clients", "Directory of all clients", 60, null, "list"],
    [1, "New client", "/clients/new", "Create a client", 50, 0, "form"],
    [1, "Client detail", "/clients/[id]", "Contact info, projects, per-client report, delete", 76, 0, ""],
    [2, "Edit client", "/clients/[id]/edit", "Update details", 50, 2, "form"],
  ],
  // Projects
  [
    [0, "Projects", "/projects", "List with status & client filters", 60, null, "list"],
    [1, "New project", "/projects/new", "Create a project", 50, 0, "form"],
    [1, "Project detail", "/projects/[id]", "Status, progress, owner, updates timeline, delete", 76, 0, ""],
    [2, "Edit project", "/projects/[id]/edit", "Update fields", 50, 2, "form"],
  ],
  // Reports
  [
    [0, "Status reports", "/reports", [
      "Pick a client or all clients",
      "Preview the generated report, then:",
      "• Draft in your mail client (mailto/copy)",
      "• Send automatically via SMTP",
    ], 110, null, ""],
  ],
  // Team
  [
    [0, "Team", "/team", [
      "Admin-only.",
      "List members; add a teammate",
      "(member or admin role).",
    ], 92, null, "admin"],
  ],
];

// layout + render each column
columns.forEach((nodes, ci) => {
  const accent = sectionColors[ci];
  let cursor = colTop;
  const placed = [];
  nodes.forEach(([depth, title, path, desc, h, parent, tag]) => {
    const x = colX(ci) + depth * INDENT;
    const w = colW - depth * INDENT;
    const node = { x, y: cursor, w, h, accent, title, path, desc, tag: tag || null, parent };
    placed.push(node);
    cursor += h + 16;
  });
  // connectors first (under cards)
  placed.forEach((n) => {
    if (n.parent !== null && n.parent !== undefined) elbow(placed[n.parent], n, accent);
  });
  placed.forEach((n) => card(n));
});

// ---- Key flows box ----
const flowY = 700;
rrect(MARGIN, flowY, usableW, 150, 12, { fill: "#fff", stroke: COLORS.cardRing, shadow: true });
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
  push(`<circle cx="${MARGIN + 26}" cy="${fy - 4}" r="5" fill="${COLORS[k]}"/>`);
  text(MARGIN + 40, fy, txt, { size: 12, color: COLORS.ink });
});

// footer
text(MARGIN, H - 14, `Concertium site map · generated ${new Date().toISOString().slice(0, 10)}`, { size: 10.5, color: COLORS.faint });
text(W - MARGIN, H - 14, "14 routes · Next.js App Router", { size: 10.5, color: COLORS.faint, anchor: "end" });

push(`</svg>`);

mkdirSync(join(ROOT, "docs"), { recursive: true });
const svg = out.join("\n");
writeFileSync(join(ROOT, "docs", "sitemap.svg"), svg);
console.log("Wrote docs/sitemap.svg (" + svg.length + " bytes)");
