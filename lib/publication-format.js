const crypto = require("node:crypto");

const TYPES = {
  daily: { directory: "digests", label: "日报", title: "今日中文推特圈精选" },
  weekly: { directory: "weeklies", label: "周报", title: "本周简报" },
};

function configuration(kind) {
  if (!Object.hasOwn(TYPES, kind)) throw new Error("刊物类型必须是 daily 或 weekly");
  return TYPES[kind];
}

function dateInfo(id, kind) {
  configuration(kind);
  if (typeof id !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(id))
    throw new Error(kind === "weekly" ? "请使用周日日期 YYYY-MM-DD" : "请使用日期 YYYY-MM-DD");
  const end = new Date(`${id}T12:00:00Z`);
  if (!Number.isFinite(+end) || end.toISOString().slice(0, 10) !== id)
    throw new Error("日期必须是真实日期");
  if (kind === "weekly" && end.getUTCDay() !== 0)
    throw new Error("日期必须是真实的周日");
  const start = new Date(end);
  if (kind === "weekly") start.setUTCDate(start.getUTCDate() - 6);
  const thursday = new Date(end);
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const weekYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1, 12));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return {
    id,
    range: kind === "weekly" ? `${start.toISOString().slice(0, 10)} — ${id}` : id,
    folio: kind === "weekly" ? String(week).padStart(2, "0") : id.slice(-2),
    caption: kind === "weekly" ? `${weekYear} / 第 ${week} 周` : `${id.slice(0, 4)} / ${id.slice(5, 7)} 月`,
  };
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const COLORS = ["red", "blue", "green", "gold"];
const SECTION_COLORS = new Map([
  ...["今日主线", "主线", "今日要点", "本周导读", "本周精选"].map((x) => [x, "red"]),
  ...["人物精选", "人物", "好文章", "文章", "深度阅读"].map((x) => [x, "blue"]),
  ...["小工具", "工具与项目", "开源项目", "项目", "工具", "好工具"].map((x) => [x, "green"]),
  ...["AI资讯", "一周动态", "本周动态", "动态", "资讯"].map((x) => [x, "gold"]),
]);

function sectionColor(title, index) {
  return SECTION_COLORS.get(title.replace(/\s/g, "")) || COLORS[index % COLORS.length];
}

const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
module.exports = { configuration, dateInfo, escape, sectionColor, hash };
