---
name: report-import
description: >-
  Import existing HTML reports, report directories, or user-collected daily and
  weekly materials into kanelogger/my-reports. Use for importing files or drafts;
  content organization, preview, and publication are separate functions.
---
# 导入报告与素材

在 `kanelogger/my-reports` 仓库执行。先读 `AGENTS.md` 和 `README.md`「四个功能 Skill」；导入日报／周报时再读「日报与周报」。采集由用户完成，本技能接收已有文件、文本或聊天中提供的素材。

## 导入

1. 从请求确定类型、源文件与目标日期／名称。日期用北京时间：日报用指定日期（“今天”用当天），周报用所属周的周日，格式为 `YYYY-MM-DD`。检查目标是否已有人工内容；首次初始化生成的空模板可填写，已有稿件先比较差异，按用户授权保留、另存或覆盖。
2. 按输入选择落点：
   - **单页报告**：自包含 HTML 放入 `reports/`，文件名带清晰标题，建议带日期。有独立资源时，将页面和资源一起放入子目录，以 `index.html` 为入口。
   - **多页报告**：整体复制到 `reports/<目录>/`，入口为 `index.html`，包含 `<title>`、`<meta charset="utf-8">` 和 `lang="zh-CN"`。保留内容与设计；确需调整入口名或路径时同步修复相对引用。标题、日期、别名及排除目录规则见 `AGENTS.md`「如何添加新报告」和「核心逻辑」。
   - **日报／周报素材**：执行 `npm run daily:init -- YYYY-MM-DD` 或 `npm run weekly:init -- YYYY-MM-DD`。把原始资料放入本期 `.local/digests/YYYY-MM-DD/` 或 `.local/weeklies/YYYY-MM-DD/` 的 `materials.md` 或原文件中。已完成的 Markdown 可直接导入 `draft.md`；未整理素材保留原貌，交给 `report-organize` 处理。
3. 日报／周报图片放在同一工作目录的 `images/`，草稿引用 `images/文件名`；格式和大小限制见 README。复制用户提供的本地图片，或保存素材中明确引用的远程图片，保留对应关系。
4. 检查导入后的入口、文件名大小写、图片及本地链接是否能在目标目录解析。报告保留源文件，复制实际资源，不导入符号链接。仅修复导入产生的路径变化，不改正文或替换设计；缺失资源明确列出，不凭空补齐。

## 完成边界

交付类型、日期、源与目标路径、报告入口或素材／草稿路径，以及重名处理和缺失资源情况。此时只完成导入；后续按本次请求调用 `report-organize`、`report-preview` 或 `report-publish`。未要求后续功能时结束，不定稿、提交或推送。
