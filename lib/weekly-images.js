const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function loadImage(source, imageRoot) {
  if (!imageRoot || !/^images\//.test(source)) {
    throw new Error(
      "周报图片请保存到本期 images/ 目录，并使用 images/文件名 引用",
    );
  }
  if (fs.lstatSync(imageRoot).isSymbolicLink())
    throw new Error("图片目录不能是符号链接");
  const root = fs.realpathSync(imageRoot);
  const target = fs.realpathSync(
    path.resolve(root, decodeURIComponent(source.slice(7))),
  );
  if (!target.startsWith(root + path.sep) || !fs.statSync(target).isFile()) {
    throw new Error("图片必须位于本期 images/ 目录内");
  }
  if (fs.statSync(target).size > 10 * 1024 * 1024)
    throw new Error("单张图片不能超过 10 MB");
  const data = fs.readFileSync(target);
  let mime;
  if (
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    mime = "image/png";
  else if (data[0] === 255 && data[1] === 216 && data[2] === 255)
    mime = "image/jpeg";
  else if (/^GIF8[79]a/.test(data.subarray(0, 6).toString()))
    mime = "image/gif";
  else if (
    data.subarray(0, 4).toString() === "RIFF" &&
    data.subarray(8, 12).toString() === "WEBP"
  )
    mime = "image/webp";
  else throw new Error("支持 PNG、JPEG、GIF 和 WebP 图片");
  return {
    src: source,
    hash: crypto.createHash("sha256").update(data).digest("hex"),
    uri: `data:${mime};base64,${data.toString("base64")}`,
  };
}
module.exports = { loadImage };
