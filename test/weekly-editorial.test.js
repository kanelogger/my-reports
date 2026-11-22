const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { WEEKLY_COLUMNS } = require("../lib/publication");

const checker = path.resolve(__dirname, "../.agents/skills/weekly-publish/scripts/check-draft.js");

test("常规周报检查按栏目顺序与每一条的专图判定", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-editorial-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "images"));
  const files = ["cover", "overview", ...WEEKLY_COLUMNS.map((_, i) => String(i))];
  files.forEach((name, i) => {
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
    pixel[13] = i; // A different palette color for each 1×1 GIF.
    fs.writeFileSync(path.join(dir, "images", name + ".gif"), pixel);
  });
  const figure = name => `![配图 ${name}](images/${name}.gif)`;
  const parts = WEEKLY_COLUMNS.map((column, i) => `## ${column}\n\n### 条目${i}\n\n正文。\n\n${figure(i)}`);
  const intro = `# 本周简报\n\n${figure("cover")}`;
  const make = sections => [intro, ...sections, figure("overview")].join("\n\n");
  function check(source) {
    const draft = path.join(dir, "draft.md");
    fs.writeFileSync(draft, source);
    return spawnSync(process.execPath, [checker, draft, "images/cover.gif", "images/overview.gif"], { encoding: "utf8" });
  }

  assert.equal(check(make(parts)).status, 0);
  const wrongOrder = check(make([parts[1], parts[0], ...parts.slice(2)]));
  assert.equal(wrongOrder.status, 1);
  assert.match(wrongOrder.stderr, /常规栏目/);

  // Even a valid file is not an illustration of this item if it is in the
  // preceding item, a code example, or an external link replaced by 原链接.
  const complete = make(parts);
  const moved = complete.replace(figure(5), "").replace(figure(4), figure(4) + "\n\n" + figure(5));
  const missingLastImage = [
    moved,
    complete.replace(figure(5), ["~~~md", figure(5), "~~~"].join("\n")),
    complete.replace(figure(5), `[${figure(5)}](https://example.org/)`),
    complete.replace(figure(5), figure("cover")),
    complete.replace(figure(5), figure("overview")),
  ];
  for (const example of missingLastImage) {
    const result = check(example);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /工具与项目 \/ 条目5/);
    assert.match(result.stdout, /5\/6/);
  }
});
