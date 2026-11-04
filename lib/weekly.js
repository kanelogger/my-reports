const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MarkdownIt = require("markdown-it");
const ROOT = path.resolve(__dirname, "..");
const weeklyPage = require("./weekly-page");
const { loadImage } = require("./weekly-images");
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });
md.linkify.set({ fuzzyLink: true });
md.validateLink = (url) =>
  /^https?:\/\//i.test(url) || /^#[\w-]+$/.test(url) || /^images\//.test(url);
md.renderer.rules.image = (tokens, i, options, env) => {
  const token = tokens[i];
  const image = loadImage(token.attrGet("src"), env.imageRoot);
  if (env.images && !env.images.some((entry) => entry.src === image.src))
    env.images.push({ src: image.src, hash: image.hash });
  const alt = escape(token.content);
  return `<img class="article-image" src="${image.uri}" alt="${alt}" loading="lazy" decoding="async"><span class="image-caption" aria-hidden="true">${alt}</span>`;
};
function escape(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
// Linkify plain URLs after Chinese punctuation without changing their visible text.
md.renderer.rules.text = (tokens, index) => {
  const text = tokens[index].content;
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (tokens[i].type === "link_open") depth++;
    if (tokens[i].type === "link_close") depth--;
  }
  if (depth) return escape(text);
  const searchable = text.replace(
    /[^\x00-\x7F](?=(?:https?:\/\/)?[a-z0-9][a-z0-9.-]*\.[a-z])/gi,
    " ",
  );
  const matches = md.linkify.match(searchable) || [];
  let result = "",
    offset = 0;
  for (const match of matches) {
    result += escape(text.slice(offset, match.index));
    const label = escape(text.slice(match.index, match.lastIndex));
    result +=
      /^https?:\/\//i.test(match.url) &&
      (text.slice(match.index, match.lastIndex).includes("/") ||
        /^www\./i.test(match.raw))
        ? `<a href="${escape(md.normalizeLink(match.url))}">${label}</a>`
        : label;
    offset = match.lastIndex;
  }
  return result + escape(text.slice(offset));
};
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
function draftTemplate(id) {
  return `# 周简报｜${id}\n\n## 本周导读\n\n<!-- 可放入用户提供的导读原文；没有则删除此栏目 -->\n\n## 好文章\n\n## 开源项目\n\n## 一周动态\n`;
}
function init(root, id) {
  const dir = workspace(root, id);
  fs.mkdirSync(dir, { recursive: true });
  const files = {
    "materials.md": `# ${period(id)} 素材\n\n## 文章\n\n<!-- 添加文章链接，可附收藏理由 -->\n\n## 项目\n\n<!-- 添加仓库链接，可附使用感受 -->\n\n## 本周想法\n`,
    "draft.md": draftTemplate(id),
    "review.md": "# 审阅说明\n\n记录素材删选、重排和标题调整，供用户审阅。\n",
  };
  for (const [name, content] of Object.entries(files))
    if (!fs.existsSync(path.join(dir, name)))
      fs.writeFileSync(path.join(dir, name), content, { flag: "wx" });
  return dir;
}
function render(source, id, options = {}) {
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
    .render(tokens, md.options, options)
    .replace(/<h1>[\s\S]*?<\/h1>\n?/, "");
  return weeklyPage({ title: escape(title), range, toc, body });
}
function preview(root, id) {
  const dir = workspace(root, id),
    source = fs.readFileSync(path.join(dir, "draft.md"), "utf8"),
    images = [],
    html = render(source, id, { imageRoot: path.join(dir, "images"), images });
  fs.writeFileSync(path.join(dir, "preview.html"), html);
  fs.writeFileSync(
    path.join(dir, "preview.json"),
    JSON.stringify({ source: hash(source), html: hash(html), images }),
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
  for (const image of record.images || []) {
    if (loadImage(image.src, path.join(dir, "images")).hash !== image.hash) {
      throw new Error("图片已变化，请重新预览并审阅");
    }
  }
  const dest = path.join(root, "weeklies", `${id}.html`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && !replace)
    throw new Error("同一期已存在；确认修订后使用 --replace");
  fs.writeFileSync(dest, html, { flag: replace ? "w" : "wx" });
  return dest;
}
module.exports = {
  ROOT,
  period,
  init,
  render,
  preview,
  finalize,
  draftTemplate,
};
