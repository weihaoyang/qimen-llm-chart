# 知几平台接入合同

## 唯一产品身份

| 项目 | 值 |
| --- | --- |
| 平台 API | `https://platform.singseq.com` |
| `product_code` | `qimen` |
| OAuth scopes | `account.read usage.write` |
| Agent 用量指标 | `analysis_turn` |
| K 线用量指标 | `kline_report` |
| SDK | `@singseq/platform-sdk`，固定到 commit `8ba59cdc762602a34930101f6443bc6f9c2cdcbd` |

权威产品坐标在 `singseq.product.json` 和 `config/ai-product-manifest.json`。两者必须保持一致。

## 接口所有权

- 产品内所有平台 HTTP 请求通过 `@singseq/platform-sdk` 创建的客户端；禁止引入第二个 SDK、旧 CLI 或手写平行平台客户端。
- OAuth 使用平台授权码和 PKCE。产品回调负责校验 state 并恢复会话；HttpOnly cookie 仅是产品会话的安全传输方式。
- 账户和用量读取使用 `/api/v1/account/me`、`/api/v1/usage/balance`。
- AI 用量使用 `/api/v1/usage/reservations` 创建预留，并通过同一 reservation 的 `consume` 或 `release` 结束。
- 订单、支付、退款和账户权益以平台账单 API 为准；产品不能凭浏览器回跳本地授予权限。

## AI 结算顺序

```text
platform Bearer → reserve（原子授权） → provider → consume
                                                   └→ provider failure: release
```

余额读取仅供展示，不能代替预留授权。产品不维护套餐编号、价格或支付状态，商业方案由平台管理。

平台请求必须 fail closed。reservation 使用稳定请求幂等键；凭据不得进入 URL、日志或浏览器存储。具体账户和 AI 运行约束见 [AI_ACCESS_RUNBOOK.md](./AI_ACCESS_RUNBOOK.md)。

## 验证

```powershell
npm run typecheck
npm test -- --run src/lib/platform/server.test.ts src/lib/platform/browser.test.ts src/app/api/agent/route.test.ts
```

本地测试不能代替线上 OAuth client、回调白名单、已登录额度和真实支付验收。
