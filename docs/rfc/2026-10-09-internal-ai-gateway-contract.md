# 内部 AI 网关契约草案 `/internal/ai/{capability}`

- 状态: Proposal（阶段 1 预备；供平台 owner 评审）
- 日期: 2026-10-09
- 配套: `docs/rfc/2026-10-09-platform-boundary-assessment-rfc.md`（D2）
- 范围: 平台 ↔ 产品（能力提供方）之间的服务器到服务器 AI 调用契约。**只定义契约，不含实现。**

---

## 0. 目标与非目标

- 目标：把平台里对某个产品内部路径的写死调用（`SS_BAZI_AGENT_URL` →
  `https://qmdj.singseq.com/api/agent/bazi-personality`）泛化为**版本化、可计费、可审计**的统一网关。
- 非目标：不改平台自有 provider（`assessment` 自带 `ai_provider`）的调用；不改对外
  `/api/v1/assessment/*`；不让产品参与计费或持有 provider 密钥。

## 1. 角色

| 角色 | 位置 | 职责 |
|---|---|---|
| Gateway（平台） | 平台服务端 | 持有 secret、鉴权、幂等、限流、计量、审计、schema 版本协商 |
| Capability provider（产品） | 产品服务端（如 qmdj） | 只做计算/模型取象，返回结构化结果与可选 `provider_usage` |

## 2. 传输

```
POST /internal/ai/{capability}
Content-Type: application/json; charset=utf-8
```

- 生产环境强制 `https://`（与现有一致：非 https 直接拒绝）。
- `capability` 为闭集（见 §8）。

## 3. 认证（HMAC-SHA256）

| Header | 必需 | 说明 |
|---|---|---|
| `X-SS-Capability` | 是 | 冗余携带 `{capability}`，防路径重写 |
| `X-SS-Key-Id` | 是 | 密钥标识，支持轮换（新增） |
| `X-SS-Timestamp` | 是 | Unix 秒（UTC） |
| `X-SS-Nonce` | 是 | 随机串（新增），防重放 |
| `X-SS-Signature` | 是 | `hex(hmac_sha256(secret, canonical))` |
| `X-SS-Request-Schema` | 是 | 请求 schema 版本，如 `1` |
| `X-SS-Idempotency-Key` | 是 | 幂等键（§6） |

canonical string：

```
canonical = f"{timestamp}.{nonce}.{raw_body}"
```

- 时间窗：`abs(now - timestamp) <= 300` 秒；超出即 401。
- Nonce：在窗口内一次性有效（服务端缓存 nonce，过期回收）。
- 比较必须常量时间（`timingSafeEqual`）。
- secret 只在服务端注入；缺失时返回 503（沿用现有 `missing-secret` 语义）。

> 与现有 qmdj 内部接口的关系：现在是 `hmac(timestamp.raw_body)` + `x-ss-bazi-timestamp/signature`。
> 新契约是其**超集**（+ nonce + key-id + schema 版本）。迁移期见 §9。

## 4. 请求封装（`X-SS-Request-Schema: 1`）

```json
{
  "capability": "bazi-prediction",
  "request_id": "uuid",
  "schema_version": 1,
  "input": { /* 能力专属，见 §8 */ },
  "context": {
    "subject_type": "guest|user",
    "subject_ref": "opaque",         // 平台主体引用，非产品身份真相
    "product_code": "shengtian-banzi",
    "trace_id": "platform-trace-id"
  },
  "options": { "timeout_ms": 60000 }
}
```

- 平台**不下发** provider 密钥、用量或订单真相；产品返回后由平台计费。
- `input` 由能力 schema 定义；未知字段必须忽略（前向兼容）。

## 5. 响应封装

成功：

```json
{
  "return_code": 0,
  "capability": "bazi-prediction",
  "response_schema_version": 1,
  "result": { /* 能力专属，平台持久化到受治理产品表 */ },
  "provider_usage": { "input_tokens": 1234, "output_tokens": 567, "cached_input_tokens": 0 },
  "provider": "qmdj-agent",
  "model": "bazi-v4-ziping-luming-rules"
}
```

失败：

```json
{
  "return_code": 1,
  "capability": "bazi-prediction",
  "reason_code": "capability_input_invalid",
  "message": "human readable, never parsed by platform",
  "retryable": false
}
```

- `provider_usage` **可选**；若缺失，平台按自身回退策略计费（不阻断交付）。
- 平台只按 `reason_code` 分支，不解析 `message`。

## 6. 幂等

- 平台必带 `X-SS-Idempotency-Key`；provider 必须保证同键同结果（首次结果缓存并复用）。
- 键作用域：`{capability} + {key}`。
- 建议 provider 复用平台已有的 `request_hash` 语义做二次防抖。
- 重试：平台对 `retryable=true` 或网络错误重试，**同键**；provider 不得因重试重复产生副作用。

## 7. 计量与审计（平台专属）

- 平台在网关侧 `reserve → 调用 → commit/release`（复用 `UsageService`）。
- provider **不得**自行扣费、写平台用量表或返回价格。
- 平台记录：`capability`、`key_id`、`trace_id`、`schema_version`、`provider_usage`、
  `rate_version`、`cost_points`（对应 `ModelTokenRate`）。

## 8. 能力注册表（初始）

| capability | request schema | response schema | 说明 |
|---|---|---|---|
| `bazi-prediction` | 1 | 1 | 八字性格叙事（现 qmdj `bazi-personality`） |
| `assessment-interpretation` | 1 | 1 | 预留：若某产品以自有模型提供 |

- 版本不匹配：provider 返回 `reason_code=schema_version_unsupported`，平台按失败处理（保守拦截）。
- 新增能力=注册表追加一行 + 双版本字段，不改既有能力契约。

## 9. 与 qmdj 现有内部接口的迁移映射

| 现有（qmdj） | 新契约 |
|---|---|
| `POST /api/agent/bazi-personality` | `POST /internal/ai/bazi-prediction` |
| `x-ss-bazi-timestamp` | `X-SS-Timestamp` |
| `x-ss-bazi-signature = hmac(ts.rawBody)` | `X-SS-Signature = hmac(ts.nonce.rawBody)` |
| （无） | `X-SS-Nonce` / `X-SS-Key-Id` / `X-SS-Request-Schema` / `X-SS-Idempotency-Key` |
| 响应 `{...prediction}` | 包进 `{return_code, capability, response_schema_version, result, provider_usage}` |

- qmdj 侧：**保留旧路径一版**（弃用期），新增新路径；两版共享同一业务实现。
- 平台侧：`bazi_agent_url/secret` → 网关 `INTERNAL_AI_URL` + `key_id/secret`（按 capability 配置）。

## 10. 验收测试（契约层）

1. HMAC 向量：给定 `ts/nonce/body/secret` 的期望签名（正/错各一）。
2. 重放：同 `nonce` 第二次 → 401；`timestamp` 超窗 → 401；非 https（prod）→ 拒绝。
3. 幂等：同 `Idempotency-Key` 两次 → 同 `result`，provider 只执行一次。
4. schema：不支持的 `X-SS-Request-Schema` → `schema_version_unsupported`。
5. 计量：成功→commit；provider 失败/取消→release；已交付但计量上报失败→不退款（对账收敛）。
6. 兼容：旧 `x-ss-bazi-*` 路径在弃用期仍通过。

## 11. 非目标 / 待决
- 网关是否由平台独立进程承载（vs 现有 API 内 `/internal/ai`）：建议后者起步，按 QPS 再拆。
- `key_id` 轮换窗口与旧 key 并存时长：建议 30 天，需平台运维确认。
- `assessment-interpretation` 是否真的需要网关（平台自带 provider 时可不用）。
