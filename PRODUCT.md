# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

站点维护者负责收集素材和审阅，读者为技术爱好者。

## Product Purpose

聚合个人报告、每日中文推特圈精选及每周技术简报，提供可持续阅读的静态归档。

## Operating Context

维护者编辑每周 Markdown 素材；Agent 仅协助去重和组织栏目；整理、预览、定稿通过脚本完成，内容细节由维护者自行编辑；维护者审阅本地预览后定稿，通过 Git 推送发布。周报按北京时间周一至周日归档。

## Capabilities and Constraints

Node.js 24 构建，GitHub Pages 发布 dist。素材与草稿在 Git 忽略的本地目录，需要自行备份。构建不调用模型、不抓取外网。现有日报和报告保留独立 HTML；周报采用 Markdown 编辑、自包含 HTML 发布。首版无在线账户、收藏、数据库或定时任务。

## Product Principles

- 手选素材优先，Agent 仅删除、重排、加标题，保留采用正文的原文。
- 来源核对由维护者自行处理，不纳入周报流程；Agent 不补写摘要、导读、推荐理由或亲身体验。
- 审阅版本和定稿保持一致。
- 仅发布明确允许公开的站点产物。
