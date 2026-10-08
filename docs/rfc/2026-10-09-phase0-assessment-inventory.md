# 阶段 0：assessment 产品域盘点（RFC 配套）

- 状态: Done（只读测量，未改平台代码）
- 日期: 2026-10-09
- 配套: `docs/rfc/2026-10-09-platform-boundary-assessment-rfc.md`
- 方法: 读取 `apps/api` 的 assessment 产品域、核心区交叉引用、迁移与配置，归纳依赖方向。

---

## 1. 依赖方向图（当前）

```
                        （组合根，允许）
  app/main.py ────────────────► app.products.assessment.services.bazi   (retention 清理)
  app/api/router.py ──────────► app.products.assessment.{routes,admin_routes}

                        （核心 → 产品：越界耦合，需泛化）
  app/services/commerce.py ──► BaziBlindTestSession        (guest 支付绑定)
  app/api/routes/ops.py ─────► AssessmentInterpretation    (运行时告警)
  app/db/models/__init__.py ─► 产品模型再导出（facade）

                        （产品 → 核心：合法）
  app.products.assessment ──► core.errors / core.security / core.config.Settings
                            ► db.models（产品表 + ModelTokenRate/UsageCredit）
                            ► services.{account,admin,auth,usage,audit}
```

## 2. 产品域对平台的依赖（迁移时必须保留的接口）

| 依赖 | 用途 | 迁移后归属 |
|---|---|---|
| `core.config.Settings` | 配置入口 | 平台（产品通过网关/配置注入） |
| `core.errors.*` | 领域错误 | 可随计算迁出（纯工具） |
| `core.security.*` | hash/token/时间 | 可随计算迁出（纯工具） |
| `db.models`（产品表 + `ModelTokenRate`/`UsageCredit`） | 持久化 + 计费 | **表留平台**；产品经平台契约读写 |
| `services.account.AccountService` | 主体/上下文 | 平台 |
| `services.auth.AuthService` | 身份校验 | 平台 |
| `services.admin.AdminService` + `ROLE_CAPABILITIES` | 研究/原始数据角色 | 平台 |
| `services.usage.UsageService` | 用量 reserve/commit | 平台 |
| `services.audit.record_audit_event` | 审计 | 平台 |

## 3. 平台对产品域的使用（需泛化的耦合）

| 位置 | 引用 | 处置 |
|---|---|---|
| `services/commerce.py:14,371,413` | `BaziBlindTestSession`（guest 盲测报告绑定） | **阶段 2 泛化**为「支付后一次性交付」原语 |
| `api/routes/ops.py:11,83` | `AssessmentInterpretation`（运行时告警） | **阶段 2 泛化**为「异步任务运行时告警」接口 |
| `main.py:16,31` | `BaziPredictionService.purge_expired_experiment_payloads` | **阶段 2/4** 泛化为「产品域 retention 注册」或改由产品定时任务 |
| `db/models/__init__.py:59-65` | 产品模型再导出 | 兼容 facade，迁移收口时调整 |
| migrations (18 个文件) | `bazi_*` / `assessment_interpretations` | **随数据留平台**，不许产品仓库建第二份真相 |

## 4. assessment 使用的配置项（敏感项标注）

- 平台自带 provider（非产品）：`ai_provider`、`ai_api_key`★、`ai_base_url`、`ai_model`、`ai_timeout_seconds`、`ai_max_output_chars`、`ai_idempotency_processing_ttl_seconds`
- 产品 agent 适配：`bazi_agent_url`、`bazi_agent_secret`★、`bazi_agent_timeout_seconds`
- 研究/风控：`bazi_experiment_retention_days`、`bazi_public_prediction_ip_limit`、`identity_rate_limit_window_seconds`
- 合规目录：`assessment_professional_partner_directory_json`
- 运行：`platform_env`、`platform_secret`★
★ = 服务端密钥，绝不进入产品/浏览器。

---

## 5. 三张清单

### 5.1 必须留平台（bound / 治理 / 安全 / 支付）
1. **全部产品表与数据**：`assessment_interpretations`、`bazi_predictions`、`bazi_blind_test_sessions`、
   `bazi_prediction_versions`、`bazi_prediction_experiments`、`bazi_research_exports`、`bazi_reports`、
   `bazi_comparisons` + 18 个迁移（同意书/保留期/软删/导出授权在此）。
2. **研究/原始数据治理**：`products/assessment/admin_routes.py` 全部研究接口、`BaziResearchExport`、
   角色 `research:manage` / `assessment:raw_data:read|export`（经 `AdminService`）。
3. **专业转介绍合规**：`professional_partners.py` + `assessment.py` 校验/路由/审计（危机转介）。
4. **用量与计费**：`UsageService`、`ModelTokenRate`、`provider_usage_json`/`rate_version`/`cost_points`。
5. **身份/账户**：`AccountService`、`AuthService`。
6. **支付冻结耦合**（阶段 2 前）：`commerce.py` 的 guest 盲测绑定。
7. **运行时告警**（阶段 2 前）：`ops.py` 读 `AssessmentInterpretation`。
8. **retention 清理**（阶段 2 前）：`main.py` 调用产品 purge。
9. **secret**：`bazi_agent_secret`、`ai_api_key`、`platform_secret`。

### 5.2 可迁出（纯计算，无平台依赖）
- 盲测评分与 MBTI 轴推导、预测叙事组装、五维分数解析/夹取、`bazi_comparison` 打分、
  research feature snapshot / hash、提示词与文案。
- `bazi_provider.py` 的**响应归一化与契约校验**（transport 层保留在平台网关）。
- 纯工具：`core.errors` / `core.security` 里被用到的无状态函数（可随计算复制或共享包）。

### 5.3 需泛化（能力留平台，命名去产品化）
| 现形态 | 泛化后 |
|---|---|
| `commerce.py` guest 盲测绑定（产品字面量 + 产品模型） | 通用「支付后一次性交付」原语（产品注册交付物） |
| `ops.py` 读 `AssessmentInterpretation` | 通用「异步任务运行时告警」查询接口 |
| `main.py` 产品 purge 任务 | 通用「产品域 retention 注册 + 调度」 |
| `bazi_agent_url/secret` + `bazi_provider.py` 直连产品内部路径 | `/internal/ai/{capability}` 平台托管网关（HMAC/schema 版本/幂等） |
| `assessment_professional_partner_directory_json` | 通用「受审核转介目录」原语（仍归平台） |

---

## 6. 阶段 0 出口核对
- [x] 依赖方向图与交叉引用清单（§1–§3）
- [x] 配置与敏感项清单（§4）
- [x] 「必须留 / 可迁出 / 需泛化」三张清单（§5）
- [x] 数据与迁移归属确认（§5.1-1，配合 RFC D1）
- [ ] 平台 owner 会签三张清单（人工）
- [ ] 边界文档新增「assessment 迁移中」状态（平台侧改动，待批准）

---

## 附录 A（阶段 1 预备）：`/internal/ai/{capability}` 契约草案骨架

> 仅供评审；只定义契约，不含实现。

- **认证**：平台 → 产品方 HMAC（`X-Signature` + `X-Timestamp` + `X-Nonce`），密钥服务端持有；
  与 qmdj 现有 `bazi-personality` 内部签名同构（可平滑演进）。
- **版本**：`capability` + `schema_version`（请求/响应各自版本，独立演进）。
- **幂等**：`Idempotency-Key` 必填；重复键返回首次结果，不重复计费。
- **计量**：产品**不上报** token；由平台按响应内 `provider_usage`（若提供）与自身 rate version 计费。
- **能力示例**：`bazi-prediction`、`assessment-interpretation`（平台自带 provider 时可绕过网关直连）。
- **错误**：使用平台 `reason_code` 语义（不解析异常文本）；超时保守失败并 release。
- **兼容**：qmdj 旧 `/api/agent/bazi-personality` 保留一版；网关切换后进入弃用期。
