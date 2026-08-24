# AI 分析权益接入与兑换后验收

本文是排盘产品（`shengtian-banzi`）关于“登录、兑换邀请码、账户权益、AI 调用”链路的强制运行手册。它记录的是运行时不变量，不是 UI 说明。

## 唯一不变量

页面显示的权益与实际 AI 请求必须来自同一个主体、同一个产品和同一个 access scope：

```text
账户 session → platform gate → usage summary → /api/agent Authorization → reserve → model → commit/release
```

只要账户栏显示“平台账户权益剩余 N 轮”，就必须满足：

- `platformWorkspace.status === "authenticated"`；
- `platformWorkspace.session.access_token` 存在且可通过 `restorePlatformAccessState` 刷新；
- `product_code === shengtian-banzi`；
- `access_scope === shengtian-banzi-core`；
- `/api/agent` 请求带 `Authorization: Bearer <fresh access token>`；
- 请求不得同时回退到旧的游客 checkout token。

余额数字本身不是授权凭证，也不能作为前端放行条件。最终放行只能由服务端再次查询平台 gate。

## 账户与游客状态规则

两种主体必须互斥：

| 状态 | 请求凭证 | 允许的服务端路径 |
| --- | --- | --- |
| 已登录账户 | `Authorization: Bearer` | 账户 gate、账户 usage reserve/commit/release |
| 未登录游客且已支付 | `X-Guest-Checkout-Token` | guest usage reserve/commit/release |
| 已登录账户 + 旧游客缓存 | 只使用账户 Bearer | 清除/忽略 guest token，不得让 guest 状态覆盖账户状态 |
| 无凭证 | 无 | 返回 `analysis_access_required` |

登录或兑换成功后，所有 Agent mode 的状态必须同步为 `authMode: "account"`，并清空 `checkoutToken`、`orderId`。恢复本地工作区时，如果账户权益可用，账户状态优先于旧的 guest 会话。

## 邀请码兑换流程

兑换按钮的完整流程必须是：

1. `restorePlatformAccessState(session)`，确保使用新 access token。
2. 携带 access token 与 CSRF token 调用邀请码兑换接口。
3. 重新读取账户 gate 与 usage summary；不能只相信兑换接口返回的展示数字。
4. 更新 `platformWorkspace` 和全部 Agent 状态为账户模式。
5. 清除旧 guest token/order。
6. 在下一次 AI 调用前再次刷新账户 session，并将新 token 放入 `Authorization`。
7. 页面提示“兑换成功”只代表兑换已提交；AI 是否可用以 `/api/agent` 的服务端 gate 结果为准。

如果第 3 步暂时失败，可以展示兑换成功，但必须标注“余额将在刷新后核对”，不得把不完整状态写成已可分析。

## `/api/agent` 服务端合同

服务端必须按以下顺序执行：

1. 读取 Bearer token、平台 cookie 或 guest token。
2. 账户请求查询 `shengtian-banzi / shengtian-banzi-core` gate。
3. gate 不允许、上下文缺失或平台请求失败时保守拦截。
4. 成功后 reserve 用量。
5. 模型成功才 commit；模型失败必须 release。

禁止：

- 依据 `usageAvailable` 或本地缓存直接放行；
- 依据兑换成功提示直接放行；
- 在账户状态下发送 guest token；
- 在客户端直接扣减或恢复平台次数；
- 让不同产品的 product code/access scope 混用。

## 必须覆盖的自动化测试

每次修改账户、兑换、AI 入口或 session 恢复代码，都至少运行：

- 兑换成功后全部 Agent state 为 account，guest token/order 为空；
- 账户余额大于 0 时，AI 请求带 Bearer token；
- 账户余额大于 0 且存在旧 guest token 时，仍只发送 Bearer token；
- 没有账户/guest 凭证时返回 `analysis_access_required`；
- gate 拒绝时不 reserve；
- reserve 成功但模型失败时 release；
- 模型成功后只 commit 一次；
- 刷新页面后账户 session 恢复，不能退回 guest；
- product code 和 access scope 与正式平台合同一致。

## 发布前最小冒烟

不消耗 AI 次数的发布检查：

```text
GET https://paipan.singseq.com/api/health
GET https://paipan.singseq.com/api/version
GET https://api.singseq.com/api/v1/commerce/products/shengtian-banzi/plans
```

有已登录测试会话时，再验证：

1. 登录后账户栏显示余额。
2. 兑换一个测试邀请码后刷新页面，余额仍存在。
3. 检查浏览器 Network：`/api/agent` 必须有 `Authorization`，不得只有 `X-Guest-Checkout-Token`。
4. AI 请求返回成功或明确的 gate 错误，不能出现“余额已显示但请求无凭证”。

真实兑换和真实 AI 调用会消耗权益，不属于无扣款发布冒烟，必须单独记录测试账户、消耗次数和结果。

## 本次故障记录

2026-08-25 曾出现“账户权益剩余 10 轮，但 AI 仍提示请登录”。根因是旧 guest 会话状态覆盖了已登录账户状态，导致客户端没有向 `/api/agent` 发送 Bearer token。修复后，账户权益优先逻辑已固化在 `src/components/app-shell.tsx`，并按本手册的账户/游客互斥规则维护。

