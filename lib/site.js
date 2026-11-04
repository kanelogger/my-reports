const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
function copyTree(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink())
    throw new Error(`发布目录不允许符号链接：${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      copyTree(path.join(source, name), path.join(destination, name));
    }
  } else if (stat.isFile()) fs.copyFileSync(source, destination);
}
function packageSite(root = ROOT) {
  const output = path.join(root, "dist");
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.copyFileSync(
    path.join(root, "index.html"),
    path.join(output, "index.html"),
  );
  if (fs.existsSync(path.join(root, "reports")))
    copyTree(path.join(root, "reports"), path.join(output, "reports"));
  for (const dir of ["digests", "weeklies"]) {
    const source = path.join(root, dir);
    fs.mkdirSync(path.join(output, dir), { recursive: true });
    if (!fs.existsSync(source)) continue;
    for (const name of fs.readdirSync(source)) {
      if (
        name === "index.html" ||
        /^20\d{2}-\d{2}-\d{2}\.html$/.test(name) ||
        (dir === "digests" && /^20\d{6}\.html$/.test(name))
      ) {
        const candidate = path.join(source, name);
        const stat = fs.lstatSync(candidate);
        if (stat.isSymbolicLink())
          throw new Error(`发布目录不允许符号链接：${candidate}`);
        if (stat.isFile()) copyTree(candidate, path.join(output, dir, name));
      }
    }
  }
  return output;
}
module.exports = { packageSite };
