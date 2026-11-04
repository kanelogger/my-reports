const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { configuration, dateInfo, escape, sectionColor, hash } = require("./publication-format");
const { readingPage } = require("./publication-page");
const { loadImage } = require("./weekly-images");
const ROOT = path.resolve(__dirname, "..");
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });
md.linkify.set({ fuzzyLink: true });
md.validateLink = (url) => /^https?:\/\//i.test(url) || /^#[\w-]+$/.test(url) || /^images\//.test(url);
md.renderer.rules.image = (tokens, i, options, env) => {
  const token = tokens[i];
  const image = loadImage(token.attrGet("src"), env.imageRoot);
  if (env.images && !env.images.some((entry) => entry.src === image.src))
    env.images.push({ src: image.src, hash: image.hash });
  const alt = escape(token.content);
  return `<img class="article-image" src="${image.uri}" alt="${alt}" loading="lazy" decoding="async"><span class="image-caption" aria-hidden="true">${alt}</span>`;
};

// Preserve visible URL text, including links following Chinese punctuation.
md.renderer.rules.text = (tokens, index) => {
  const text = tokens[index].content;
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (tokens[i].type === "link_open") depth++;
    if (tokens[i].type === "link_close") depth--;
  }
  if (depth) return escape(text);
  const searchable = text.replace(/[^\x00-\x7F](?=(?:https?:\/\/)?[a-z0-9][a-z0-9.-]*\.[a-z])/gi, " ");
  let result = "", offset = 0;
  for (const match of md.linkify.match(searchable) || []) {
    result += escape(text.slice(offset, match.index));
    const label = escape(text.slice(match.index, match.lastIndex));
    result += /^https?:\/\//i.test(match.url) &&
      (text.slice(match.index, match.lastIndex).includes("/") || /^www\./i.test(match.raw))
      ? `<a href="${escape(md.normalizeLink(match.url))}">${label}</a>` : label;
    offset = match.lastIndex;
  }
  return result + escape(text.slice(offset));
};

function inlineText(token) {
  return (token.children || []).map((child) => child.content).join("").trim();
}

function render(source, id, kind, options = {}) {
  const info = dateInfo(id, kind);
  const tokens = md.parse(source, {});
  const titles = tokens.filter((token) => token.type === "heading_open" && token.tag === "h1");
  if (titles.length !== 1 || titles[0].level !== 0)
    throw new Error("正文必须且只能有一个一级标题");
  const titleIndex = tokens.indexOf(titles[0]);
  const title = inlineText(tokens[titleIndex + 1]);
  if (!title) throw new Error("请填写标题和正文栏目");
  tokens.splice(titleIndex, 3);
  const boundaries = tokens.flatMap((token, i) =>
    token.type === "heading_open" && token.tag === "h2" && token.level === 0 ? [i] : [],
  );
  const sections = [];
  boundaries.forEach((start, i) => {
    const end = boundaries[i + 1] ?? tokens.length;
    const content = tokens.slice(start + 3, end);
    if (!content.length) return;
    const label = inlineText(tokens[start + 1]);
    if (!label) throw new Error("栏目标题不能为空");
    const number = sections.length + 1;
    sections.push({
      id: `section-${number}`,
      number: String(number).padStart(2, "0"),
      title: label,
      titleHtml: md.renderer.renderInline(tokens[start + 1].children, md.options, options),
      color: sectionColor(label, number - 1),
      body: md.renderer.render(content, md.options, options),
    });
  });
  if (!sections.length) throw new Error("请填写标题和正文栏目");
  const intro = md.renderer.render(tokens.slice(0, boundaries[0]), md.options, options);
  return readingPage({ kind, title, info, sections, intro });
}

function createPublication(kind) {
  const config = configuration(kind);
  const workspace = (root, id) => {
    dateInfo(id, kind);
    return path.join(root, ".local", config.directory, id);
  };
  const draftTemplate = (id) => {
    dateInfo(id, kind);
    const columns = kind === "weekly" ? ["好文章", "工具与项目", "一周动态"] : ["今日主线", "人物精选", "小工具", "AI 资讯"];
    return `# ${config.title}\n\n${columns.map((title) => `## ${title}\n`).join("\n")}\n`;
  };
  function init(root, id) {
    const dir = workspace(root, id);
    fs.mkdirSync(dir, { recursive: true });
    const files = { "draft.md": draftTemplate(id) };
    if (kind === "weekly") {
      files["materials.md"] = `# ${dateInfo(id, kind).range} 素材\n\n## 文章\n\n<!-- 添加文章原文 -->\n\n## 项目\n\n<!-- 添加项目原文 -->\n\n## 本周想法\n`;
      files["review.md"] = "# 审阅说明\n\n记录素材删选、重排和标题调整，供用户审阅。\n";
    }
    for (const [name, content] of Object.entries(files)) {
      if (!fs.existsSync(path.join(dir, name)))
        fs.writeFileSync(path.join(dir, name), content, { flag: "wx" });
    }
    return dir;
  }
  function preview(root, id) {
    const dir = workspace(root, id);
    if (!fs.existsSync(path.join(dir, "draft.md")))
      throw new Error(`草稿不存在，请先运行 ${kind}:init 并填写 draft.md`);
    const source = fs.readFileSync(path.join(dir, "draft.md"), "utf8");
    const images = [];
    const html = render(source, id, kind, { imageRoot: path.join(dir, "images"), images });
    fs.writeFileSync(path.join(dir, "preview.html"), html);
    fs.writeFileSync(path.join(dir, "preview.json"), JSON.stringify({ kind, id, source: hash(source), html: hash(html), images }) + "\n");
    return html;
  }
  function finalize(root, id, replace = false) {
    const dir = workspace(root, id);
    if (!["draft.md", "preview.html", "preview.json"].every((name) => fs.existsSync(path.join(dir, name))))
      throw new Error(`请先运行 ${kind}:preview，审阅并确认本期内容后再定稿`);
    const source = fs.readFileSync(path.join(dir, "draft.md"), "utf8");
    const html = fs.readFileSync(path.join(dir, "preview.html"), "utf8");
    const record = JSON.parse(fs.readFileSync(path.join(dir, "preview.json"), "utf8"));
    if (hash(source) !== record.source || hash(html) !== record.html ||
      (record.kind && record.kind !== kind) || (record.id && record.id !== id))
      throw new Error("草稿或预览已变化，请重新预览并审阅");
    for (const image of record.images || []) {
      if (loadImage(image.src, path.join(dir, "images")).hash !== image.hash)
        throw new Error("图片已变化，请重新预览并审阅");
    }
    const current = render(source, id, kind, { imageRoot: path.join(dir, "images") });
    if (hash(current) !== record.html)
      throw new Error("模板或渲染结果已变化，请重新预览并审阅");
    const destination = path.join(root, config.directory, `${id}.html`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const legacy = kind === "daily" ? path.join(root, config.directory, `${id.replaceAll("-", "")}.html`) : null;
    if ((fs.existsSync(destination) || (legacy && fs.existsSync(legacy))) && !replace)
      throw new Error("同一期已存在；确认修订后使用 --replace");
    if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink())
      throw new Error("正式 HTML 不能是符号链接");
    fs.writeFileSync(destination, html, { flag: replace ? "w" : "wx" });
    return destination;
  }
  return {
    ROOT, kind, directory: config.directory,
    period: (id) => dateInfo(id, kind).range,
    init, preview, finalize, draftTemplate,
    render: (source, id, options = {}) => render(source, id, kind, options),
  };
}

module.exports = { createPublication };
