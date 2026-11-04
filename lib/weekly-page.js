// Self-contained reading surface; article text is supplied by the Markdown renderer.
module.exports = function weeklyPage({ title, range, toc, body }) {
  const links = toc.map((link) => `<li>${link}</li>`).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root {
  --bg: #f5f2ea;
  --surface: #fdfbf5;
  --ink: #232019;
  --secondary: #6f6a5c;
  --accent: #3d5bd5;
  --line: #e3ded0;
  --font: "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html { scroll-padding-top: 88px; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.85 var(--font); letter-spacing: .02em; }
a { color: var(--accent); text-underline-offset: .22em; text-decoration-thickness: 1px; text-decoration-skip-ink: auto; overflow-wrap: anywhere; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 2px; }
::selection { background: var(--accent); color: var(--surface); }
.site-nav { border-bottom: 1px solid var(--line); background: var(--bg); }
.nav-inner { max-width: 1120px; margin: auto; padding: 12px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { color: var(--ink); font-size: .9375rem; font-weight: 600; letter-spacing: .08em; text-decoration: none; }
.tabs { display: flex; gap: 4px; }
.tabs a { min-height: 44px; padding: 6px 14px; display: inline-flex; align-items: center; color: var(--secondary); font-size: .875rem; text-decoration: none; border-radius: 8px; }
.tabs a:hover { color: var(--ink); background: var(--surface); }
.tabs [aria-current] { color: var(--accent); background: var(--surface); }
.page { max-width: 1120px; margin: auto; padding: 0 32px; }
.issue-header { margin: 64px 0 48px 256px; max-width: 680px; }
h1 { margin: 0 0 16px; font-size: clamp(1.75rem, 4vw, 2.65rem); line-height: 1.3; letter-spacing: .01em; text-wrap: balance; overflow-wrap: anywhere; }
.period { margin: 0; color: var(--secondary); font-size: .875rem; font-variant-numeric: tabular-nums; }
.reading-layout { display: grid; grid-template-columns: 208px minmax(0, 680px); gap: 48px; align-items: start; }
.desktop-toc { position: sticky; top: 28px; padding-top: 4px; }
.toc-label { margin: 0 0 12px; font-size: .8125rem; font-weight: 600; color: var(--secondary); }
.toc-list { list-style: none; margin: 0; padding: 0; }
.toc-list a { display: flex; align-items: center; min-height: 44px; padding: 9px 0; font-size: .8125rem; line-height: 1.65; color: var(--secondary); text-decoration: none; }
.toc-list a:hover, .toc-list a:focus-visible { color: var(--accent); text-decoration: underline; }
.toc-list li + li { border-top: 1px solid var(--line); }
.mobile-toc { display: none; }
.prose { min-width: 0; overflow-wrap: anywhere; }
.prose > h2 { margin: 64px 0 24px; padding-top: 32px; border-top: 1px solid var(--line); font-size: 1.5rem; font-weight: 600; line-height: 1.45; text-wrap: pretty; }
.prose > h2:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.prose h3 { margin: 32px 0 12px; font-size: 1.15rem; font-weight: 600; line-height: 1.5; text-wrap: pretty; }
.prose h4 { margin: 28px 0 10px; font-size: 1rem; }
.prose p { margin: 0 0 20px; text-wrap: pretty; }
.prose ul, .prose ol { padding-left: 1.5em; margin: 16px 0 24px; }
.prose li + li { margin-top: 8px; }
.prose li > p { margin-bottom: 8px; }
.prose li::marker { color: var(--secondary); font-variant-numeric: tabular-nums; }
.prose blockquote { margin: 24px 0; padding: 0 20px; border-left: 1px solid var(--line); color: var(--secondary); }
.prose pre { max-width: 100%; overflow: auto; padding: 20px; margin: 24px 0; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; font-size: .875rem; line-height: 1.7; letter-spacing: 0; }
.prose :not(pre) > code { font-size: .9em; padding: .1em .3em; background: var(--surface); border-radius: 3px; }
.prose table { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; margin: 24px 0; font-size: .9375rem; }
.prose td, .prose th { padding: 10px 14px; border: 1px solid var(--line); text-align: left; }
.article-image { display: block; max-width: 100%; height: auto; margin: 28px auto 0; border: 1px solid var(--line); border-radius: 8px; }
.image-caption { display: block; margin: 10px 0 28px; color: var(--secondary); font-size: .8125rem; line-height: 1.6; text-align: center; }
.prose hr { margin: 32px 0; border: 0; border-top: 1px solid var(--line); }
.issue-footer { margin: 48px 0 32px 256px; padding-top: 20px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 24px; max-width: 680px; font-size: .875rem; }
.issue-footer a { display: inline-flex; align-items: center; min-height: 44px; }
.skip-link { position: absolute; left: 24px; top: -100px; z-index: 10; padding: 10px 16px; background: var(--surface); }
.skip-link:focus { top: 12px; }
@media (max-width: 999px) {
  .page, .nav-inner { max-width: 744px; }
  .issue-header { margin: 44px 0 28px; }
  .reading-layout { display: block; }
  .desktop-toc { display: none; }
  .mobile-toc { display: block; margin-bottom: 32px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .mobile-toc summary { padding: 14px 0; min-height: 48px; cursor: pointer; color: var(--secondary); font-size: .875rem; }
  .mobile-toc .toc-list { padding-bottom: 12px; }
  .issue-footer { margin-left: 0; }
}
@media (max-width: 599px) {
  .page { padding: 0 22px; }
  .nav-inner { padding: 8px 22px; }
  .tabs a { padding: 6px 10px; }
  .issue-header { margin-top: 32px; }
  h1 { line-height: 1.4; }
  .prose > h2 { font-size: 1.3rem; margin-top: 48px; padding-top: 28px; }
  .prose h3 { font-size: 1.1rem; }
}
@media print {
  .site-nav, .desktop-toc, .mobile-toc, .skip-link, .issue-footer { display: none; }
  .page { max-width: none; padding: 0; }
  .issue-header { margin: 0 0 32px; }
  .reading-layout { display: block; }
  h2, h3 { break-after: avoid; }
  body { background: white; color: black; }
}
</style>
</head>
<body id="top">
<a class="skip-link" href="#content">跳到正文</a>
<nav class="site-nav" aria-label="站点分区"><div class="nav-inner"><a class="brand" href="../">报告馆</a><div class="tabs"><a href="../">报告</a><a href="../digests/">日报</a><a href="./" aria-current="page">周报</a></div></div></nav>
<main class="page">
<header class="issue-header"><h1>${title}</h1><p class="period">${range} · 北京时间</p></header>
<div class="reading-layout">
<nav class="desktop-toc" aria-label="栏目目录"><p class="toc-label">本期目录</p><ul class="toc-list">${links}</ul></nav>
<div>
<details class="mobile-toc"><summary>本期目录</summary><nav aria-label="栏目目录"><ul class="toc-list">${links}</ul></nav></details>
<article class="prose" id="content" tabindex="-1">${body}</article>
</div>
</div>
<footer class="issue-footer"><a href="./">返回周报归档</a><a href="#top">回到顶部</a></footer>
</main>
</body>
</html>`;
};
