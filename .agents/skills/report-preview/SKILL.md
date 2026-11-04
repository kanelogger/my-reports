---
name: report-preview
description: >-
  Generate and inspect local previews of existing reports, daily digests, or
  weekly briefs in kanelogger/my-reports. Use to review layout or draft revisions;
  finalization, commits, and deployment belong to report-publish.
---
# 预览与检查

先读仓库 `AGENTS.md` 和 `README.md`「四个功能 Skill」；预览日报／周报时再读「日报与周报」。按报告入口或本期草稿预览，不采集资料或自行改写正文。

## 生成预览

- **报告**：先运行 `npm run build`，通过本机静态服务打开 `dist/` 中的报告入口。服务仅监听本机地址。多页报告从入口进入子页，确认导入后页面仍保留原样式。
- **日报**：运行 `npm run daily:preview -- YYYY-MM-DD`，使用 `.local/digests/YYYY-MM-DD/draft.md` 生成预览。
- **周报**：运行 `npm run weekly:preview -- YYYY-MM-DD`，使用 `.local/weeklies/YYYY-MM-DD/draft.md` 生成预览。

日报／周报命令输出本机地址；只需预览文件时加 `--no-serve`，交付同一工作目录中的 `preview.html`。需要打开文件检查时使用可用浏览器能力。正式模板沿用 DESIGN.md 第 10 节和 `lib/publication*`，不从历史 HTML 或设计 Demo 拼装。

## 检查与交付

1. 打开页面，检查桌面和窄屏下的标题、栏目顺序、正文、图片、表格、代码及长链接，确认内容可读、无截断。检查目录、页面内导航、报告子页面及本地资源。来源事实核对由用户负责，不把外部链接可访问性等同于事实核验。
2. 报告构建后核对三个索引与入口链接，并检查历史资源仍在、私人素材未打包；日报／周报预览核对草稿与页面内容对应。无法完成浏览器或某项检查时明确报告缺口，不声称检查通过。
3. 交付预览地址或文件、类型、日期、草稿／入口路径及检查结果。周报提醒用户审阅确认该版本；只要求预览时在此结束，不执行 finalize、提交或推送。
4. 修改内容时返回 `report-organize` 或按用户明确指示修订，再重新预览。草稿、图片或模板变化后，原确认不适用于新版本；周报需用户重新查看并确认。

仅检查预览的自动化授权不会代替用户对周报的审阅。供用户审阅的服务保持到审阅结束；任务内仅用于检查的临时服务在检查完毕后停止，不影响已有服务。后续发布由 `report-publish` 完成。
