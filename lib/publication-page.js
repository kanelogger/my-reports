const fs = require("node:fs");
const path = require("node:path");
const { configuration, escape } = require("./publication-format");

function icon(name) {
  const shapes = {
    right: '<path d="M4 12h16M14 6l6 6-6 6"></path>',
    left: '<path d="M20 12H4M10 6l-6 6 6 6"></path>',
    up: '<path d="M12 20V4M6 10l6-6 6 6"></path>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"></path>',
    focus: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"></path>',
    close: '<path d="m6 6 12 12M18 6 6 18"></path>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path>',
    external: '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
}

function navigation(kind) {
  const link = (target, href, label) => `<a href="${href}"${target === kind ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-head"><div class="head-inner"><a class="brand" href="../"><span class="brand-mark" aria-hidden="true">刊</span><span class="brand-name">报告馆</span></a><nav class="primary-nav" aria-label="站点分区">${link("reports", "../", "报告")}${link("daily", "../digests/", "日报")}${link("weekly", "../weeklies/", "周报")}</nav><span class="site-caption">个人阅读档案</span></div></header>`;
}

function documentPage({ kind, title, view, body }) {
  const css = fs.readFileSync(path.join(__dirname, "publication.css"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "publication-reader.js"), "utf8");
  const font = fs.readFileSync(path.join(__dirname, "assets/editorial-title.woff2")).toString("base64");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<style>@font-face{font-family:"Publication Title";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:600;font-display:swap;}
${css}</style></head><body id="top" data-publication="editorial-a-v4" data-kind="${kind}" data-view="${view}">
<a class="skip-link" href="#content">跳到正文</a>${navigation(kind)}${body}
<script data-publication-ui>${script}</script></body></html>`;
}

function contents(sections) {
  return sections.map((section) => `<a href="#${section.id}" data-tone="${section.color}"><span class="toc-number">${section.number}</span><span>${escape(section.title)}</span></a>`).join("");
}

function readingPage({ kind, title, info, sections, intro }) {
  const label = configuration(kind).label;
  const links = contents(sections);
  const body = `<div class="reading-progress" aria-hidden="true"><span></span></div>
<main class="page"><header class="issue-head"><div class="title-line"><div class="title-copy"><h1>${escape(title)}</h1><p class="period"><span>${label}</span><time datetime="${info.id}">${escape(info.range)}</time><span>北京时间</span></p></div><div class="issue-stamp" aria-hidden="true"><span class="stamp-main">${info.folio}</span><span class="stamp-caption">${escape(info.caption)}</span></div></div><nav class="issue-map" aria-label="浏览本期栏目">${links}</nav></header>
<div class="reading-grid"><aside class="desktop-toc"><p class="toc-label">本期目录</p><nav class="toc-list" aria-label="栏目目录">${links}</nav><div class="toc-bottom"><a class="text-button" href="./">${icon("left")}全部${label}</a><div class="type-controls enhanced" role="group" aria-label="正文字号"><button type="button" data-font="normal" aria-label="标准字号" aria-pressed="true">A</button><button type="button" data-font="large" aria-label="大字号" aria-pressed="false">A+</button></div><button type="button" class="text-button focus-inline enhanced" data-focus aria-pressed="false">${icon("focus")}<span>专注阅读</span></button></div></aside>
<div class="reader-body"><details class="mobile-toc"><summary>本期目录 · ${sections.length} 个栏目</summary><nav class="toc-list" aria-label="栏目目录">${links}</nav></details>
<article class="prose" id="content" tabindex="-1">${intro}${sections.map((section) => `<section class="reading-section" id="${section.id}" data-tone="${section.color}"><header class="section-head"><span class="section-no">${section.number}</span><h2>${section.titleHtml}</h2></header>${section.body}</section>`).join("\n")}</article>
<footer class="issue-footer"><a href="./">${icon("left")}返回${label}归档</a><a href="#top">回到顶部${icon("up")}</a></footer></div></div></main>
<div class="quick-toc" id="quick-toc" hidden><div class="quick-toc-head"><strong>本期目录</strong><button type="button" data-close-toc aria-label="关闭目录">${icon("close")}</button></div><nav class="toc-list" aria-label="快捷目录">${links}</nav></div>
<aside class="reader-dock" aria-label="阅读工具"><button type="button" data-toggle-toc aria-expanded="false" aria-controls="quick-toc">${icon("list")}<span class="current-section-label">目录</span></button><button type="button" data-focus aria-pressed="false">${icon("focus")}<span>专注阅读</span></button><button type="button" data-next-section aria-label="下一栏目">${icon("right")}</button></aside>`;
  return documentPage({ kind, title, view: "read", body });
}

function entryPeriod(entry, kind) {
  if (kind === "daily") return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][new Date(`${entry.iso}T12:00:00Z`).getUTCDay()];
  const start = new Date(`${entry.iso}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  return `${start.toISOString().slice(0, 10)} — ${entry.iso}`;
}

function archivePage({ kind, entries }) {
  const label = configuration(kind).label;
  const months = new Map();
  for (const entry of entries) {
    const key = entry.iso.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(entry);
  }
  const monthLabel = (key) => `${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月`;
  const latest = entries[0];
  const archiveStamp = latest ? `<div class="issue-stamp" aria-hidden="true"><span class="stamp-main archive-stamp">${latest.iso.slice(0, 4)}</span></div>` : "";
  const archiveMonths = entries.length ? `<aside class="archive-side"><p class="toc-label">归档月份</p><nav aria-label="归档月份">${[...months.keys()].map((key) => `<a href="#archive-${key}">${monthLabel(key)}</a>`).join("")}</nav></aside>` : "";
  const feature = latest ? `<a class="latest" href="${escape(latest.href)}"><div><h2>${escape(latest.title)}</h2><p class="latest-meta"><span>最新一期</span><time datetime="${latest.iso}">${latest.iso}</time><span>${escape(entryPeriod(latest, kind))}</span></p></div>${icon("right")}</a>` : "";
  const groups = [...months].map(([key, rows]) => `<section class="archive-group" id="archive-${key}"><h2>${monthLabel(key)}<span>${rows.length} 期</span></h2><ul>${rows.map((entry) => `<li class="archive-row"><a href="${escape(entry.href)}"><time datetime="${entry.iso}">${entry.iso.slice(5)}</time><div><h3>${escape(entry.title)}</h3><span class="card-kicker">${escape(entryPeriod(entry, kind))}</span></div>${icon("right")}</a></li>`).join("")}</ul></section>`).join("\n");
  const search = entries.length ? `<div class="archive-controls enhanced"><label class="search">${icon("search")}<input type="search" data-search placeholder="搜索日期或标题" aria-label="搜索${label}日期或标题"></label><p class="search-status" aria-live="polite"></p></div><div class="empty search-empty" hidden><h2>没有匹配的${label}</h2><p>试试日期或标题，或清空关键词。</p></div>` : `<div class="empty"><h2>第一期${label}，正在准备中。</h2><p>定稿后会出现在这里，按时间归档。</p></div>`;
  const body = `<main class="page" id="content" tabindex="-1"><header class="issue-head archive-head"><div class="title-line"><div class="title-copy"><h1>${label}归档</h1><p class="period"><span>按时间归档</span><span>${entries.length} 期</span></p></div>${archiveStamp}</div></header><div class="archive-layout${entries.length ? "" : " is-empty"}">${archiveMonths}<div class="archive-main">${feature}${search}${groups}<footer class="archive-footer">报告馆 · ${label}归档</footer></div></div></main>`;
  return documentPage({ kind, title: `${label} · 报告馆`, view: "archive", body });
}

module.exports = { icon, readingPage, archivePage };
