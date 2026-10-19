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

1. **微信登录 / 微信支付**：开放平台/商户号侧尚未拿到 AppID 与商户 API 证书（小程序/开放平台注册需主体认证 + 对公打款验证），代码侧微信网关目前仅实现 H5。
2. **劳务出款**：¥0.10 真实转账已成功（见下），但「佣金报酬」场景为 1–3 个工作日审核后生效；官方回单与消息回调仍关闭。
3. **身份切换前置**：`SS_CASDOOR_*` 已配（P1 就绪、`providers.casdoor_identity.ready=true`），但 `SS_CASDOOR_LOGIN_CLIENTS` 为空（fail-closed，登录仍走旧手机号/OTP 路径）；仍需 P3 契约收紧、P4 真实短信+微信登录人工证据、P8 逐产品签核人，才能开 G3/G4。
4. **秒级接入的收尾**：Host/CORS/OAuth 白名单均已数据驱动热生效；剩「产品目录/定价」可经 provision API 完成，但 **DNS 记录**与**证书签发**仍依赖外部（`*.singseq.com` 已通配，新增子域无需手工加 DNS）。

### 2026-10-20 收口记录（生产）

- 平台线上版本切换为 **`20261020-qimen-8853ad5`**（我方集成分支 + 额度护栏修正 + 迁移 `20261021_0004` 对齐）：`qimen` 注册恢复 → **qmdj 登录不再报 `identity_oauth_context_invalid`**（操作人实测登录成功）；证书模式、内容加密、Casdoor P1 均保持。
- **¥0.10 真实劳务转账成功**：批次 `LBVERIFY20261017A` → `settled`，`provider_status=success`、支付宝订单号 `20261020020070111500030004866728`、税额 0（≤¥800）、`paid=10 / difference=0` 对平；成功后重试被 `batch settled` 拒绝（无第二笔）。
- 额度护栏修正：支付宝 `restricted=true` 仅表示"账户有额度上限"，改为按"**剩余额度 ≥ 本笔金额**"放行（当次 `daily_remain=¥20,000`、`monthly_remain=¥100,000`）。
- ⚠️ 已知遗留：此前一版 `20261021-quant-payment-contract-0004` 的来源分支已丢失（未 push、不在本机/远端），其**平台侧新增接口**目前不在线上；quant 产品站点本身正常（200），待找回分支后 merge 回来。

### 内容加密实测（2026-10-17）

- 生产已开启 `SS_ALIPAY_ENCRYPT_TYPE=AES`（密钥与服务器 `/srv/alipay/20261017/aes_key.txt` 同一把），就绪 `encryption_enabled=true / encryption_ready=true`；真实链路验证——加密下单（`biz_content` 密文）→ **密文异步通知先验签再解密** → `signature_valid=true`、`settlement_source=callback` → 权益发放 → **加密退款** `completed` → 权益 `cancelled`。服务端代码侧 `normalize_certificate_mode_response` 已覆盖"证书模式 + 内容加密"叠加形态。
   ⚠️ **密钥轮换已决定放弃（2026-10-18，操作人决定）**：继续使用当前 AES 密钥，接受"曾被误打印"的风险；生产持续开启内容加密。若要恢复轮换：控制台重设后把新 `AES.txt` 放 `/srv/alipay/20261017/`，并用一次性容器验证"同一把"再切换；注意 **密钥文件属主必须是 uid 1000(app)**，且**每个新 release 的 `infra/secrets` 都要带上它**（`deploy-shadow-release.sh` 只校验私钥/公钥，不自动搬 secrets）。

对账与账户能力（2026-10-18 真实接口实测）：

- **日对账**：`2026-10-16` → `status=ok`（账单 1 笔 / 平台 1 笔已结算 / `orders_matched_from_bill=1` / 全部差异计数 0）；`2026-10-17` → `status=alert`，原因是账单含 3 笔退款（3 次 ¥0.01 测试退款，`-0.01`）与 1 笔**非平台单号**（绕过平台的 `SSTEST…`）—— 告警行为正确（账单有平台不认识的收入必须人工核）。
- **余额** `alipay.fund.account.query` → `10000 Success`；**转账额度** `alipay.fund.quota.query` → `10000 Success`（`restricted=true`，额度受限）。额度查询必须用 `product_code=TRANS_ACCOUNT_NO_PWD` + `biz_scene=DIRECT_TRANSFER`（与转账的 `BATCH_API_NO_PWD/MULTI_STEP_TRANSFER` 解耦）。
- 账单下载走 `http://dwbillcenter.alipay.com`，平台如实标注 `commerce_daily_bill_insecure_transport`（已知、非隐瞒）。
- **劳务真实转账已打通（2026-10-20）**：`佣金报酬` 场景审核通过后，¥0.10 真实转账 `provider_status=success`（见上方「2026-10-20 收口记录」）。

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

### 2026-10-20 统一记录（main = integration = 线上）

- 平台仓把 `origin/main`（quant arena checkout/OAuth + 迁移 `20261021_0004`）与 `integration/platform-next` **合并统一**：merge `94756e0`，发布源码 `d655bec`，远端 `main` 与 `integration/platform-next` 均为 `7839e3e`（已 push，**可追溯**）。
- 线上 release **`20261020-unified-d655bec`**；迁移单头 `20261021_0004`；全套 **1102 passed / 1 skipped / 0 failed**；证书模式 + 内容加密 + Casdoor P1 全在；`qimen` / `quant-arena` 的 plans/contract 均 200，quant 平台路由非 404。
- 幂等复核：`LBVERIFY20261017A` 仍 settled（gross/net/paid 10/10/10，diff 0，1 item，无第二笔）。
- ⚠️ 跨仓契约变更：`payment-attempts` 的 `return_url` 变为**必填**（来自 main 线）。qmdj 已传；`assessment-center` / `guanxiang` 两仓尚未逐一审计，需跟进。
- ⚠️ 回滚线：`:20261020-qimen-8853ad5`（以及 `:20261021-quant-payment-contract-0004`）。
