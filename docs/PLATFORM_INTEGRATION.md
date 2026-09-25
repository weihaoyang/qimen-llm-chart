# 知几平台接入合同

## 固定产品参数

| 项目 | 值 |
| --- | --- |
| `product_code` | `shengtian-banzi` |
| `access_scope` | `shengtian-banzi-core` |
| Agent 套餐 | `shengtian-banzi-analysis-10` |
| K 线套餐 | `shengtian-banzi-kline-precise-1` |
| 平台地址 | `https://api.singseq.com` |

专用知几 product code 尚无登记证据，代码不得自行切换。价格、渠道和权益均以平台目录、payment-result 与 gate 为准。

## 唯一接入层

- 浏览器产品能力只从 `src/lib/platform/client.ts` 的 `createProductPlatformClient()` 创建 `ProductPlatformClient`。
- 管理员邀请码面板单独使用 `createPlatformAdminClient()`；管理员方法不进入普通产品客户端。
- 服务端 `src/lib/platform/server.ts` 通过 `ProductPlatformClient` 调用 gate、usage 和 guest usage；产品代码不拼接平台 URL。
- OAuth/PKCE bridge 仍由产品 route 读取平台 `Set-Cookie`，仅负责把平台 session 安全桥接到 qmdj httpOnly cookie。

## 账户、支付和权益

登录、套餐、订单、支付宝/微信支付尝试、payment-result、订阅、退款和 entitlement 全部由 Consumer Platform 负责。qmdj 只保留工作台和排盘业务数据。

标准路径：

```text
平台 OAuth/PKCE → 套餐 → 订单 → payment attempt → payment-result → gate → 受限能力
```

浏览器回跳只触发恢复查询，不能直接开权。AI API 账户主体必须先查 `shengtian-banzi / shengtian-banzi-core` gate；平台失败默认拦截。游客只允许使用平台签发的单次 checkout token。

## AI 统一计费

```text
gate → reserve → provider → commit（失败 release）→ report token-usage
```

- `/api/agent` 的非流式和流式路径都复用平台 reservation 生命周期。
- provider usage 归一化为输入、输出和缓存 token；平台负责 rate version、points 和幂等落库。
- 服务端从 `PLATFORM_PRODUCT_SERVICE_SECRET` 注入 `ProductServiceClient`，密钥不进浏览器、URL、日志或仓库。
- token-usage 上报失败不能释放已交付分析；返回的 reservation 仍由平台 reconciliation 收敛。

## 配置与验证

公开变量：`NEXT_PUBLIC_PLATFORM_*`；服务端变量：`PLATFORM_*` 和 `PLATFORM_PRODUCT_SERVICE_SECRET`。生产密钥只能由部署 secret 注入。

```powershell
npm run lint
npx tsc --noEmit --pretty false
npm run test -- --run src/lib/platform/ai-contract.test.ts src/lib/platform/ai-platform-adapter.test.ts src/lib/platform/server.test.ts src/app/api/agent/route.test.ts --reporter=dot
npm run build
```

不得在 qmdj 新建 users、OTP、orders、payment callback、subscription 或会员表；不得把平台 SDK 复制到产品仓库后局部修改。
