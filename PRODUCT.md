# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

站点维护者负责收集素材和审阅，读者为技术爱好者。

## Product Purpose

聚合个人报告、每日中文推特圈精选及每周技术简报，提供可持续阅读的静态归档。

## Operating Context

维护者负责收集、筛选、整理日报与周报的 Markdown 正文。脚本使用已确认的 A 模板渲染、预览和定稿；维护者确认本期内容后定稿，通过 Git 推送发布。日报使用当天日期，周报使用北京时间周一至周日的周日日期。旧周报整理命令作为按需使用的辅助工具保留。

## Capabilities and Constraints

Node.js 24 构建，GitHub Pages 发布 dist。素材与草稿在 Git 忽略的本地目录，需要自行备份。构建不调用模型、不抓取外网。新日报与周报采用 Markdown 编辑、统一模板生成自包含 HTML；历史日报和独立报告保留原文件。首版无在线账户、收藏、数据库或定时任务。

## Product Principles

- 手选素材优先，Agent 仅删除、重排、加标题，保留采用正文的原文。
- 来源核对由维护者自行处理，不纳入周报流程；Agent 不补写摘要、导读、推荐理由或亲身体验。
- 审阅版本和定稿保持一致。
- 仅发布明确允许公开的站点产物。
