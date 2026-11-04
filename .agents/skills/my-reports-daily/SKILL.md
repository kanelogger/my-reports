---
name: my-reports-daily
description: >-
  Use when generating or revising a daily digest in kanelogger/my-reports with
  daily:init / preview / finalize, or publishing digests/YYYY-MM-DD.html.
---
# my-reports 日报

目标仓库：`kanelogger/my-reports`。生成前先读该仓库 `README.md`「日报与周报」与 `AGENTS.md`「日报与周报生成」。正式样式以 `DESIGN.md` 第 10 节与 `lib/publication*` 为准；不要用旧版 `render_digest.py`，不要从历史 HTML 拼模板，不要手改 `index.html`／`digests/index.html`。

## 日期

用北京时间当天日期，格式 `YYYY-MM-DD`（例：`2026-11-05`）。

## 步骤

1. 在仓库根目录执行：`npm run daily:init -- YYYY-MM-DD`（已有工作目录会保留，不会清空）。
2. 编辑 `.local/digests/YYYY-MM-DD/draft.md`。图片放同目录 `images/`，用 `![说明](images/文件名.png)`；远程图先下到本地。单图 ≤10MB，支持 PNG／JPEG／GIF／WebP。
3. 预览：`npm run daily:preview -- YYYY-MM-DD`（只要文件不要服务时加 `--no-serve`）。打开输出的本机地址核对正文与排版。
4. 定稿：`npm run daily:finalize -- YYYY-MM-DD`，再 `npm run build`。正式文件是 `digests/YYYY-MM-DD.html`。覆盖同日已定稿期次时加 `--replace`。
5. 发布：只把 `digests/YYYY-MM-DD.html` 经 CloudAgent 开 PR，squash 合并到 `main`／`master`。Pages 构建会更新索引；不要手改索引，不要把 `.local/` 提交进仓库。定稿与构建本身不提交。

## draft.md 结构

- 一级标题：本期名（如「今日中文推特圈精选」）
- 二级：栏目（常见：今日主线、人物精选／人物、小工具、AI 资讯）
- 三级：人物名或单条标题

空栏目会自动隐藏。章节颜色按名称匹配：今日主线→赭红；人物／好文章→靛蓝；小工具／工具与项目→松绿；AI 资讯／动态→赭金。自定义栏目按顺序轮换四色。

正文保留已整理好的措辞、数字、链接和限定条件；不要改写、概括或补写导读。链接必须真实。

## 确认规则

- 交互修订：先 preview，等人确认后再 finalize。
- 若用户或例行任务已明确授权「直接定稿／直接发」，收集写完 draft 后可直接 finalize，不必再问。

## 不要做的事

- 手改三个索引或从旧 HTML 拼模板
- 提交 `.local/`、设计 Demo、或无关文件
- 同一 PR 混入报告或其他日期的日报
