# SvYunAutoSign

速维云自动签到和抽奖工具。项目通过 GitHub Actions 定时运行，读取 GitHub Secrets 中的多账号配置，自动完成登录、签到、抽奖，并通过 Telegram 推送汇总结果。

## 功能特性

- 支持 GitHub Actions 定时触发和手动触发。
- 支持任意数量速维云账号。
- 使用 HTTP API 发包，不依赖浏览器自动化。
- 自动登录、签到、查询抽奖次数并执行抽奖。
- Telegram 汇总推送所有账号结果。
- 日志和通知默认脱敏账号、密码、Cookie 和 Token。
- 提供 100% 覆盖率门禁、并行检查 Action 和提交前格式化 hook。

## 环境要求

- Node.js >= 22
- pnpm

## GitHub Secrets 配置

### Telegram

在仓库 `Settings` → `Secrets and variables` → `Actions` → `Secrets` 中添加：

| Secret 名称          | 说明               |
| -------------------- | ------------------ |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token |
| `TELEGRAM_CHAT_ID`   | 接收通知的 Chat ID |

### 速维云多账号

账号使用同后缀三元组配置：

```text
SVYUN_DISPLAYNAME_<ID>
SVYUN_USERNAME_<ID>
SVYUN_PASSWORD_<ID>
```

其中 `<ID>` 可自由定义，推荐使用大写字母、数字和下划线，例如 `MAIN`、`ALT_01`、`TOMYJAN`。

示例：

```text
SVYUN_DISPLAYNAME_MAIN=主号
SVYUN_USERNAME_MAIN=user1@example.com
SVYUN_PASSWORD_MAIN=password1

SVYUN_DISPLAYNAME_ALT_01=小号
SVYUN_USERNAME_ALT_01=user2@example.com
SVYUN_PASSWORD_ALT_01=password2
```

说明：

- `SVYUN_USERNAME_<ID>` 和 `SVYUN_PASSWORD_<ID>` 必须成对出现。
- `SVYUN_DISPLAYNAME_<ID>` 可选，用于 Telegram 展示。
- 支持任意数量账号。
- `<ID>` 只用于匹配配置，不会发送给速维云。

## GitHub Actions 使用

项目内置两个工作流：

- [auto-sign.yml](.github/workflows/auto-sign.yml)：定时运行签到和抽奖。
- [check-code.yml](.github/workflows/check-code.yml)：并行执行格式检查、Lint、类型检查、测试和构建。

默认业务工作流每天北京时间约 08:15 运行，也可以在 Actions 页面手动点击 `Run workflow`。

新增账号时，只需要在 GitHub Secrets 中新增一组三元组。workflow 会自动导出所有匹配 `SVYUN_DISPLAYNAME_<ID>`、`SVYUN_USERNAME_<ID>`、`SVYUN_PASSWORD_<ID>` 的 Secrets，不需要修改 [auto-sign.yml](.github/workflows/auto-sign.yml)。

## 本地运行

```powershell
pnpm install

$env:SVYUN_DISPLAYNAME_MAIN = "主号"
$env:SVYUN_USERNAME_MAIN = "你的速维云账号"
$env:SVYUN_PASSWORD_MAIN = "你的速维云密码"
$env:TELEGRAM_BOT_TOKEN = "你的 Telegram Bot Token"
$env:TELEGRAM_CHAT_ID = "你的 Telegram Chat ID"

pnpm dev
```

## 开发命令

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

提交前会自动运行 `lint-staged`，对暂存文件执行 Prettier 和 ESLint 修复。

## 抽奖说明

项目会先查询可用抽奖次数：

- 有可用次数：执行抽奖。
- 无可用次数：记录为「已跳过」，不视为失败。

如果速维云后续调整抽奖规则，例如抽奖会消耗积分或需要额外确认，请先关闭工作流或修改代码后再运行。

## 常见问题

### 登录失败怎么办？

请检查：

- Secret 名称是否和 workflow `env` 中的后缀一致。
- 账号和密码是否正确。
- 速维云是否出现验证码、安全验证或风控。

### 为什么不用浏览器自动化？

当前速维云页面的登录、签到和抽奖都能通过 HTTP API 复现。直接发包更轻量，适合 GitHub Actions 定时任务。

### 如果速维云接口变了怎么办？

速维云相关代码集中在 [src/providers/svyun/](src/providers/svyun/)。接口变化时优先修改这里，不要把接口细节扩散到 core 或 app 层。

### Telegram 推送失败怎么办？

请确认 Bot Token 和 Chat ID 正确，并确认 Bot 有权限给目标会话发消息。

## 许可证

本项目使用 [MPL-2.0](LICENSE) 许可证。
