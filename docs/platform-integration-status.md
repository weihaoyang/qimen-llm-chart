# 知几平台接入状态

> 状态日期：2026-10-17。本文只记录当前合同和可复核证据；历史审计材料不作为接入规范。

## 唯一平台合同

- 平台 API：`https://api.singseq.com`
- `product_code`：`qimen`
- `access_scope`：`qimen-core`
- 产品域名：`https://qmdj.singseq.com`
- OAuth 回跳：`https://qmdj.singseq.com/#/auth/callback`（过渡期平台同时接受路径式 `/auth/callback`，见平台合同检查器）
- 回跳处理：QMDJ 主工作台校验 `state`，完成 PKCE code 交换，恢复平台 session，刷新 gate/usage，然后清理 fragment。
- 购买入口：`/`；支付结果页：`/billing/result`。

仓库默认配置见 `singseq.product.json` 与 `config/ai-product-manifest.json`（均为 `qimen` / `qimen-core`）。
历史值 `shengtian-banzi` / `shengtian-banzi-core` **仅作历史记录，不得回退使用**。

QMDJ 不实现公司级 OTP、用户库、订单、支付结果、订阅或 entitlement 真相。所有这些能力只能调用 Consumer Platform。

## Agent 必读文档

当前平台接入只有以下三份事实源：

1. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\platform-sdk-and-product-integration.md`
2. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\qmdj-and-ai-platform-contract.md`
3. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\new-product-platform-launch-checklist.md`

`ai-agent-platform-integration-spec.md` 和 `product-integration-guide.md` 是退役名称，不得重新创建或引用。

## 支付通道：支付宝证书模式（2026-10-17 已实测验证）

平台生产已切到支付宝**公钥证书模式**（代码先上线、控制台后生效的铁律已按成对方式执行）。

已验证事实（平台侧 release `20261017-6e5ff8f`，容器 `consumer-platform-api-shadow`）：

- 平台 `/healthz` = 200；就绪检查：`sign_mode=cert`、`cert_mode_ready=true`、`blockers=[]`。
- 证书指纹（用于排障比对，非机密）：
  - `app_cert_sn`（应用公钥证书，须与控制台登记的一致）= `64e4207801d6307bfd5656f8bad6f4bb`
  - `alipay_cert_sn`（支付宝公钥证书）= `95d861eb68fe113b5f37aba2d8981882`
  - `alipay_root_cert_sn` = `687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6`
- **真实收款**：`out_trade_no=SSTEST20261016220639`、`trade_no=2026101722001457631402499246`、`total_amount=0.01`、`trade_status=TRADE_SUCCESS`（支付宝权威回执）。
- **真实退款**：同单退款 `code=10000`、`refund_fee=0.01`、`fund_change=Y`、`gmt_refund_pay=2026-10-17 06:09:57`；复查 `trade_status=TRADE_CLOSED`。
- **异步通知确实会推送到我们**：`/var/log/nginx/access.log` 中 `POST /api/v1/commerce/callbacks/alipay/notify` 的响应体长度为判据 —— **`200 7` = 平台回 `success`（真实订单已接受）**，**`200 4` = 平台回 `fail`（fail-closed 拒绝）**。
- **fail-closed 行为正确**：绕过平台、直接用支付宝接口开出的单号，平台与 QMDJ 结果页都会拒绝凭空确权（QMDJ 提示「这笔订单与当前产品不匹配」属预期保护，不是故障）。

尚未收口（阻塞"真实平台购买全链路"验证）：

1. 证书模式下 SDK 解析支付宝成功响应抛 `ResponseException`（网关层已通，仅解析异常）→ 影响"主动查询兜底 / 日对账"，修复上线前**不要做真实购买**。
2. 控制台下载的 `alipayCertPublicKey_RSA2.crt` 内含两张证书（叶子 + 签发者），平台校验暂要求单证书（生产已用抽取出的单证书文件过渡）。
3. 被拒/陌生通知**不留痕**，无法区分"陌生单号"与"验签失败"；需补原因码留痕。
4. 平台自有订单的 ¥0.01 级端到端（下单 → 支付 → 权益发放）待支付测试页落地后执行。

运维纪律（本次排障踩过的坑，发布/切换前必须遵守）：

- compose 的 API 镜像取自 `${SS_API_IMAGE:-consumer-platform-api:local}`：**任何 `docker compose up` 都必须显式传 `SS_API_IMAGE`**，否则会退回旧镜像并因迁移头不匹配把实例变 blocked。
- 改 `infra/env/.env.host-shadow` **只能用"临时文件构建 + `cat tmp > 目标`"**；用管道 `tee` 回写同一文件会截断配置（SMS/CAPTCHA 配置丢失、容器起不来）。
- 证书/私钥只在部署环境变量与服务器受控目录流转，不进仓库、不出现在聊天与文档里。

## 环境变量

```text
NEXT_PUBLIC_PLATFORM_BASE_URL=https://api.singseq.com
NEXT_PUBLIC_PLATFORM_PRODUCT_CODE=qimen
NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE=qimen-core
PLATFORM_BASE_URL=https://api.singseq.com
PLATFORM_PRODUCT_CODE=qimen
PLATFORM_ACCESS_SCOPE=qimen-core
```

## 接入与发布规则

1. 新产品必须先在平台登记唯一 `product_code`、`access_scope` 和精确 callback 白名单。
2. 产品只保留一个平台 callback 合同，不新增平行 callback 路径或本地登录真相。
3. AI 请求必须携带平台 access token，并由平台 gate/usage 决定是否允许；本地显示余额不能单独授权。
4. 发布前必须执行平台健康检查、产品构建、OAuth callback、匿名拒绝边界和已登录 gate/usage 验证。
5. 支付验证只生成不扣款的支付链接；真实扣款必须另行授权。
