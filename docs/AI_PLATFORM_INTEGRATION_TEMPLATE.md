# AI 平台接入范本

本范本只覆盖知几的 AI 能力接入。账户、订单、支付、payment attempt、支付结果和 entitlement 真相仍由 Consumer Platform 负责，本仓库不得复制这些职责。

## 统一合同

产品 manifest 位于 `config/ai-product-manifest.json`。每个 AI capability 必须声明 `plan_code`、usage unit、provider route、gate 要求和 token 计量策略。价格和余额不写入 manifest，运行时从平台目录与 usage API 获取。

请求生命周期固定为：

```text
fresh platform session -> gate -> reserve -> provider -> commit
                                      \-> failure -> release
```

`src/lib/platform/ai-contract.ts` 提供最小 adapter 范式，`src/lib/platform/ai-platform-adapter.ts` 将现有账户/游客平台 helper 适配到该合同。reserve 的不确定 POST 不自动重试；commit 通过 `settledCommit` 识别平台 terminal 409，避免重复扣费；provider 失败只释放当前 reservation，provider 已返回而 commit 不确定时绝不 release。

## Provider 与 token 计量

AI provider 只返回产品结果和可选 `AiUsage`：`inputTokens`、`outputTokens`、`totalTokens`。`readProviderUsage` 同时读取 OpenAI 兼容字段 `prompt_tokens`、`completion_tokens`、`total_tokens` 和 AI SDK 字段，并映射到审计事件的 `usage` 字段。token 数是审计信息，不是本地余额真相；余额和扣费结果只能使用平台返回值。当前 `/api/agent` 已支持 provider 调用和平台 usage 生命周期，但 token usage 尚未持久化到本地审计表，manifest 将其标记为 `provider_usage_when_available`。

## 幂等与重试

- `requestId` 贯穿一次 AI 请求、provider 调用和审计事件。
- reserve 不重试，避免网络不确定时产生重复 reservation。
- provider 可由调用方使用同一 `requestId` 做安全重试，但必须保持输入快照不变。
- commit 不对普通网络错误盲目重试；平台 terminal settled 结果由 `settledCommit` 收敛。
- release 是 best effort；失败必须进入审计/告警，不能吞掉原始 provider 错误。

## 验证命令

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/lib/platform/ai-contract.test.ts src/app/api/agent/route.test.ts --reporter=dot
npm run css:audit
npm run build
```

## 尚未闭合的 AI 计费缺口

- `/api/agent` 的流式 provider usage 尚未从 AI SDK `fullStream` 持久化到审计存储；目前只保留内存事件和平台 usage 结果。
- Agent 普通 route 尚未使用数据库级业务幂等记录；断线恢复依赖平台 reservation reconciliation。
- 真实生产环境的 provider token usage、reserve/commit/release 追踪仍需接入集中日志或指标系统。
