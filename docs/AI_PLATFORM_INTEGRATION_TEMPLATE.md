# AI 平台接入范本

本范本覆盖知几 AI 调用接入。Casdoor 负责身份认证，SingSeq Platform API 是账户、订单、支付、订阅和权益的唯一权威；产品不得复制这些职责。

## 统一合同

产品合同位于 `singseq.product.json`，唯一 SDK 依赖固定在 `package.json` 和 lockfile。产品以 OAuth/PKCE 获取用户令牌，并通过 `@singseq/platform-sdk` 查询目录/额度、预留用量以及消费或释放预留。价格和账户余额不在产品内实现。

请求生命周期固定为：

```text
Casdoor OAuth/PKCE -> platform API gate -> reserve -> provider -> commit
                                      \-> failure -> release
```

`src/lib/platform/ai-contract.ts` 与 `src/lib/platform/ai-platform-adapter.ts` 将产品 AI provider 包装在平台用量生命周期中。reserve 的不确定 POST 不自动重试；commit 通过 `settledCommit` 收敛平台 terminal 409；provider 失败只释放当前 reservation，provider 已返回而 commit 结果不确定时绝不释放已交付结果。

## Provider 与 token 计量

AI provider 只返回产品结果；账户用量以平台 reservation 为准。产品不以服务端共享密钥或旧 token-usage 路径绕过用户授权，也不在本地计算价格或扣余额。

## 幂等与重试

- `requestId` 贯穿一次 AI 请求与平台 reservation 幂等键。
- reserve 不重试，避免网络不确定时产生重复 reservation。
- provider 可由调用方使用同一 `requestId` 做安全重试，但必须保持输入快照不变。
- commit 不对普通网络错误盲目重试；平台 terminal settled 结果由 `settledCommit` 收敛。
- release 是 best effort；失败必须保留原始 provider 错误并记录可诊断事件。

## 验证命令

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/lib/platform/ai-contract.test.ts src/app/api/agent/route.test.ts --reporter=dot
npm run css:audit
npm run build
```

## 当前边界

- Agent route 的用量幂等由平台 reservation/consume/release 合同承担；产品不复制订单或余额真相。
- 生产 OAuth client 必须只配置精确产品回调和所需最小 scope；未登记和验收前保持产品发布阻断。
