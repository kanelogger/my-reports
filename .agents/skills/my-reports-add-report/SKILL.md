---
name: my-reports-add-report
description: >-
  Use when adding a single-page or multi-page HTML report under reports/ in
  kanelogger/my-reports and publishing it; not for daily or weekly digests.
---
# my-reports 添加报告

目标仓库：`kanelogger/my-reports`。本技能只处理 `reports/` 下的独立报告，不处理日报（`digests/`）或周报（`weeklies/`）。先读该仓库 `AGENTS.md`「如何添加新报告」。

## 放法

### 单页报告

把自包含 `.html` 放进 `reports/`，建议文件名带日期或清晰标题，例如：

`reports/2026XX-报告标题.html`

索引链接标题默认取去掉 `.html` 后的文件名。页面用中文（`zh-CN`），含 `<meta charset="utf-8">`。

### 多页报告

在 `reports/` 下建子目录，**必须**有入口 `index.html`（建议含 `<title>`）：

```text
reports/my-report/
├── index.html
├── page2.html
└── assets/
```

索引显示名优先级：`generate-index.js` 里的 `titleAliases[目录名]` → `index.html` 的 `<title>` → 目录名。需要自定义显示名时，在同一次改动里改 `titleAliases`。

### 排除目录

共享资源等不进索引的目录，加到 `generate-index.js` 的 `excludedDirs`（已有 `assets`、`shared`、`lib`）。以 `.` 或 `_` 开头的路径会被忽略。

## 构建与发布

1. `npm ci`（若依赖未装），再 `npm run build`（或 `node generate-index.js`）。
2. 确认生成的根 `index.html` 出现该报告；不要手改三个索引文件。
3. 经 CloudAgent 开 PR：只提交本次报告相关文件（及必要时的 `titleAliases`／`excludedDirs` 改动）。squash 合并到 `main`／`master` 后 Pages 会部署。

报告日期：文件名或标题里的日期优先；都没有时沿用已生成索引里的旧日期，避免 CI 刷新 birthtime 把旧报告改到构建当天。

## 不要做的事

- 手改根 `index.html`、`digests/index.html`、`weeklies/index.html`
- 动 `.sisyphus/` 或未要求的 `.github/workflows/`
- 把日报／周报误放进 `reports/`
- 覆盖用户已有报告内容，除非明确要求修订
