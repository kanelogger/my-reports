---
name: my-reports-weekly
description: >-
  Use when generating or revising a weekly brief in kanelogger/my-reports with
  weekly:init / preview / finalize, or publishing weeklies/YYYY-MM-DD.html.
  Draft staging (.local materials then draft.md) is required before publish.
---
# my-reports 周报

目标仓库：`kanelogger/my-reports`。生成前先读该仓库 `README.md`「日报与周报」与 `AGENTS.md`「日报与周报生成」。正式样式以 `DESIGN.md` 第 10 节与 `lib/publication*` 为准；不要从历史 HTML 拼模板，不要手改索引。

## 日期

用该周**周日**的北京时间日期，格式 `YYYY-MM-DD`（例：`2026-11-08`）。页面上的区间按周一至周日显示。

## 草稿区（必做）

周报**必须先落草稿区，再基于草稿整理发布**，不要直接写正式 HTML，也不要跳过 `.local/` 直接 finalize。

工作目录：`.local/weeklies/YYYY-MM-DD/`（Git 忽略，需自行备份）。

1. `npm run weekly:init -- YYYY-MM-DD`（已有工作目录会保留，不会清空草稿）。
2. **留出并维护草稿区**：
   - 收集阶段：把原文、链接、摘录堆进同目录的 `materials.md`（或按栏目分文件），只粘贴、标注来源，不急着定版式。
   - 整理阶段：再变成可发布的 `draft.md`。若材料在 `materials.md`，可调用 `npm run weekly:draft -- YYYY-MM-DD`（合并同名栏目、去掉完全重复条目；不改写、不概括、不补写正文）。人工已编过的 `draft.md` 受覆盖保护；重跑整理需 `--replace`，并先备份旧稿。
   - 已有完整、审过的 `draft.md` 时，不必再跑 `weekly:draft`，但仍以该草稿为唯一正文来源。
3. 图片放同目录 `images/`，远程图先下到本地；`draft.md` 用 `![说明](images/文件名.png)` 引用。

发布前确认：本期可读内容都在草稿区的 `draft.md`（及 `images/`）里，而不是聊天记录或临时笔记。

## 预览与定稿

4. 预览：`npm run weekly:preview -- YYYY-MM-DD`（可加 `--no-serve`）。打开本机地址核对；改稿只改草稿区，再预览。
5. 定稿：`npm run weekly:finalize -- YYYY-MM-DD`，再 `npm run build`。正式文件是 `weeklies/YYYY-MM-DD.html`。覆盖同日已定稿期次时加 `--replace`。
6. 发布：只把 `weeklies/YYYY-MM-DD.html` 经 CloudAgent 开 PR，squash 合并到 `main`／`master`。不要提交 `.local/`，不要手改 `weeklies/index.html`。

## draft.md 结构

```markdown
# 本周简报

## 好文章

### 原文标题

整理好的正文，保留原有数字与限定条件。

[原文](https://example.com/article)

## 工具与项目

### 项目名称

整理好的项目介绍。

## 一周动态

本期动态原文。
```

栏目按内容决定，空栏目自动隐藏。颜色匹配：本周导读／本周精选→赭红；好文章／深度阅读→靛蓝；工具与项目／开源项目→松绿；一周动态／资讯→赭金。

正文保留措辞、数字、链接；用户未要求协助整理时，不要改写、概括或补写。来源核对由用户处理，不是定稿前置条件。

## 确认规则

- 默认：基于草稿 preview 后，等人确认再 finalize。
- 用户已明确说「直接定稿／直接发」时，可跳过确认，但仍须从草稿区的 `draft.md` 定稿。

## 不要做的事

- 跳过草稿区，直接拼正式 HTML 或从聊天一次性定稿
- 手改三个索引或从旧 HTML／设计 Demo 拼模板
- 提交 `.local/` 或无关文件
- 同一 PR 混入日报或其他周次
