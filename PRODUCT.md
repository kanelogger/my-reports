# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

站点维护者负责收集素材和审阅，读者为技术爱好者。

## Product Purpose

聚合个人报告、每日中文推特圈精选及每周技术简报，提供可持续阅读的静态归档。

## Operating Context

维护者编辑每周 Markdown 素材；Agent 结合日报核对来源并起草；维护者审阅本地预览后定稿，通过 Git 推送发布。周报按北京时间周一至周日归档。

## Capabilities and Constraints

Node.js 24 构建，GitHub Pages 发布 dist。素材与草稿在 Git 忽略的本地目录，需要自行备份。构建不调用模型、不抓取外网。现有日报和报告保留独立 HTML；周报采用 Markdown 编辑、自包含 HTML 发布。首版无在线账户、收藏、数据库或定时任务。

## Product Principles

- 每条精选解释内容及推荐理由，手选素材优先。
- 不把未核实的摘要当作事实，不编造亲身体验。
- 审阅版本和定稿保持一致。
- 仅发布明确允许公开的站点产物。
