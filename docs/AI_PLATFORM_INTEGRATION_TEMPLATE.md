# AI 平台接入范本

本范本只覆盖知几的 AI 能力接入。账户、订单、支付、payment attempt、支付结果和 entitlement 真相仍由 Consumer Platform 负责，本仓库不得复制这些职责。

## 统一合同

产品 manifest 位于 `config/ai-product-manifest.json`。每个 AI capability 必须声明 `plan_code`、usage unit、provider route、gate 要求和 token 计量策略。价格和余额不写入 manifest，运行时从平台目录与 usage API 获取。

请求生命周期固定为：

```text
fresh platform session -> gate -> reserve -> provider -> commit
                                      \-> failure -> release
```

`src/lib/platform/ai-contract.ts` 提供最小 adapter 范式，`src/lib/platform/ai-platform-adapter.ts` 将账户/游客平台用量和服务端 token-usage 上报适配到该合同。reserve 的不确定 POST 不自动重试；commit 通过 `settledCommit` 识别平台 terminal 409，避免重复扣费；provider 失败只释放当前 reservation，provider 已返回而 commit 不确定时绝不 release。

## Provider 与 token 计量

AI provider 只返回产品结果和可选 `AiUsage`：`inputTokens`、`outputTokens`、`cachedInputTokens`、`totalTokens`。`readProviderUsage` 同时读取 OpenAI 兼容字段和 AI SDK 字段。`/api/agent` 在成功结算后使用服务端 `PLATFORM_PRODUCT_SERVICE_SECRET` 调用平台 `token-usage`，以请求级幂等键上报 provider、model 和 token 数。token 数和 points 由平台保存；产品不计算价格、不扣本地余额。

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

## 当前边界

- 流式 provider usage 在 AI SDK `onFinish` 取得，并在 reservation 成功结算后上报平台；上报失败不释放已交付结果，平台 reconciliation 负责继续收敛。
- Agent route 的业务幂等由平台 reservation 与 token-usage 幂等键共同承担；产品不复制订单或余额真相。
- 生产部署必须注入 `PLATFORM_PRODUCT_SERVICE_SECRET`。缺失时 token-usage 上报返回 `platform_product_service_secret_missing`，发布 readiness 应阻断；本地无密钥测试只验证保守结果，不宣称已完成生产计费。
