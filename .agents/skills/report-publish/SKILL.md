---
name: report-publish
description: >-
  Finalize and publish existing reports, daily digests, or weekly briefs in
  kanelogger/my-reports, including build, scoped Git delivery, and deployment
  verification. Use for finalization or publication; weekly release requires
  user confirmation of the latest preview.
---
# 定稿与发布

先读仓库 `AGENTS.md` 和 `README.md`「四个功能 Skill」「预览、修订与发布」；发布日报／周报时再读完整的「日报与周报」。本技能接收已有报告或草稿，不采集资料或整理正文。

## 确定版本与授权

1. 确定类型、日期、报告入口或草稿路径，并检查 Git 工作区、当前分支、远端及上游。只要求本地定稿时完成定稿与构建即可；提交和推送按用户本次授权执行。请求导入、整理或预览本身不包含发布授权。
2. 报告与日报没有当前预览时，先调用 `report-preview`。日报明确授权“直接发布”时，Agent 生成并检查预览即可继续，无需重复询问。报告按授权使用已检查的版本发布。
3. **周报必须有用户查看并确认最新预览的依据**。事前的“直接发布”不能代替审阅；只有自动化检查结果时，先交付预览，等待用户确认。最新预览已确认且用户要求发布时，直接继续。草稿、图片或模板变化后重新预览并由用户确认，不能沿用旧确认。

## 定稿与构建

4. 日报执行 `npm run daily:finalize -- YYYY-MM-DD`，周报执行 `npm run weekly:finalize -- YYYY-MM-DD`，输出分别为 `digests/YYYY-MM-DD.html` 和 `weeklies/YYYY-MM-DD.html`。以本期 `.local/` 下的 `draft.md` 为唯一正文来源，保留预览校验记录；检查正式文件与最后审阅的 `preview.html` 完全一致。草稿、图片或模板不一致时返回预览步骤，不修改校验记录绕过检查。
5. 已有同日／同周正式文件时，先确认本次授权包含替换，再加 `--replace`；旧式 `YYYYMMDD.html` 日报也受保护。报告沿用导入后的文件，不重写正文或套用刊物模板；已有正式 HTML 且不涉及重新生成时直接验证该文件。
6. 运行 `npm run build`，检查三个生成索引中的日期、标题、分类与链接，确认本期文件及所需历史资源存在于 `dist/`。检查 `.local/`、草稿、预览、设计 Demo 和技能文件未进入发布包。不手改索引，不提交 `dist/`。

## 提交、上线与核对

7. 审阅差异，按明确路径只提交本次正式 HTML、报告资源及必要的索引配置改动。正式 HTML 是项目交付物，需要提交；三个生成索引可按仓库约定随同提交，无需为发布单独手改。保留无关修改，避免将其他期次或私人素材混入提交。替换正式内容时再次核对版本与授权。
8. 按当前分支和本次授权完成 Git 交付：`main`／`master` 推送触发 Pages；功能分支按请求走 PR，合并需有相应授权。沿用已有远端与流程，不强制依赖 CloudAgent，不自行切换分支、强推或合并。分支／发布目标无法确定时先完成本地校验并请求缺失信息；已有明确授权无需再次确认。
9. 核对对应提交的 GitHub Actions 部署结果和线上入口，确认本期内容与归档可访问。推送功能分支、只创建 PR、部署失败或无法访问部署状态时，明确当前阶段与缺口，不能声称已上线。停止本次检查启动且已不再用于用户审阅的临时服务。

## 完成边界

交付类型、日期、正式文件、预览一致性与构建检查结果；若进行了 Git 或线上操作，附提交、分支／PR、部署结果及线上链接。明确区分本地定稿、已提交、已推送、待合并与已验证上线。
