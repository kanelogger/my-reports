const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const daily = require("../lib/daily");
const weekly = require("../lib/weekly");
const { hash } = require("../lib/publication-format");
const { archivePage } = require("../lib/publication-page");
const { createPreviewServer } = require("../lib/publication-cli");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "publication-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const source = "# 用户给定的标题\n\n## 好文章\n\n原文 0.016%，保留条件。\n\n## 工具与项目\n\n[原链接](https://example.com/a?q=1&b=2)\n\n## 一周动态\n\n最后一段。\n";

test("日报支持任意真实日期，与周报共用 A 模板和栏目颜色", () => {
  for (const id of ["2026-11-04", "2024-02-29", "2027-01-01"]) assert.equal(daily.period(id), id);
  for (const id of ["2026-02-29", "2026-02-30", "2026-13-01", "../../secret", undefined])
    assert.throws(() => daily.period(id));
  const day = daily.render(source, "2026-11-04");
  const week = weekly.render(source, "2026-11-08");
  for (const html of [day, week]) {
    assert.match(html, /data-publication="editorial-a-v4"/);
    for (const [id, color] of [[1, "blue"], [2, "green"], [3, "gold"]]) {
      assert.match(html, new RegExp(`id="section-${id}" data-tone="${color}"`));
      assert.match(html, new RegExp(`href="#section-${id}" data-tone="${color}"`));
    }
    assert.match(html, /原文 0\.016%，保留条件。/);
    assert.match(html, /<a class="source-link" href="https:\/\/example.com\/a\?q=1&amp;b=2" target="_blank" rel="noopener noreferrer"><svg class="icon"[^>]*>[\s\S]*?<\/svg><span>原链接<\/span><\/a>/);
    assert.equal((html.match(/原链接/g) || []).length, 1);
    assert.equal((html.match(/target="_blank"/g) || []).length, 1);
    const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    const outside = html.replace(article, "");
    assert.ok(!outside.includes("原链接"));
    assert.ok(!outside.includes('class="source-link"'));
    assert.ok(!outside.includes('target="_blank"'));
    assert.ok(!/<(?:script|link)[^>]+(?:src|href)="https?:/.test(html));
    assert.match(html, /data:font\/woff2;base64/);
  }
  assert.equal(day.match(/<style>([\s\S]*?)<\/style>/)[1], week.match(/<style>([\s\S]*?)<\/style>/)[1]);
  assert.match(weekly.render(source, "2027-01-03"), /2026 \/ 第 53 周/);
});

test("正文外链统一为原链接并新开标签，页内锚点与代码中的网址保持原文", () => {
  const html = daily.render(`# 日报

## 人物

裸地址 https://example.com/bare?x=1&y=2

[自定义标题](https://example.com/custom)

[**强调文案**](https://example.com/em)

[甲](https://example.com/a) 随后 https://example.com/b

参见：https://example.com/zh。

[章节](#section-1)

\`https://example.com/code\`

\`\`\`
https://example.com/fence
\`\`\`
`, "2026-11-04");
  const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
  const outside = html.replace(article, "");
  for (const href of [
    "https://example.com/bare?x=1&amp;y=2",
    "https://example.com/custom",
    "https://example.com/em",
    "https://example.com/a",
    "https://example.com/b",
    "https://example.com/zh",
  ]) {
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(article, new RegExp(`<a class="source-link" href="${escaped}" target="_blank" rel="noopener noreferrer"><svg class="icon"[^>]*>[\\s\\S]*?<\\/svg><span>原链接<\\/span><\\/a>`));
  }
  assert.equal((article.match(/<span>原链接<\/span>/g) || []).length, 6);
  assert.ok(!article.includes("自定义标题"));
  assert.ok(!article.includes("强调文案"));
  assert.ok(!article.includes('href="https://example.com/code"'));
  assert.ok(!article.includes('href="https://example.com/fence"'));
  assert.match(article, /<a href="#section-1">章节<\/a>/);
  assert.ok(!article.includes('href="#section-1" target'));
  assert.match(article, /<code>https:\/\/example.com\/code<\/code>/);
  assert.match(article, /https:\/\/example.com\/fence/);
  assert.ok(!outside.includes("原链接"));
  assert.ok(!outside.includes('class="source-link"'));
  assert.ok(!outside.includes('target="_blank"'));
});

test("自定义栏目按顺序配色，引用与代码中的标题不会成为独立章节", () => {
  const html = daily.render("# 日报\n\n开头原文。\n\n## 自选一\n\n> ## 引用中的标题\n> 原文\n\n```md\n## 代码中的标题\n<!-- 原文注释 -->\nTODO 保留\n```\n\n## 自选二\n\n第二段。\n\n## 空栏目\n", "2026-11-04");
  assert.equal((html.match(/class="reading-section"/g) || []).length, 2);
  assert.match(html, /id="section-1" data-tone="red"/);
  assert.match(html, /id="section-2" data-tone="blue"/);
  assert.match(html, /<blockquote>\n<h2>引用中的标题/);
  assert.match(html, /&lt;!-- 原文注释 --&gt;/);
  assert.match(html, /TODO 保留/);
  assert.ok(!html.includes("空栏目"));
});

test("日报预览定稿保持字节一致，变更草稿、图片、预览或模板均需要重新预览", (t) => {
  const root = fixture(t), id = "2026-11-04", dir = daily.init(root, id);
  assert.throws(() => daily.finalize(root, id), /请先运行 daily:preview/);
  assert.throws(() => daily.preview(root, id));
  fs.writeFileSync(path.join(dir, "draft.md"), source);
  daily.init(root, id);
  assert.equal(fs.readFileSync(path.join(dir, "draft.md"), "utf8"), source);
  const html = daily.preview(root, id);
  const output = daily.finalize(root, id);
  assert.equal(fs.readFileSync(output, "utf8"), html);
  assert.throws(() => daily.finalize(root, id), /同一期/);
  fs.appendFileSync(path.join(dir, "draft.md"), "用户修改");
  assert.throws(() => daily.finalize(root, id, true), /重新预览/);
  fs.writeFileSync(path.join(dir, "draft.md"), source);
  fs.writeFileSync(path.join(dir, "preview.html"), html + "旧模板");
  assert.throws(() => daily.finalize(root, id, true), /重新预览/);
  const recordPath = path.join(dir, "preview.json"), record = JSON.parse(fs.readFileSync(recordPath));
  record.html = hash(html + "旧模板");
  fs.writeFileSync(recordPath, JSON.stringify(record));
  assert.throws(() => daily.finalize(root, id, true), /模板或渲染结果/);
  daily.preview(root, id);
  assert.equal(daily.finalize(root, id, true), output);
});

test("日报旧文件名也受同日覆盖保护，正式文件拒绝符号链接", (t) => {
  const root = fixture(t), id = "2026-11-04", dir = daily.init(root, id);
  fs.writeFileSync(path.join(dir, "draft.md"), source);
  daily.preview(root, id);
  fs.mkdirSync(path.join(root, "digests"));
  fs.writeFileSync(path.join(root, "digests/20261104.html"), "历史原文");
  assert.throws(() => daily.finalize(root, id), /同一期/);
  const output = daily.finalize(root, id, true);
  assert.equal(fs.readFileSync(path.join(root, "digests/20261104.html"), "utf8"), "历史原文");
  fs.unlinkSync(output);
  const target = path.join(root, "private.txt"); fs.writeFileSync(target, "保留");
  fs.symlinkSync(target, output);
  assert.throws(() => daily.finalize(root, id, true), /符号链接/);
  assert.equal(fs.readFileSync(target, "utf8"), "保留");
});

test("归档使用真实条目与链接，空周报没有虚构期次", () => {
  const html = archivePage({ kind: "daily", entries: [{ title: "标题 <&>", iso: "2026-11-04", href: "./2026-11-04.html" }] });
  assert.match(html, /标题 &lt;&amp;&gt;/);
  assert.match(html, /href="\.\/2026-11-04.html"/);
  assert.match(html, /星期三/);
  const empty = archivePage({ kind: "weekly", entries: [] });
  assert.match(empty, /第一期周报，正在准备中/);
  assert.ok(!empty.includes('class="latest"'));
});

test("预览服务只开放公开目录和指定预览，私有稿件与符号链接不可读取", async (t) => {
  const root = fixture(t), site = path.join(root, "dist");
  fs.mkdirSync(site); fs.writeFileSync(path.join(site, "index.html"), "归档");
  fs.writeFileSync(path.join(root, "private.md"), "私人素材");
  fs.symlinkSync(path.join(root, "private.md"), path.join(site, "leak.md"));
  const server = createPreviewServer({ siteRoot: site, route: "/digests/2026-11-04.html", html: "预览正文" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(url + "/")).text(), "归档");
  assert.equal(await (await fetch(url + "/digests/2026-11-04.html")).text(), "预览正文");
  for (const route of ["/private.md", "/.local/private.md", "/%2e%2e%2fprivate.md", "/leak.md"])
    assert.equal((await fetch(url + route)).status, 404);
  assert.equal((await fetch(url + "/", { method: "POST" })).status, 405);
  assert.equal(await (await fetch(url + "/digests/2026-11-04.html", { method: "HEAD" })).text(), "");
});
