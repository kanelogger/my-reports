const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const { configuration } = require("./publication-format");

function createPreviewServer({ siteRoot, route, html }) {
  const site = fs.realpathSync(siteRoot);
  const types = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
  };
  return http.createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
    try {
      const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      let content, extension = ".html";
      if (url === route) content = html;
      else {
        let target = path.resolve(site, `.${url}`);
        if (!target.startsWith(site + path.sep) && target !== site) throw new Error("Invalid path");
        if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
        target = fs.realpathSync(target);
        if (!target.startsWith(site + path.sep)) throw new Error("Invalid path");
        content = fs.readFileSync(target);
        extension = path.extname(target);
      }
      res.setHeader("Content-Type", types[extension] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      res.end(req.method === "HEAD" ? undefined : content);
    } catch { res.writeHead(404).end("Not found"); }
  });
}

function run(kind, args = process.argv.slice(2)) {
  configuration(kind);
  const publication = require(kind === "weekly" ? "./weekly" : "./daily");
  const [command, id, ...flags] = args;
  const commands = kind === "weekly" ? "init|draft|preview|finalize" : "init|preview|finalize";
  const usage = `用法：${kind} ${commands} YYYY-MM-DD\npreview 可加 --no-serve；finalize${kind === "weekly" ? " / draft" : ""} 可加 --replace。`;
  if (args.includes("--help") || args.includes("-h")) { console.log(usage); return; }
  if (!commands.split("|").includes(command) || !id ||
    flags.some((flag) => flag !== (command === "preview" ? "--no-serve" : "--replace")) ||
    (flags.length && !["preview", "finalize", "draft"].includes(command)) || new Set(flags).size !== flags.length)
    throw new Error(usage);
  if (command === "init") {
    const dir = publication.init(publication.ROOT, id);
    console.log(`草稿：${path.join(dir, "draft.md")}\n填写你整理好的正文，再运行 ${kind}:preview。`);
  }
  if (command === "draft") {
    const { draft } = require("./draft");
    const result = draft(publication.ROOT, id, flags.includes("--replace"));
    console.log(`${result.path}\n栏目：${result.columns.join("、")}；删除完全重复条目：${result.removed}。请审阅内容，再运行 weekly:preview。`);
  }
  if (command === "finalize") console.log(publication.finalize(publication.ROOT, id, flags.includes("--replace")));
  if (command === "preview") {
    const html = publication.preview(publication.ROOT, id);
    const file = path.join(publication.ROOT, ".local", publication.directory, id, "preview.html");
    execFileSync(process.execPath, [path.join(publication.ROOT, "generate-index.js")], { stdio: "inherit" });
    console.log(`预览文件：${file}`);
    if (flags.includes("--no-serve")) return;
    const route = `/${publication.directory}/${id}.html`;
    const server = createPreviewServer({ siteRoot: path.join(publication.ROOT, "dist"), route, html });
    server.once("error", (error) => { console.error(error.message); process.exitCode = 1; });
    server.listen(0, "127.0.0.1", () => console.log(`预览：http://127.0.0.1:${server.address().port}${route}\n修改草稿后重新运行预览。按 Ctrl+C 停止。`));
    return server;
  }
}

module.exports = { run, createPreviewServer };
