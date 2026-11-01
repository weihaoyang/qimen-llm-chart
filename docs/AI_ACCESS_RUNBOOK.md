# 知几账户与 AI 用量运行约束

平台账户和用量是唯一身份及授权真相。知几不接受游客购买凭据，也不保留旧账户、支付或权益回退路径。

## 账户请求

- OAuth 使用平台授权码 + PKCE，产品代码从 `singseq.product.json` 读取 `qimen` / `qimen-core`。
- 前端会话通过产品的 HttpOnly bridge 恢复；实际平台请求由 `@singseq/platform-sdk` 使用 Bearer access token 发出。
- 服务端每次受限 AI 请求都要验证账户及平台可用用量。UI 余额、缓存状态或 OAuth 回跳本身都不能放行。
- 缺失身份、额度不足或平台不可用时，服务端拒绝模型调用。

## AI 用量生命周期

```text
Bearer → platform balance → reserve → provider → consume
                                      └→ failure: release
```

reservation 的幂等键必须稳定且由产品请求生成。模型失败释放 reservation；成功交付后只消费一次。客户端不得直接修改平台额度，产品不得建立匿名付费入口或本地权益回退。

## 回归检查

```powershell
npm run typecheck
npm test -- --run src/lib/platform/server.test.ts src/lib/platform/browser.test.ts src/app/api/agent/route.test.ts
```

至少确认匿名请求被拒绝、登录账户额度按产品坐标读取、额度不足不调用 provider、provider 失败会释放、成功只消费一次。真实 OAuth、支付和线上用户额度仍需部署环境验收，不能由本地测试推断。
