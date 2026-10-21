/**
 * 生成站点索引（Node 原生 fs/path，无依赖）。
 *
 * - reports/ 下的 HTML 与含 index.html 的子目录 → 根目录 index.html（报告）
 * - digests/YYYY-MM-DD.html → digests/index.html（日报列表，新的在前）
 *
 * 新增一天日报：只提交 digests/YYYY-MM-DD.html，不要手改索引。
 * <title> 会显示在列表上；没有标题时列表仍显示日期。
 * 同一天若同时存在 YYYY-MM-DD.html 与 YYYYMMDD.html，保留带连字符的文件。
 */
const fs = require("fs");
const path = require("path");

const reportsDir = path.join(__dirname, "reports");
const digestsDir = path.join(__dirname, "digests");

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}
if (!fs.existsSync(digestsDir)) {
  fs.mkdirSync(digestsDir);
}

const titleAliases = {
  case: "2026-3投资战略备忘录",
};

const excludedDirs = new Set(["assets", "shared", "lib"]);

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function readTitleFromHtml(filePath) {
  try {
    const html = fs.readFileSync(filePath, "utf8");
    const match = html.match(/<title>([^<]*)<\/title>/i);
    if (!match) return null;
    const title = decodeBasicEntities(match[1]).replace(/\s+/g, " ").trim();
    return title || null;
  } catch {
    return null;
  }
}

function decodeBasicEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ── 日期提取 ──────────────────────────────────────────────
// 优先级：文件名 YYYYMMDD > 标题 "YYYY-M / YYYY年M"
//       > 已发布索引中的日期（Git 不保留 birthtime，CI 检出不能覆盖旧日期）
//       > birthtime > mtime
const DATE8_RE = /(20\d{2})(\d{2})(\d{2})/;
const DATEYM_RE = /(20\d{2})\s*[-年.]\s*(\d{1,2})/;
const DIGEST_DASHED_RE = /^(20\d{2})-(\d{2})-(\d{2})\.html$/i;
const DIGEST_COMPACT_RE = /^(20\d{2})(\d{2})(\d{2})\.html$/i;

function dateFromName(name) {
  const m8 = name.match(DATE8_RE);
  if (m8) {
    return { date: new Date(+m8[1], +m8[2] - 1, +m8[3], 12), hasDay: true };
  }
  const my = name.match(DATEYM_RE);
  if (my) {
    return { date: new Date(+my[1], +my[2] - 1, 1, 12), hasDay: false };
  }
  return null;
}

function dateFromStat(stat) {
  const b = stat.birthtimeMs;
  const t = b > 0 && b <= Date.now() ? stat.birthtime : stat.mtime;
  return { date: t, hasDay: true };
}

function dateFromIso(iso) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) return null;
  const y = +m[1];
  const month = +m[2];
  const day = m[3] ? +m[3] : 1;
  const date = calendarDate(y, month, day);
  if (!date) return null;
  return { date, hasDay: Boolean(m[3]) };
}

// 读构建前的报告索引，保住没有写进文件名的归档日期，以及同一天里的原有顺序。
function readPublishedReports(indexPath) {
  const dates = new Map();
  const order = new Map();
  if (!fs.existsSync(indexPath)) return { dates, order };
  let html = "";
  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch {
    return { dates, order };
  }
  const re =
    /<a class="card" href="(\.\/reports\/[^"]+)"[^>]*>[\s\S]*?<time class="card-date" datetime="([^"]+)">/g;
  let m;
  let i = 0;
  while ((m = re.exec(html))) {
    if (dateFromIso(m[2])) {
      dates.set(m[1], m[2]);
      order.set(m[1], i);
    }
    i += 1;
  }
  return { dates, order };
}

function formatDate(d, hasDay) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  return hasDay ? `${y}-${m}-${pad2(d.getDate())}` : `${y}-${m}`;
}

function calendarDate(y, m, d) {
  const date = new Date(y, m - 1, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${y} 年 ${m} 月`;
}

function groupByMonth(entries) {
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.date.getFullYear()}-${pad2(e.date.getMonth() + 1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const groupKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  return { groups, groupKeys };
}

function rangeLabelOf(groupKeys) {
  if (groupKeys.length >= 2) {
    return `${groupKeys[groupKeys.length - 1]} → ${groupKeys[0]}`;
  }
  if (groupKeys.length === 1) return groupKeys[0];
  return "—";
}

// ── 扫描 reports/ ─────────────────────────────────────────
function scanReports() {
  const published = readPublishedReports(path.join(__dirname, "index.html"));
  const entries = [];
  const items = fs.readdirSync(reportsDir);

  for (const name of items) {
    if (name.startsWith(".") || name.startsWith("_")) continue;

    const itemPath = path.join(reportsDir, name);
    const stat = fs.statSync(itemPath);

    if (stat.isFile() && name.endsWith(".html")) {
      const baseName = name.replace(/\.html$/i, "");
      const href = `./reports/${encodeURIComponent(name)}`;
      const d = dateFromName(baseName) || dateFromIso(published.dates.get(href) || "") || dateFromStat(stat);
      entries.push({
        type: "file",
        href,
        title: baseName,
        date: d.date,
        hasDay: d.hasDay,
      });
    } else if (stat.isDirectory() && !excludedDirs.has(name)) {
      if (!fs.existsSync(path.join(itemPath, "index.html"))) continue;

      const title = titleAliases[name] || readTitleFromHtml(path.join(itemPath, "index.html")) || name;
      const href = `./reports/${encodeURIComponent(name)}/`;
      const d = dateFromName(title) || dateFromIso(published.dates.get(href) || "") || dateFromStat(stat);

      entries.push({
        type: "dir",
        href,
        title,
        date: d.date,
        hasDay: d.hasDay,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) {
      return b.date.getTime() - a.date.getTime();
    }
    const ai = published.order.has(a.href) ? published.order.get(a.href) : Number.MAX_SAFE_INTEGER;
    const bi = published.order.has(b.href) ? published.order.get(b.href) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title, "zh-CN");
  });
  return entries;
}

// ── 扫描 digests/ ─────────────────────────────────────────
function scanDigests() {
  const found = [];
  const items = fs.readdirSync(digestsDir);

  for (const name of items) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    if (name.toLowerCase() === "index.html") continue;

    const itemPath = path.join(digestsDir, name);
    let stat;
    try {
      stat = fs.statSync(itemPath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    const dashed = name.match(DIGEST_DASHED_RE);
    const compact = name.match(DIGEST_COMPACT_RE);
    const parts = dashed || compact;
    if (!parts) {
      if (name.toLowerCase().endsWith(".html")) {
        console.warn(`[digest] 忽略不符合命名的文件 ${name}（应为 YYYY-MM-DD.html）`);
      }
      continue;
    }

    const date = calendarDate(+parts[1], +parts[2], +parts[3]);
    if (!date) {
      console.warn(`[digest] 忽略无效日期文件 ${name}`);
      continue;
    }

    found.push({
      file: name,
      dashed: Boolean(dashed),
      href: `./${encodeURIComponent(name)}`,
      title: readTitleFromHtml(itemPath) || "今日中文推特圈精选",
      date,
      hasDay: true,
    });
  }

  const byDay = new Map();
  for (const item of found) {
    const key = formatDate(item.date, true);
    const prev = byDay.get(key);
    if (!prev) {
      byDay.set(key, item);
      continue;
    }
    const keep = preferDigest(prev, item);
    const drop = keep === prev ? item : prev;
    console.warn(`[digest] 同一天有多份文件，保留 ${keep.file}，忽略 ${drop.file}`);
    byDay.set(key, keep);
  }

  const entries = [...byDay.values()];
  entries.sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) {
      return b.date.getTime() - a.date.getTime();
    }
    return a.title.localeCompare(b.title, "zh-CN");
  });
  return entries;
}

function preferDigest(a, b) {
  if (a.dashed !== b.dashed) return a.dashed ? a : b;
  return a.file < b.file ? a : b;
}

// ── 渲染数据 ──────────────────────────────────────────────
const ICON_FOLDER =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
const ICON_DOC =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>';
const ICON_CAL =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>';
const ICON_ARROW =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

function renderGroups(groupKeys, groups, renderCard) {
  return groupKeys
    .map((key) => {
      const list = groups.get(key);
      const cardsHtml = list.map(renderCard).join("\n");
      return `  <section class="group" id="g-${key}">
    <h2 class="reveal">${monthLabel(key)}<em>${list.length} 份</em></h2>
    <ul data-stagger>
${cardsHtml}
    </ul>
  </section>`;
    })
    .join("\n\n");
}

function renderReportCard(e) {
  const icon = e.type === "dir" ? ICON_FOLDER : ICON_DOC;
  return `      <li class="reveal">
        <a class="card" href="${e.href}" target="_blank" rel="noopener">
          <span class="card-icon">${icon}</span>
          <span class="card-title">${escapeHtml(e.title)}</span>
          <time class="card-date" datetime="${formatDate(e.date, e.hasDay)}">${formatDate(e.date, e.hasDay)}</time>
          <span class="card-arrow">${ICON_ARROW}</span>
        </a>
      </li>`;
}

function renderDigestCard(e) {
  const iso = formatDate(e.date, true);
  const weekday = WEEKDAYS[e.date.getDay()];
  return `      <li class="reveal">
        <a class="card" href="${e.href}">
          <span class="card-icon">${ICON_CAL}</span>
          <span class="card-main">
            <span class="card-title">${escapeHtml(e.title)}</span>
            <span class="card-kicker">${weekday}</span>
          </span>
          <time class="card-date" datetime="${iso}">${iso}</time>
          <span class="card-arrow">${ICON_ARROW}</span>
        </a>
      </li>`;
}

function endBlock(groupKeys) {
  if (!groupKeys.length) return "";
  const earliestLabel = monthLabel(groupKeys[groupKeys.length - 1]);
  return `    <p class="end">—— 归档完毕 · 最早一份：${earliestLabel} ——</p>`;
}

const PAGE_SCRIPT = `<script>
(function () {
  "use strict";
  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 滚动 reveal + 交错入场 */
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      if (el.hasAttribute("data-stagger")) {
        Array.prototype.forEach.call(el.children, function (child, i) {
          child.style.transitionDelay = Math.min(i * 60, 480) + "ms";
        });
      }
      el.classList.add("in-view");
      obs.unobserve(el);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal, [data-stagger]").forEach(function (el) {
    obs.observe(el);
  });

  /* 归档数 count-up（900ms easeOutCubic） */
  if (!reduce) {
    var counter = document.querySelector("[data-count]");
    if (counter) {
      var target = parseInt(counter.getAttribute("data-count"), 10) || 0;
      var start = null;
      function tick(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / 900, 1);
        counter.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  /* 卡片聚光灯：全局委托 + rAF 节流，仅悬停设备 */
  if (!reduce && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    var ticking = false;
    document.addEventListener("pointermove", function (ev) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var card = ev.target.closest ? ev.target.closest(".card") : null;
        if (card) {
          var r = card.getBoundingClientRect();
          card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
          card.style.setProperty("--my", (ev.clientY - r.top) + "px");
        }
        ticking = false;
      });
    }, { passive: true });
  }
})();
</script>`;

function renderPage({
  docTitle,
  active,
  eyebrow,
  headingHtml,
  subtitleHtml,
  statsInnerHtml,
  mainInnerHtml,
  endHtml,
  metaHtml,
}) {
  const reportsHref = active === "reports" ? "./" : "../";
  const digestsHref = active === "digests" ? "./" : "./digests/";
  const tab = (id, href, label) => {
    const current = id === active ? ' aria-current="page"' : "";
    return `<a class="nav-tab" href="${href}"${current}>${label}</a>`;
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap');

  :root {
    --bg: #f5f2ea;
    --bg-rgb: 245,242,234;
    --surface: #fdfbf5;
    --surface-alt: #efece1;
    --surface-hover: #ffffff;
    --border: #e3ded0;
    --border-hover: #b9b2a0;
    --text: #232019;
    --text-rgb: 35,32,25;
    --text-secondary: #6f6a5c;
    --text-tertiary: #a39d8d;
    --accent: #3d5bd5;
    --accent-rgb: 61,91,213;
    --accent-hover: #3048b8;
    --success: #2e8b57;
    --success-rgb: 46,139,87;
    --warning: #c98a1b;
    --warning-rgb: 201,138,27;
    --error: #b3392f;
    --error-rgb: 179,57,47;
    --radius: 10px;
    --nav-h: 56px;
    --font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
  }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: var(--nav-h); }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.75;
    letter-spacing: 0.02em;
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: rgba(var(--accent-rgb), 0.18); }
  ::-moz-selection { background: rgba(var(--accent-rgb), 0.18); }

  .container { max-width: 720px; margin: 0 auto; padding: 0 24px; }

  /* ── 分区导航（报告 / 日报）── */
  .site-nav {
    position: sticky;
    top: 0;
    z-index: 5;
    height: var(--nav-h);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .nav-inner {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .nav-brand {
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text);
    text-decoration: none;
    white-space: nowrap;
  }
  .nav-brand:hover { color: var(--accent); }
  .nav-tabs { display: flex; align-items: center; gap: 4px; }
  .nav-tab {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 0.9375rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    text-decoration: none;
    white-space: nowrap;
  }
  .nav-tab:hover { color: var(--text); background: var(--surface-alt); }
  .nav-tab[aria-current="page"] {
    color: var(--accent);
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--border);
  }
  .nav-tab[aria-current="page"]:hover { color: var(--accent-hover); }
  .nav-brand:focus-visible,
  .nav-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ── Hero ── */
  .hero { position: relative; padding-top: 48px; padding-bottom: 56px; }
  .hero::before {
    content: "";
    position: absolute;
    top: -120px; right: -80px;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(var(--accent-rgb), 0.10), transparent 70%);
    pointer-events: none;
    animation: breath 9s ease-in-out infinite alternate;
  }
  @keyframes breath {
    from { opacity: 0.6; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1.05); }
  }
  .eyebrow {
    margin: 0 0 20px;
    font-size: 0.75rem; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    margin: 0 0 20px;
    font-size: clamp(2.75rem, 8vw, 4.25rem);
    font-weight: 700; line-height: 1.12; letter-spacing: 0.02em;
    clip-path: inset(0 0 100% 0);
    animation: revealMask 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
  }
  @keyframes revealMask { to { clip-path: inset(0 0 0 0); } }
  .h1-dot { color: var(--accent); }
  .subtitle {
    margin: 0 0 32px;
    max-width: 34em;
    font-size: 1.0625rem;
    color: var(--text-secondary);
  }
  .stats {
    display: flex; flex-wrap: wrap; gap: 8px 48px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .stat b {
    display: block;
    font-size: 1.375rem; font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }
  .stat span {
    font-size: 0.8125rem; letter-spacing: 0.06em;
    color: var(--text-tertiary);
  }

  /* ── Reveal（L2 滚动入场）── */
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal.in-view { opacity: 1; transform: none; }

  /* ── 时间线 ── */
  .timeline { position: relative; padding-top: 8px; padding-bottom: 24px; padding-left: 36px; }
  .timeline::before {
    content: "";
    position: absolute; left: 7px; top: 16px; bottom: 16px;
    width: 1px;
    background: var(--border);
  }
  .group { position: relative; margin-bottom: 56px; }
  .group::before {
    content: "";
    position: absolute; left: -36px; top: 10px;
    width: 15px; height: 15px;
    border-radius: 50%;
    background: var(--bg);
    border: 2px solid var(--accent);
  }
  .group h2 {
    position: sticky; top: var(--nav-h); z-index: 2;
    margin: -14px 0 16px;
    padding: 14px 0 10px;
    font-size: 1.375rem; font-weight: 600;
    line-height: 1.4; letter-spacing: 0.04em;
    background: var(--bg);
    position: -webkit-sticky;
  }
  .group h2 em {
    font-style: normal; font-weight: 500;
    font-size: 0.8125rem; letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
    color: var(--text-tertiary);
    margin-left: 10px;
  }
  .group h2::after {
    content: "";
    position: absolute; left: 0; bottom: 6px;
    width: 0; height: 2px;
    background: var(--accent);
    transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
  }
  .group h2.in-view::after { width: 100%; }

  .group ul {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 10px;
  }

  /* ── 卡片（全部状态）── */
  .card {
    position: relative;
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px;
    min-height: 56px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--text);
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease,
                border-color 0.25s ease, background-color 0.25s ease;
  }
  .card::before {
    content: "";
    position: absolute; inset: 0;
    opacity: 0;
    background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%),
                rgba(var(--accent-rgb), 0.08), transparent 65%);
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .card:hover {
    transform: translateY(-2px);
    background: var(--surface-hover);
    border-color: var(--border-hover);
    box-shadow: 0 4px 14px rgba(var(--text-rgb), 0.07);
  }
  .card:hover::before { opacity: 1; }
  .card:active { transform: translateY(0) scale(0.995); }
  .card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .card-icon {
    flex: none;
    width: 36px; height: 36px;
    display: grid; place-items: center;
    border-radius: 8px;
    background: var(--surface-alt);
    color: var(--accent);
  }
  .card-main { flex: 1; min-width: 0; }
  .card-title {
    flex: 1; min-width: 0;
    font-size: 1.0625rem; font-weight: 500; line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-kicker {
    display: block;
    margin-top: 2px;
    font-size: 0.8125rem;
    line-height: 1.5;
    letter-spacing: 0.04em;
    color: var(--text-tertiary);
  }
  .card-date {
    flex: none;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    color: var(--text-tertiary);
    transition: color 0.25s ease;
  }
  .card:hover .card-date { color: var(--accent); }
  .card-arrow {
    flex: none;
    color: var(--text-tertiary);
    transition: transform 0.25s ease, color 0.25s ease;
  }
  .card:hover .card-arrow { transform: translateX(3px); color: var(--accent); }

  /* ── 空态 / 页脚 ── */
  .empty {
    padding: 24px 0 48px;
    color: var(--text-secondary);
  }
  footer { padding: 8px 0 56px; }
  .end {
    margin: 24px 0 16px;
    text-align: center;
    font-size: 0.8125rem; letter-spacing: 0.08em;
    color: var(--text-tertiary);
  }
  .meta {
    margin: 0;
    text-align: center;
    font-size: 0.75rem; letter-spacing: 0.06em;
    color: var(--text-tertiary);
  }

  /* ── 响应式 ── */
  @media (max-width: 599px) {
    .container { padding: 0 20px; }
    .hero { padding-top: 36px; padding-bottom: 48px; }
    .hero::before { display: none; }
    .timeline { padding-left: 30px; }
    .group::before { left: -30px; }
    .card { padding: 12px 14px; gap: 10px; }
    .card-icon { width: 32px; height: 32px; }
    .card-date { font-size: 0.75rem; }
    .nav-tab { padding: 0 12px; }
  }

  /* ── 动效降级 ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }
  }
</style>
</head>
<body>
  <nav class="site-nav" aria-label="站点分区">
    <div class="container nav-inner">
      <a class="nav-brand" href="${reportsHref}">报告馆</a>
      <div class="nav-tabs">
        ${tab("reports", reportsHref, "报告")}
        ${tab("digests", digestsHref, "日报")}
      </div>
    </div>
  </nav>

  <header class="hero container" data-stagger>
    <p class="eyebrow reveal">${eyebrow}</p>
    <h1>${headingHtml}</h1>
    ${subtitleHtml}
    <div class="stats">
      ${statsInnerHtml}
    </div>
  </header>

  <main class="timeline container">
${mainInnerHtml}
  </main>

  <footer class="container">
${endHtml}
    <p class="meta">${metaHtml}</p>
  </footer>

${PAGE_SCRIPT}
</body>
</html>
`;
}

function writeIndexes(reportEntries, digestEntries) {
  const now = new Date();
  const buildDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const reportGroups = groupByMonth(reportEntries);
  const reportMain =
    reportEntries.length === 0
      ? '<p class="empty">暂无报告，请在 reports 目录下添加 HTML 文件。</p>'
      : renderGroups(reportGroups.groupKeys, reportGroups.groups, renderReportCard);

  const reportsHtml = renderPage({
    docTitle: "报告馆 · 个人研究归档",
    active: "reports",
    eyebrow: "Personal Research Archive",
    headingHtml: '报告馆<span class="h1-dot">.</span>',
    subtitleHtml: "",
    statsInnerHtml: `<div class="stat reveal"><b data-count="${reportEntries.length}">${reportEntries.length}</b><span>已归档报告</span></div>
      <div class="stat reveal"><b>${rangeLabelOf(reportGroups.groupKeys)}</b><span>时间范围</span></div>
      <div class="stat reveal"><b>${buildDate}</b><span>最近更新</span></div>`,
    mainInnerHtml: reportMain,
    endHtml: endBlock(reportGroups.groupKeys),
    metaHtml: `由 generate-index.js 自动生成 · 更新于 ${buildDate}`,
  });

  const digestGroups = groupByMonth(digestEntries);
  const latestIso = digestEntries.length ? formatDate(digestEntries[0].date, true) : "—";
  const digestMain =
    digestEntries.length === 0
      ? '<p class="empty">暂无日报。将自包含 HTML 命名为 YYYY-MM-DD.html 放在 digests 目录后重新构建。</p>'
      : renderGroups(digestGroups.groupKeys, digestGroups.groups, renderDigestCard);

  const digestsHtml = renderPage({
    docTitle: "日报 · 报告馆",
    active: "digests",
    eyebrow: "Daily Digest",
    headingHtml: '日报<span class="h1-dot">.</span>',
    subtitleHtml:
      '<p class="subtitle reveal">今日中文推特圈精选，附 AI 资讯。每天 08:00（Asia/Shanghai）归档一份。</p>',
    statsInnerHtml: `<div class="stat reveal"><b data-count="${digestEntries.length}">${digestEntries.length}</b><span>已归档日报</span></div>
      <div class="stat reveal"><b>${rangeLabelOf(digestGroups.groupKeys)}</b><span>时间范围</span></div>
      <div class="stat reveal"><b>${latestIso}</b><span>最近一期</span></div>`,
    mainInnerHtml: digestMain,
    endHtml: endBlock(digestGroups.groupKeys),
    metaHtml: `由 generate-index.js 自动生成 · 更新于 ${buildDate} · 新文件命名为 digests/YYYY-MM-DD.html`,
  });

  fs.writeFileSync(path.join(__dirname, "index.html"), reportsHtml);
  fs.writeFileSync(path.join(digestsDir, "index.html"), digestsHtml);
}

const reportEntries = scanReports();
const digestEntries = scanDigests();
writeIndexes(reportEntries, digestEntries);
console.log(
  `[Success] 索引已生成，共挂载 ${reportEntries.length} 份报告、${digestEntries.length} 份日报。`
);
