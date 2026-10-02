# 知几平台接入状态

> 状态日期：2026-10-02。本文只记录当前合同和可复核证据；历史审计材料不作为接入规范。

## 唯一平台合同

- 平台 API：`https://api.singseq.com`
- `product_code`：`shengtian-banzi`
- `access_scope`：`shengtian-banzi-core`
- 产品域名：`https://qmdj.singseq.com`
- OAuth 回跳：`https://qmdj.singseq.com/#/auth/callback`
- 回跳处理：QMDJ 主工作台校验 `state`，完成 PKCE code 交换，恢复平台 session，刷新 gate/usage，然后清理 fragment。

QMDJ 不实现公司级 OTP、用户库、订单、支付结果、订阅或 entitlement 真相。所有这些能力只能调用 Consumer Platform。

## Agent 必读文档

当前平台接入只有以下三份事实源：

1. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\platform-sdk-and-product-integration.md`
2. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\qmdj-and-ai-platform-contract.md`
3. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\new-product-platform-launch-checklist.md`

`ai-agent-platform-integration-spec.md` 和 `product-integration-guide.md` 是退役名称，不得重新创建或引用。

## 已验证范围

- 平台 `/healthz`：公网 200。
- 四个已登记产品的套餐/合同接口：公网 200。
- QMDJ `/api/health`、`/api/version`：公网 200。
- QMDJ 全套测试：583 passed，13 skipped。
- QMDJ 生产构建：已通过。
- 匿名访问 entitlement、AI、订单和支付尝试：按预期拒绝，未创建真实订单或扣款。
- OAuth 合法参数可进入统一登录页；`state` 必须使用 43--128 字符，PKCE 使用 S256，callback 必须逐字匹配白名单。

用户已手工确认登录成功。当前自动化浏览器连接缺少 Codex session token，因此本状态页不把自动化浏览器点击结果冒充为已完成证据；真实扣款、生产邀请码和付费 AI 消耗仍未执行。

## 环境变量

```text
NEXT_PUBLIC_PLATFORM_BASE_URL=https://api.singseq.com
NEXT_PUBLIC_PLATFORM_PRODUCT_CODE=shengtian-banzi
NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
PLATFORM_BASE_URL=https://api.singseq.com
PLATFORM_PRODUCT_CODE=shengtian-banzi
PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
```

## 接入与发布规则

1. 新产品必须先在平台登记唯一 `product_code`、`access_scope` 和精确 callback 白名单。
2. 产品只保留一个平台 callback 合同，不新增平行 callback 路径或本地登录真相。
3. AI 请求必须携带平台 access token，并由平台 gate/usage 决定是否允许；本地显示余额不能单独授权。
4. 发布前必须执行平台健康检查、产品构建、OAuth callback、匿名拒绝边界和已登录 gate/usage 验证。
5. 支付验证只生成不扣款的支付链接；真实扣款必须另行授权。
