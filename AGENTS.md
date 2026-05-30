# AGENTS.md

本文件给 AI 代理和维护者使用，说明项目约束和开发规范。

## 项目概述

这是一个速维云自动签到和抽奖项目，使用 GitHub Actions 定时运行。项目从环境变量读取多账号配置，逐个账号执行登录、签到和抽奖，最后通过 Telegram 推送汇总结果。

## 技术栈

- Node.js >= 22
- pnpm
- TypeScript / ESM
- Vitest + V8 coverage
- got + tough-cookie
- telegraf
- zod
- ESLint + Prettier
- simple-git-hooks + lint-staged

## 必须遵守

- 必须使用 pnpm，不要引入 npm、yarn 或 bun lockfile。
- 提交前必须运行 `pnpm check`。
- 测试覆盖率必须保持 100%。
- 禁止提交真实账号、密码、Cookie、JWT、Telegram Token 或其他敏感信息。
- 抓包内容只能保留接口路径、字段结构和状态判断，不要保存真实请求凭据。
- 速维云 API 代码只能集中在 [src/providers/svyun/](src/providers/svyun/)。
- core 层不能 import `got`、`telegraf` 或任何具体外部 provider。
- 新增通知渠道时，实现 `NotificationProvider`，不要改 core workflow。
- 多账号执行必须保持串行，避免并发触发站点风控。

## 目录职责

- [src/core/](src/core/)：领域类型、任务结果、多账号 workflow、通知接口。
- [src/infra/](src/infra/)：配置、日志、脱敏等基础设施。
- [src/providers/svyun/](src/providers/svyun/)：速维云 HTTP API、响应映射和账号任务 runner。
- [src/providers/telegram/](src/providers/telegram/)：Telegram 通知实现和消息格式化。
- [src/app/](src/app/)：依赖组装和顶层运行逻辑。
- [tests/](tests/)：单元测试，必须覆盖新增行为。

## TDD 要求

新增功能或行为变更必须先写测试：

1. 写失败测试。
2. 运行测试确认失败原因正确。
3. 写最少实现让测试通过。
4. 运行相关测试和类型检查。
5. 必要时重构，并保持测试通过。

## API 维护说明

当前已确认的速维云接口：

- 登录：`POST /console/v1/login`
- 签到信息：`GET /console/v1/daily_checkin/info`
- 执行签到：`POST /console/v1/daily_checkin/checkin`
- 抽奖活动列表：`GET /console/v1/lucky_draw/activity/list`
- 抽奖次数：`GET /console/v1/lucky_draw/getDrawTimesInfo?activity_id=<id>`
- 执行抽奖：`POST /console/v1/lucky_draw/draw`

登录密码需要复现前端 AES-CBC 加密：

- key：`idcsmart.finance`
- iv：`9311019310287172`
- padding：PKCS#7
- 输出：Base64

如果接口变化，只修改 [src/providers/svyun/](src/providers/svyun/) 及对应测试。
