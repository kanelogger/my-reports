const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { WEEKLY_COLUMNS } = require("../../../../lib/publication");
const { loadImage } = require("../../../../lib/weekly-images");

function checkDraft(file, cover, overview) {
  const md = new MarkdownIt({ html: false });
  const tokens = md.parse(fs.readFileSync(file, "utf8"), {});
  const imageRoot = path.join(path.dirname(file), "images");
  const errors = new Set();
  const hashes = new Map();
  const sections = [];
  const items = [];

  function imageHash(src) {
    if (!hashes.has(src)) {
      try {
        hashes.set(src, loadImage(src, imageRoot).hash);
      } catch (error) {
        errors.add(`图片 ${src} 无法使用：${error.message}`);
        hashes.set(src, null);
      }
    }
    return hashes.get(src);
  }

  const coverHash = imageHash(md.normalizeLink(cover));
  const overviewHash = imageHash(md.normalizeLink(overview));
  if (coverHash && coverHash === overviewHash) errors.add("封面与全期图解使用了同一张图");
  let hasCover = false, hasOverview = false;
  let section, item;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      const title = tokens[i + 1].children.map(child => child.content).join("").trim();
      if (token.level === 0 && token.tag === "h2") {
        section = { title, count: 0 };
        sections.push(section);
        item = null;
      } else if (token.level === 0 && token.tag === "h3" && section) {
        section.count++;
        item = { title, column: section.title, images: new Set() };
        items.push(item);
      }
      i += 2; // Title and closing token. Only body images illustrate an item.
      continue;
    }
    // Publication renders external links as a single “原链接” icon.
    let externalLink = false;
    for (const child of token.children || []) {
      if (child.type === "link_open") externalLink = /^https?:\/\//i.test(child.attrGet("href"));
      if (child.type === "link_close") externalLink = false;
      if (child.type !== "image" || externalLink) continue;
      const src = child.attrGet("src");
      if (!child.content.trim()) errors.add(`缺图注：${src}`);
      const hash = imageHash(src);
      if (!hash) continue;
      if (hash === coverHash) hasCover ||= !section;
      else if (hash === overviewHash) hasOverview = true;
      else if (item) item.images.add(hash);
    }
  }

  if (!hasCover) errors.add("卷首缺少指定的封面");
  if (!hasOverview) errors.add("稿中缺少指定的全期图解");
  if (sections.map(s => s.title).join("\n") !== WEEKLY_COLUMNS.join("\n"))
    errors.add(`常规栏目应依次为：${WEEKLY_COLUMNS.join("、")}；稿中为：${sections.map(s => s.title).join("、")}`);
  for (const s of sections) if (!s.count) errors.add(`「${s.title}」没有三级条目`);

  const uses = new Map();
  for (const entry of items) {
    if (!entry.images.size) errors.add(`条目缺图：「${entry.column} / ${entry.title}」`);
    for (const hash of entry.images) {
      if (!uses.has(hash)) uses.set(hash, []);
      uses.get(hash).push(entry.title);
    }
  }
  for (const titles of uses.values()) {
    if (titles.length > 1) console.warn(`请核对同图是否分别解释这些条目：${titles.join("、")}`);
  }
  console.log(`栏目 ${sections.length}，引用了条目图的条目 ${items.filter(e => e.images.size).length}/${items.length}，卷首封面${hasCover ? "已引用" : "缺失"}，全期图解${hasOverview ? "已引用" : "缺失"}`);
  for (const message of errors) console.error(message);
  return errors.size === 0;
}

const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error("用法：node check-draft.js <草稿路径> <封面 images/路径> <全期图解 images/路径>");
  process.exitCode = 1;
} else {
  try {
    if (!checkDraft(...args)) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
