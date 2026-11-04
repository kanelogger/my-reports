const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const weekly = require("../lib/weekly");
const [command, id, ...flags] = process.argv.slice(2);
try {
  if (
    !["init", "preview", "finalize"].includes(command) ||
    flags.some((f) => f !== "--replace") ||
    (flags.length && command !== "finalize")
  )
    throw new Error(
      "用法：weekly init|preview|finalize YYYY-MM-DD [--replace]",
    );
  if (command === "init") console.log(weekly.init(weekly.ROOT, id));
  if (command === "finalize")
    console.log(weekly.finalize(weekly.ROOT, id, flags.includes("--replace")));
  if (command === "preview") {
    const html = weekly.preview(weekly.ROOT, id);
    execFileSync(
      process.execPath,
      [path.join(weekly.ROOT, "generate-index.js")],
      { stdio: "inherit" },
    );
    const site = path.join(weekly.ROOT, "dist");
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const server = http.createServer((req, res) => {
      try {
        if (!["GET", "HEAD"].includes(req.method)) {
          res.writeHead(405).end();
          return;
        }
        const url = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        );
        let content;
        if (url === `/weeklies/${id}.html`) {
          content = html;
          res.setHeader("Content-Type", types[".html"]);
        } else {
          let target = path.resolve(site, `.${url}`);
          if (!target.startsWith(site + path.sep) && target !== site)
            throw new Error("Invalid path");
          if (fs.statSync(target).isDirectory())
            target = path.join(target, "index.html");
          content = fs.readFileSync(target);
          res.setHeader(
            "Content-Type",
            types[path.extname(target)] || "application/octet-stream",
          );
        }
        res.setHeader("Cache-Control", "no-store");
        res.end(req.method === "HEAD" ? undefined : content);
      } catch {
        res.writeHead(404).end("Not found");
      }
    });
    server.listen(0, "127.0.0.1", () =>
      console.log(
        `预览：http://127.0.0.1:${server.address().port}/weeklies/${id}.html\n修改草稿后重新运行预览。按 Ctrl+C 停止。`,
      ),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
