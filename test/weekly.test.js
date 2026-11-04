const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const weekly = require("../lib/weekly");
const { packageSite } = require("../lib/site");
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const id = "2026-11-08";
const draft =
  "# 测试周报 & 中文\n\n## 本周导读\n\n这是测试内容。\n\n## 好文章\n\n### [原文](https://example.com)\n\n值得阅读。\n";
test("真实周日及跨年周期", () => {
  assert.equal(weekly.period("2027-01-03"), "2026-12-28 — 2027-01-03");
  for (const bad of ["2026-02-30", "2026-11-04", "../../x"])
    assert.throws(() => weekly.period(bad));
});
test("素材保护、预览一致及定稿覆盖保护", (t) => {
  const root = fixture(t),
    dir = weekly.init(root, id);
  fs.writeFileSync(path.join(dir, "materials.md"), "我的备注");
  weekly.init(root, id);
  assert.equal(
    fs.readFileSync(path.join(dir, "materials.md"), "utf8"),
    "我的备注",
  );
  assert.throws(() => weekly.preview(root, id));
  fs.writeFileSync(path.join(dir, "draft.md"), draft);
  const html = weekly.preview(root, id);
  fs.writeFileSync(path.join(dir, "draft.md"), draft + "修改");
  assert.throws(() => weekly.finalize(root, id));
  weekly.preview(root, id);
  const out = weekly.finalize(root, id);
  assert.equal(
    fs.readFileSync(out, "utf8"),
    fs.readFileSync(path.join(dir, "preview.html"), "utf8"),
  );
  assert.throws(() => weekly.finalize(root, id));
  weekly.finalize(root, id, true);
  fs.appendFileSync(path.join(dir, "preview.html"), "篡改");
  assert.throws(() => weekly.finalize(root, id, true));
  assert.match(html, /测试周报 &amp; 中文/);
});
test("Markdown 保真且不执行原始 HTML 或危险链接", () => {
  const html = weekly.render(
    draft +
      "\n<script>alert(1)</script>\n\n[坏链接](javascript:alert(1))\n\n```js\nconst a = 1;\n```\n\n> 引用\n",
    id,
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
  assert.match(html, /<pre><code/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /href="#section-1"/);
});
test("公开打包保留报告资源且隔离私人文件、清理旧产物", (t) => {
  const root = fixture(t);
  for (const dir of ["reports/assets", "digests", "weeklies", ".local"])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const f of [
    "index.html",
    "reports/index.html",
    "reports/assets/test.js",
    "digests/index.html",
    "digests/20261101.html",
    "weeklies/index.html",
    "weeklies/2026-11-08.html",
    "weeklies/draft.md",
    ".local/secret.md",
    "README.md",
  ])
    fs.writeFileSync(path.join(root, f), f);
  let out = packageSite(root);
  assert.ok(fs.existsSync(path.join(out, "reports/assets/test.js")));
  assert.ok(fs.existsSync(path.join(out, "digests/20261101.html")));
  for (const f of [".local", "README.md", "weeklies/draft.md"])
    assert.ok(!fs.existsSync(path.join(out, f)));
  fs.writeFileSync(path.join(out, "stale.html"), "stale");
  packageSite(root);
  assert.ok(!fs.existsSync(path.join(out, "stale.html")));
  fs.symlinkSync(path.join(root, "README.md"), path.join(root, "reports/leak"));
  assert.throws(() => packageSite(root), /符号链接/);
});
test("索引保留旧报告日期及周报标题，日期区间进入说明", (t) => {
  const root = fixture(t);
  for (const dir of ["lib", "reports", "digests", "weeklies"])
    fs.mkdirSync(path.join(root, dir));
  fs.copyFileSync(
    path.join(__dirname, "../lib/indexes.js"),
    path.join(root, "lib/indexes.js"),
  );
  fs.writeFileSync(
    path.join(root, "reports/legacy.html"),
    "<title>旧报告</title>",
  );
  fs.writeFileSync(
    path.join(root, "index.html"),
    '<a class="card" href="./reports/legacy.html"><time class="card-date" datetime="2020-01-02">',
  );
  fs.writeFileSync(
    path.join(root, "weeklies/2026-11-08.html"),
    "<title>周简报｜星期日阅读</title>",
  );
  require(path.join(root, "lib/indexes.js")).generateIndexes();
  const report = fs.readFileSync(path.join(root, "index.html"), "utf8"),
    html = fs.readFileSync(path.join(root, "weeklies/index.html"), "utf8");
  assert.match(report, /datetime="2020-01-02"/);
  assert.match(html, /周简报｜星期日阅读/);
  assert.match(html, /card-kicker">2026-11-02 — 2026-11-08/);
  assert.match(html, /href="\.\.\/digests\/"/);
});
test("空栏目隐藏且正文标题只出现一次", () => {
  const html = weekly.render(draft + "\n## 空栏目\n", id);
  assert.ok(!html.includes("空栏目"));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.ok(html.indexOf("<h1>") < html.indexOf('class="period"'));
});
