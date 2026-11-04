const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MarkdownIt = require("markdown-it");
const { period, draftTemplate } = require("./weekly");
const md = new MarkdownIt({ html: false });
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");

// Token line maps distinguish actual headings from heading-like text in code fences.
function organize(source, id) {
  period(id);
  const lines = source.split("\n");
  const headings = md
    .parse(source, {})
    .filter((token) => token.type === "heading_open" && token.level === 0);
  const titles = headings.filter((token) => token.tag === "h1");
  if (titles.length > 1 || (titles.length && titles[0].map[0] !== 0)) {
    throw new Error("素材只支持开头的一个一级标题，请用二级标题划分栏目");
  }
  const columns = new Map();
  const seen = new Set();
  const removed = [];
  function append(column, text, item = false) {
    if (!text.trim() || /^\s*(?:<!--[\s\S]*?-->\s*)+$/.test(text)) return;
    const key = `${item ? "item" : column}\0${text.trim()}`;
    if (seen.has(key)) {
      removed.push({ column, title: text.split("\n")[0] });
      return;
    }
    seen.add(key);
    if (!columns.has(column)) columns.set(column, []);
    columns.get(column).push(text);
  }
  const boundaries = headings.filter((token) => token.tag === "h2");
  const firstLine = titles.length ? titles[0].map[1] : 0;
  append(
    "本周精选",
    lines.slice(firstLine, boundaries[0]?.map[0] ?? lines.length).join("\n"),
  );
  boundaries.forEach((heading, i) => {
    const start = heading.map[1];
    const end = boundaries[i + 1]?.map[0] ?? lines.length;
    const column = lines
      .slice(heading.map[0], start)
      .join("\n")
      .replace(/^ {0,3}##\s+/, "")
      .replace(/\s+#+\s*$/, "")
      .trim();
    const items = headings.filter(
      (token) =>
        token.tag === "h3" && token.map[0] >= start && token.map[0] < end,
    );
    append(column, lines.slice(start, items[0]?.map[0] ?? end).join("\n"));
    items.forEach((item, j) =>
      append(
        column,
        lines.slice(item.map[0], items[j + 1]?.map[0] ?? end).join("\n"),
        true,
      ),
    );
  });
  if (!columns.size) throw new Error("素材中没有可整理的正文，请先添加内容");
  const body = [...columns]
    .map(([title, blocks]) => `## ${title}\n${blocks.join("\n")}`)
    .join("\n");
  return {
    text: `# 周简报｜${id}\n\n${body}${body.endsWith("\n") ? "" : "\n"}`,
    removed,
    columns: [...columns.keys()],
  };
}

function draft(root, id, replace = false) {
  period(id);
  const dir = path.join(root, ".local", "weeklies", id);
  const source = fs.readFileSync(path.join(dir, "materials.md"), "utf8");
  const result = organize(source, id);
  const destination = path.join(dir, "draft.md");
  const reportPath = path.join(dir, "draft-report.json");
  const current = fs.existsSync(destination)
    ? fs.readFileSync(destination, "utf8")
    : null;
  const previous = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
    : {};
  if (
    current !== null &&
    current !== draftTemplate(id) &&
    digest(current) !== previous.outputHash &&
    !replace
  ) {
    throw new Error(
      "草稿已被人工编辑，保留现有草稿；确认重新整理时添加 --replace",
    );
  }
  if (replace && current !== null) {
    fs.writeFileSync(
      path.join(dir, `draft-backup-${crypto.randomUUID()}.md`),
      current,
      { flag: "wx" },
    );
  }
  fs.writeFileSync(destination, result.text);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        sourceHash: digest(source),
        outputHash: digest(result.text),
        columns: result.columns,
        removed: result.removed,
      },
      null,
      2,
    ) + "\n",
  );
  return {
    path: destination,
    removed: result.removed.length,
    columns: result.columns,
  };
}
module.exports = { organize, draft };
