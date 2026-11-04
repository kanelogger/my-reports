const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MarkdownIt = require("markdown-it");
const ROOT = path.resolve(__dirname, "..");
const md = new MarkdownIt({ html: false });
md.validateLink = (url) => /^https?:\/\//i.test(url) || /^#[\w-]+$/.test(url);
// First edition is text-only: image syntax is displayed as an ordinary source link.
md.renderer.rules.image = (tokens, i) =>
  `${escape(tokens[i].content)}（配图见原文）`;
function escape(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function period(id) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(id))
    throw new Error("请使用周日日期 YYYY-MM-DD");
  const end = new Date(`${id}T12:00:00Z`);
  if (
    !Number.isFinite(+end) ||
    end.toISOString().slice(0, 10) !== id ||
    end.getUTCDay() !== 0
  )
    throw new Error("日期必须是真实的周日");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return `${start.toISOString().slice(0, 10)} — ${id}`;
}
function workspace(root, id) {
  period(id);
  return path.join(root, ".local", "weeklies", id);
}
function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
function init(root, id) {
  const dir = workspace(root, id);
  fs.mkdirSync(dir, { recursive: true });
  const files = {
    "materials.md": `# ${period(id)} 素材\n\n## 文章\n\n<!-- 添加文章链接，可附收藏理由 -->\n\n## 项目\n\n<!-- 添加仓库链接，可附使用感受 -->\n\n## 本周想法\n`,
    "draft.md": `# 周简报｜${id}\n\n## 本周导读\n\n<!-- Agent 核对来源后起草；审阅后删除占位提示 -->\n\n## 好文章\n\n## 开源项目\n\n## 一周动态\n`,
    "review.md": "# 审阅说明\n\n记录来源核验、缺失日报、未采用素材及原因。\n",
  };
  for (const [name, content] of Object.entries(files))
    if (!fs.existsSync(path.join(dir, name)))
      fs.writeFileSync(path.join(dir, name), content, { flag: "wx" });
  return dir;
}
function render(source, id) {
  const range = period(id);
  const parsed = md.parse(source, {});
  const tokens = parsed.filter((token, i) => {
    let start = i;
    if (token.type === "heading_open" && token.tag === "h2") start = i;
    else if (
      token.type === "inline" &&
      parsed[i - 1]?.type === "heading_open" &&
      parsed[i - 1].tag === "h2"
    )
      start = i - 1;
    else if (token.type === "heading_close" && token.tag === "h2")
      start = i - 2;
    else return true;
    const next = parsed[start + 3];
    return Boolean(
      next &&
      !(next.type === "heading_open" && ["h1", "h2"].includes(next.tag)),
    );
  });
  const headings = tokens.filter(
    (t) => t.type === "heading_open" && t.tag === "h1",
  );
  if (headings.length !== 1) throw new Error("正文必须且只能有一个一级标题");
  if (/<!--|\bTODO\b/.test(source))
    throw new Error("请先完成草稿并移除占位提示");
  let title = "",
    toc = [],
    count = 0;
  tokens.forEach((token, i) => {
    if (token.type === "heading_open" && token.tag === "h1")
      title = tokens[i + 1].children
        .map((t) => t.content)
        .join("")
        .trim();
    if (token.type === "heading_open" && token.tag === "h2") {
      const key = `section-${++count}`;
      token.attrSet("id", key);
      toc.push(`<a href="#${key}">${escape(tokens[i + 1].content)}</a>`);
    }
  });
  if (!title || !toc.length) throw new Error("请填写标题和正文栏目");
  const body = md.renderer
    .render(tokens, md.options, {})
    .replace(/<h1>[\s\S]*?<\/h1>\n?/, "");
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>
:root{--bg:#f5f2ea;--ink:#232019;--secondary:#6f6a5c;--accent:#3d5bd5;--line:#e3ded0}*{box-sizing:border-box}html{scroll-padding-top:80px}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.8 "Inter","Noto Sans SC","PingFang SC",system-ui,sans-serif}nav,main,footer{max-width:720px;margin:auto;padding:20px 24px}nav{display:flex;gap:24px;border-bottom:1px solid var(--line)}a{color:var(--accent);text-underline-offset:4px;overflow-wrap:anywhere}a:hover{text-decoration-thickness:2px}a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}h1{font-size:clamp(1.9rem,5vw,2.7rem);line-height:1.3;overflow-wrap:anywhere;margin:32px 0 16px}h2{font-size:1.5rem;margin:48px 0 16px}h3{font-size:1.15rem;margin:28px 0 8px}p{margin:12px 0}pre{overflow:auto;padding:16px;border:1px solid var(--line)}blockquote{margin:20px 0;padding:0 16px;border-left:1px solid var(--line);color:var(--secondary)}table{display:block;overflow:auto;border-collapse:collapse}td,th{padding:8px;border:1px solid var(--line)}.period,footer{color:var(--secondary);font-variant-numeric:tabular-nums}.toc{display:flex;flex-wrap:wrap;gap:12px 24px;padding:20px 0;border-bottom:1px solid var(--line)}::selection{background:var(--accent);color:var(--bg)}@media(max-width:599px){nav,main,footer{padding:18px 20px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style><nav aria-label="站点分区"><a href="../">报告</a><a href="../digests/">日报</a><a href="./" aria-current="page">周报</a></nav><main><h1>${escape(title)}</h1><p class="period">${range} · 北京时间</p><div class="toc" aria-label="栏目目录">${toc.join("")}</div>${body}</main><footer><a href="./">返回周报归档</a></footer></html>`;
}
function preview(root, id) {
  const dir = workspace(root, id),
    source = fs.readFileSync(path.join(dir, "draft.md"), "utf8"),
    html = render(source, id);
  fs.writeFileSync(path.join(dir, "preview.html"), html);
  fs.writeFileSync(
    path.join(dir, "preview.json"),
    JSON.stringify({ source: hash(source), html: hash(html) }),
  );
  return html;
}
function finalize(root, id, replace = false) {
  const dir = workspace(root, id),
    source = fs.readFileSync(path.join(dir, "draft.md"), "utf8");
  const html = fs.readFileSync(path.join(dir, "preview.html"), "utf8"),
    record = JSON.parse(
      fs.readFileSync(path.join(dir, "preview.json"), "utf8"),
    );
  if (hash(source) !== record.source || hash(html) !== record.html)
    throw new Error("草稿或预览已变化，请重新预览并审阅");
  const dest = path.join(root, "weeklies", `${id}.html`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && !replace)
    throw new Error("同一期已存在；确认修订后使用 --replace");
  fs.writeFileSync(dest, html, { flag: replace ? "w" : "wx" });
  return dest;
}
module.exports = { ROOT, period, init, render, preview, finalize };
