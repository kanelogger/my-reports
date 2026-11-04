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
  fs.cpSync(path.join(__dirname, "../lib"), path.join(root, "lib"), { recursive: true });
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

test("整理只去除完整重复条目，保留同链接不同正文和代码中的标题", () => {
  const { organize } = require("../lib/draft");
  const entry = "### 原文标题\n\nhttps://example.com\n\n原文内容  不能改。\n";
  const different =
    "### 另一个角度\n\nhttps://example.com\n\n相同链接，但内容不同。\n";
  const code = "### 代码示例\n\n```md\n## 这不是栏目\n### 这不是条目\n```\n";
  const result = organize(
    "# 素材\n\n## 好文章\n\n" +
      entry +
      "\n" +
      entry +
      "\n## 项目\n\n" +
      different +
      code,
    id,
  );
  assert.equal(result.removed.length, 1);
  assert.deepEqual(result.columns, ["好文章", "项目"]);
  assert.ok(result.text.includes(entry));
  assert.ok(result.text.includes(different));
  assert.ok(result.text.includes(code));
  assert.equal((result.text.match(/原文内容/g) || []).length, 1);
});
test("重复栏目合并，未分组的原文保留，空模板不能生成正文", () => {
  const { organize } = require("../lib/draft");
  const result = organize(
    "# 素材\n\n开头原文\n\n## 文章\n\n第一段\n\n## 文章\n\n第二段\n",
    id,
  );
  assert.deepEqual(result.columns, ["本周精选", "文章"]);
  assert.equal((result.text.match(/## 文章/g) || []).length, 1);
  for (const text of ["开头原文", "第一段", "第二段"])
    assert.ok(result.text.includes(text));
  assert.throws(() => organize("# 素材\n\n## 文章\n\n<!-- 添加内容 -->\n", id));
});
test("脚本整理不修改素材，不覆盖人工编辑，显式重做备份旧稿", (t) => {
  const { draft: prepare } = require("../lib/draft");
  const root = fixture(t),
    dir = weekly.init(root, id);
  const material = "# 素材\n\n## 本周精选\n\n用户原文，保留细节。\n";
  fs.writeFileSync(path.join(dir, "materials.md"), material);
  prepare(root, id);
  assert.equal(
    fs.readFileSync(path.join(dir, "materials.md"), "utf8"),
    material,
  );
  prepare(root, id);
  const target = path.join(dir, "draft.md");
  fs.appendFileSync(target, "人工补充");
  assert.throws(() => prepare(root, id), /人工编辑/);
  assert.ok(fs.readFileSync(target, "utf8").endsWith("人工补充"));
  prepare(root, id, true);
  const backups = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("draft-backup-"));
  assert.equal(backups.length, 1);
  assert.ok(
    fs.readFileSync(path.join(dir, backups[0]), "utf8").endsWith("人工补充"),
  );
});

test("阅读排版保留原文换行和网址文字，仅增强链接与导航", () => {
  const source =
    "# 原标题\n\n## 原栏目\n\n原句第一行\n原句第二行\n\n地址：github.com/vercel-labs/agent-desktop\n";
  const html = weekly.render(source, id);
  assert.match(html, /原句第一行<br>\n原句第二行/);
  assert.match(html, />github.com\/vercel-labs\/agent-desktop<\/a>/);
  assert.match(html, /href="http:\/\/github.com\/vercel-labs\/agent-desktop"/);
  assert.match(html, /<article class="prose" id="content"/);
  assert.match(html, /<details class="mobile-toc">/);
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.match(html, /<script data-publication-ui>/);
});

test("文件名不会被误认成网站，也不会在原有链接内嵌套链接", () => {
  const html = weekly.render(
    "# 周报\n\n## 文章\n\nCLAUDE.md 和 README.md 是文件名。\n\n[github.com/repo](https://example.com)\n",
    id,
  );
  assert.ok(!html.includes('href="http://CLAUDE.md'));
  assert.ok(!html.includes('href="http://claude.md'));
  assert.match(html, /<a href="https:\/\/example.com">github.com\/repo<\/a>/);
});

test("本地图片内嵌，图片变动阻止旧预览定稿，拒绝越界和远程图片", (t) => {
  const root = fixture(t),
    dir = weekly.init(root, id);
  const images = path.join(dir, "images");
  fs.mkdirSync(images);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6jLkAAAAASUVORK5CYII=",
    "base64",
  );
  fs.writeFileSync(path.join(images, "示例.png"), png);
  const source = "# 周报\n\n## 图片\n\n![图片说明](images/示例.png)\n";
  fs.writeFileSync(path.join(dir, "draft.md"), source);
  const html = weekly.preview(root, id);
  assert.match(html, /src="data:image\/png;base64,/);
  assert.match(html, /alt="图片说明"/);
  assert.equal(fs.readFileSync(path.join(dir, "draft.md"), "utf8"), source);
  fs.appendFileSync(path.join(images, "示例.png"), "modified");
  assert.throws(() => weekly.finalize(root, id), /图片已变化/);
  fs.writeFileSync(path.join(images, "示例.png"), png);
  const out = weekly.finalize(root, id);
  assert.ok(fs.readFileSync(out, "utf8").includes(png.toString("base64")));
  fs.writeFileSync(path.join(dir, "outside.png"), png);
  const options = { imageRoot: images };
  assert.throws(
    () =>
      weekly.render(
        "# 周报\n\n## 图片\n\n![越界](images/../outside.png)",
        id,
        options,
      ),
    /目录内/,
  );
  fs.symlinkSync(path.join(dir, "outside.png"), path.join(images, "link.png"));
  assert.throws(
    () =>
      weekly.render(
        "# 周报\n\n## 图片\n\n![越界](images/link.png)",
        id,
        options,
      ),
    /目录内/,
  );
  assert.throws(
    () =>
      weekly.render(
        "# 周报\n\n## 图片\n\n![远程](https://example.com/photo.png)",
        id,
        options,
      ),
    /images/,
  );
});
