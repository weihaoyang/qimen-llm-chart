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

1. ~~证书模式下 SDK 解析支付宝成功响应抛 `ResponseException`~~ **已修复并上线**（`20261017-4151d33`）：证书模式响应顶层被规整为 `(业务对象, sign, …)`，验签仍由 SDK 用证书公钥执行，篡改一字节即失败。
2. ~~控制台下载的 `alipayCertPublicKey_RSA2.crt` 内含两张证书~~ **已修复**：平台取叶子证书，控制台原始文件可直接使用（`cert_chain_fallback=false`）。
3. ~~被拒/陌生通知不留痕~~ **已修复并生产实测**：落档到 `<release>/var/payment-callback-samples/`（持久卷），文件名含原因码/订单号/事件号；发布脚本已固化 `var` 属主 1000:1000 并加 write-probe 自检。
4. ~~一致性门禁对已退款订单永久报红~~ **已修复**：改为按状态机合法组合判定（`refunded` 额外要求存在 completed 退款记录）。

端到端实测（2026-10-17，真实资金 ¥0.01，平台自有订单）：

- 下单 → 支付 → **真实异步通知**（`signature_valid=true`，nginx 应答 `200 7`=success）→ 订单 `active`、**`settlement_source=callback`** → **权益发放**（`entitlement_granted=true`）→ 订阅 `active`；
- 平台退款路径 → `refund_status=completed`（支付宝退款单号留存）→ 订单 `refunded` → **权益自动 `cancelled`**；
- 过期未付测试单由对账脚本关闭为 `expired`，`pending_payment` 归零。

仍未收口：

1. **加密异步通知未实测**：接口内容加密的"请求加密 + 响应先验签再解密"已在真实网关验证可用（加密与证书模式可叠加），但控制台侧的加密通知形态未跑过；且服务器那把 AES 密钥曾被误打印，**建议先在控制台轮换再用**（当前生产保持加密关闭，功能上无缺口）。
2. **劳务出款护栏**：额度预检 `alipay.fund.quota.query` 返回 `INVALID_PARAMETER`（`product_code` 取值不被接受）、余额预检/官方回单/消息回调三项未开；且需控制台「商家转账—接入检测」重新通过（当初唯一未通过项就是应用未配置公钥证书，现已完成证书模式）。
3. **身份切换前置**：`SS_CASDOOR_*` 未配（P1）、契约需收紧到路径式回调（P3）、生产 SMS+微信登录人工证据（P4）、逐产品签核人（P8）；`SS_CASDOOR_LOGIN_CLIENTS` 逐产品开关已实现（默认空=fail-closed）。
4. **秒级接入的 5 个人工步骤**：产品目录/定价（无 API）、`integrations.py`+配置生成+nginx、Casdoor application、审核钩子 URL、回跳白名单；自动化部分（登记→审批→托管→凭据→下单→支付尝试→下架）实测**1.0–1.3 秒**跑完。

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
