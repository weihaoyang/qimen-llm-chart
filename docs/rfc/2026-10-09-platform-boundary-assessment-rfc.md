# RFC: 平台边界归位 —— assessment 产品域迁出评估

- 状态: Proposal（待平台 owner 评审）
- 日期: 2026-10-09
- 范围: `singularity-sequence-consumer-platform`（主体），牵涉 `qmdj`
- 作者: 知几（qmdj）产品侧
- 说明: 本文是提案，不是执行记录；不修改平台仓库代码或线上配置。

---

## 1. 摘要

平台已经把「产品域代码」收进 `app/products/<product>/`，并用可执行的边界合同测试强制：
核心区不得 import 产品包、产品 code 字面量只能出现在 `catalog` 与 `products`、产品表只能声明在
`db/models/product.py`、组合根只允许 `main.py` / `api/router.py`。

当前**唯一产品域是 `assessment`**（八字预测、盲测、AI 解读、测评、专业转介绍），约 4,800 行。

结论（推荐）：**不做「整体迁出」的粗粒度搬迁**；做 **C 选项：把通用能力留在平台并泛化，
把 assessment 的产品业务与数据迁回 assessment 产品仓库**。平台只保留四类与其职责绑定的能力：
provider secret 适配、匿名支付绑定、用量计费、研究/原始数据治理。

直接搬迁的风险是：会把「支付冻结区」和「平台治理数据」一起搬走，违反平台自身文档
（`docs/architecture/website-platform-product-boundary.md` §10、具名豁免）。

---

## 2. 现状（证据）

### 2.1 平台侧的边界治理已经存在且被执行
- `docs/architecture/website-platform-product-boundary.md` §10 定义了 `app/products/<product>/`
  是产品域代码位置，并写明「当前唯一产品域：assessment」。
- `apps/api/tests/test_product_boundary_contract.py`（233 行）把这些规则变成红灯：
  - `test_core_does_not_import_product_package`
  - `test_core_has_no_product_code_literals`
  - `test_core_does_not_import_product_models`
  - `test_product_tables_are_defined_only_in_models_product_module`
  - `test_product_files_are_absent_from_core_locations`（防止迁回核心）
- 具名豁免（是决策，不是漂移）：
  - `app/services/commerce.py` —— guest 盲测报告绑定（产品/套餐字面量 + `BaziBlindTestSession`），
    位于匿名下单「支付冻结区」。
  - `app/api/routes/ops.py` —— 只读引用产品异步任务表做平台运行时告警。

### 2.2 assessment 产品域规模
| 文件 | 行数 | 职责 |
|---|---|---|
| `products/assessment/services/bazi.py` | 1054 | 八字预测主流程 |
| `products/assessment/services/ai_interpretation.py` | 763 | AI 解读 |
| `products/assessment/services/bazi_blind_test.py` | 713 | 公开盲测 |
| `products/assessment/services/bazi_research_admin.py` | 495 | 研究后台 |
| `products/assessment/services/bazi_prediction_registry.py` | 347 | 预测版本登记 |
| `products/assessment/schemas.py` | 356 | 契约 |
| `products/assessment/services/bazi_provider.py` | 241 | provider 适配（HMAC） |
| `products/assessment/{routes,admin_routes,admin_schemas,assessment,bazi_comparison,bazi_research_data,professional_partners}.py` | ~900 | 路由/管理/其它 |

### 2.3 与 qmdj 的双向耦合（关键）
- 平台 `SS_BAZI_AGENT_URL=https://qmdj.singseq.com/api/agent/bazi-personality`
  （`apps/api/.env.prod.example:85`，`core/config.py:137-140`）。
- 即：**平台的 assessment 服务调用 qmdj 的内部 HMAC 接口** `app/api/agent/bazi-personality/route.ts`
  （此前审计标记为「前端未调用」——它其实被平台调用，是跨仓内部合同）。
- provider secret 由平台把持：`config.py:138 bazi_agent_secret`，注释明确「assessment 站点看不到」。

### 2.4 平台拥有的数据与治理
- 产品表只允许在 `app/db/models/product.py`：`bazi_*` / `assessment_interpretations`。
- 研究/原始数据权限（`docs/architecture/platform-superadmin-and-raw-assessment-access.md`）：
  `research:manage`、`assessment:raw_data:read`、`assessment:raw_data:export`，保留期/删除/审计。
- 匿名支付 → 一次性报告绑定在 `commerce.py`（冻结区）。
- AI 计量经 `UsageService`。

---

## 3. 问题陈述

1. **平台承载了产品业务**：`bazi/mbti/blind-test` 等领域逻辑与产品表在平台仓库，平台有成为
   「产品业务后端杂糅容器」的倾向（正是 §7「平台绝对不能做」的边界）。
2. **跨仓反向依赖**：平台 service 直接 HTTP 调 qmdj 的内部端点，contract 未版本化、无统一
   网关；qmdj 侧改这个内部接口会静默影响平台 assessment。
3. **产品边界文档要求 assessment 留在此处**，所以「迁出」必须先改治理，否则边界测试会失败，
   迁移缺少合法出口。

---

## 4. 方案选项

### A. 维持现状 + 加固（最小改动）
保持 `app/products/assessment`，但：
- 把跨仓调用升格为**版本化内部合同**（`/internal/ai/bazi/predictions` v1，带 schema 版本与
  幂等键），不再裸露产品内部路径；
- 给 assessment 产品域加行数/依赖预算（例如 core import 白名单）与更多边界测试。

优点：零数据迁移风险，符合现有治理。
缺点：平台仍长期持有产品业务与产品数据，「第二个 AI 产品」进来时会复制这套结构。

### B. 整体迁出 assessment（用户提出的方向）— 已被 D1 否决
把 `app/products/assessment/*` 与 `bazi_*`/`assessment_interpretations` 表全部搬到 assessment
产品仓库，平台删除该产品域。

优点：平台回到「认人、收钱、发权」。
否决原因（见 §8 D1）：产品表是**平台治理的研究/原始数据**（同意书版本、保留期、软删、导出授权、
superadmin 原始读取），且 `ops.py` 直接读 `assessment_interpretations` 做运行时告警；整体搬迁会
搬空平台治理与运维视图，并触发支付冻结区。**选项 B 不再作为候选。**

### C. 混合：泛化平台原语 + 迁出产品业务（推荐）
把平台里**与职责绑定的通用能力泛化**，其余产品专属**计算逻辑**迁回产品仓库；**数据与治理留在平台**。

- 留在平台（泛化命名，保持平台职责）：
  1. **内部 AI provider 网关**：通用 `/internal/ai/{capability}`（HMAC + schema 版本 + 幂等），
     替代写死 `SS_BAZI_AGENT_URL`；provider secret 与速率版本只在平台；
  2. **匿名支付绑定**：把 guest 下单→一次性产物的绑定抽象为通用「支付后一次性交付」原语；
  3. **用量计费**：`UsageService` + `provider_cost_points`（平台自有计费与对账）；
  4. **研究/原始数据治理与数据**：`bazi_*` / `assessment_interpretations` 表、同意书、保留期/软删、
     导出授权（`bazi_research_exports`）、superadmin 原始读取、`ops.py` 运行时告警视图 —— **全部留平台**；
  5. **专业转介绍合规目录**：`professional_partners`（见 D4）。
- 迁回 assessment 产品仓库（仅**计算/业务规则**，不含表与数据）：
  - `bazi.py` / `bazi_blind_test.py` / `bazi_comparison.py` / `ai_interpretation` 的**业务规则与提示词**；
  - `bazi_research_admin`、`assessment` 中与产品研究流程相关的**计算部分**。
- 对外 `/api/v1/assessment/*` 路径保持不变，由平台以适配器委托到产品侧计算（见阶段 3）。
- 平台保留的 `app/products/assessment` 迁完后只作**薄适配器**（鉴权、计费、治理、委托计算）。

---

## 5. 迁移步骤（按 C 选项，逐阶段可验证）

### 阶段 0｜冻结与测量（1 周）
- 对 assessment 产品域做调用图：谁调用谁、DB 表、secret、guest 流程。
- 产出「必须留平台 / 可迁出 / 需泛化」三张清单，登记为具名豁免的收尾计划。
- 出口：清单评审通过，边界文档新增「assessment 迁移中」状态。

> **已完成（只读）**：盘点结果见配套文档
> [`docs/rfc/2026-10-09-phase0-assessment-inventory.md`](./2026-10-09-phase0-assessment-inventory.md)
> （依赖方向图、配置/敏感项、三张清单、阶段 1 网关契约草案骨架）。
> 待人工：平台 owner 会签三张清单 + 边界文档标注迁移状态。

### 阶段 1｜泛化内部 AI 网关（不改业务）
- 新增平台通用内部合同 `/internal/ai/{capability}`（HMAC、schema 版本、幂等键、超时/重试）。
- `bazi_provider.py` 改为调用该网关；qmdj 侧把内部端点挂到该合同下（保留旧路径一版兼容）。
- 出口：平台不再有 `BAZI_AGENT_URL` 专用配置；qmdj 内部接口版本化；契约测试绿。

> **契约草案已完成**：见
> [`docs/rfc/2026-10-09-internal-ai-gateway-contract.md`](./2026-10-09-internal-ai-gateway-contract.md)
> （HMAC/幂等/schema 版本/计量归属/qmdj 迁移映射/验收测试）。
>
> **实现状态（双侧，已提交并推送）**：
> - qmdj：新增 `POST /api/internal/ai/bazi-prediction`（双签名 + 能力绑定 + nonce 一次性）；
> - 平台：`app/integrations/internal_ai.py` + `SS_INTERNAL_AI_*` 配置 + `bazi_provider` **opt-in** 路由；
> - **默认行为不变**（未配置网关时仍走旧 `SS_BAZI_AGENT_URL`）；
> - 平台未部署：上线仍需按平台 `AGENTS.md` §7 走拓扑确认/备份/重建/迁移头/healthz/冒烟。

### 阶段 2｜泛化「支付后一次性交付」原语
- 把 `commerce.py` 的 guest 盲测绑定抽象为通用 primitives（产品注册「下单→可交付产物」）。
- 出口：`commerce.py` 不再出现产品字面量/产品模型；具名豁免移除；支付合同测试不变绿不算完。

> **已完成（owner 已批准支付重构，2026-10-09）**：
> - 新增核心 seam `app/domain/guest_deliverable.py`（注册表 + `GuestDeliverableClaim` + binder 协议）；
> - `commerce.py` 只解析并调用 binder，**不再 import 产品模型、不再出现产品/套餐字面量**；
> - assessment 规则迁到 `app/products/assessment/services/guest_deliverable_binder.py`，在组合根
>   `app/main.py` 注册；**错误码与判定顺序不变**；
> - 边界测试已**删除 `services/commerce.py` 的两处豁免**；
> - 验证：边界+启动 **32 passed**；commerce+盲测 **74 passed**。
>
> `ops.py` / `main.py` 两项属具名豁免/组合根允许，非阶段 2 出口要求，保持现状（可选后续优化）。

### 阶段 3｜计算迁出（灰度，数据不动）
- 在 assessment 产品仓库实现领域**计算**（预测/解读/盲测打分规则与提示词）；
  平台 `app/products/assessment` 变为「适配器 + 委托」，**表、数据、计费、治理仍在平台**。
- feature flag 在「平台内旧实现 / 产品侧新计算」间切换；对同一输入做**影子比对**（预测/解读输出一致率）。
- 对外 `/api/v1/assessment/*` 路径与响应结构不变（前端零改动）。
- 出口：影子一致率达标、无 P0/P1、回滚开关可用、`ops.py` 告警视图不受影响。

### 阶段 4｜治理收口
- 平台 `app/products/assessment` 收敛为**薄适配器**：鉴权、用量/计费、研究/原始数据治理、
  专业转介绍合规校验、委托计算；删除纯产品业务代码。
- 更新边界文档：assessment 仍登记为平台产品域，但只承载「受治理数据 + 治理逻辑 + 适配器」。
- `test_product_boundary_contract.py`：删除 `commerce.py` 具名豁免（阶段 2 后）；收紧产品域 import 白名单。
- 出口：`test_product_boundary_contract.py`、`test_product_onboarding_contract.py`、
  `verify:singseq-integration` 全绿。

---

## 6. 风险与缓解

| 风险 | 级别 | 缓解 |
|---|---|---|
| 触碰支付冻结区导致资金/回调回归 | 高 | 阶段 2 只做**结构泛化**，不改支付语义；沿用支付合同测试 + 单独支付评审 |
| 跨仓计算委托导致预测/解读结果漂移 | 中 | 阶段 3 影子比对（同输入双实现一致率）；阶梯放量 + 回滚开关 |
| 把产品计算迁出后绕过平台治理 | 高 | 平台适配器保留鉴权/计费/研究治理/转介绍合规校验，只在最后一步委托计算 |
| 跨仓网关成为新单点 | 中 | 版本化内部合同 + 超时/重试 + 幂等键；qmdj 内部端点保留一版兼容 |
| 评估中心线上中断 | 高 | 对外路径不变、适配器切换；灰度 + 快速回滚开关 |
| 边界测试与文档不同步 | 中 | 每阶段必须「文档 + 测试」一起改，红即停 |

---

## 7. 治理改动清单（必须与代码同批）
1. `docs/architecture/website-platform-product-boundary.md` §10：更新「当前唯一产品域」表述与迁移状态。
2. `apps/api/tests/test_product_boundary_contract.py`：
   - 具名豁免 `commerce.py` 在阶段 2 后删除；
   - `test_product_files_are_absent_from_core_locations` 扩到 assessment 全量文件。
3. `app/catalog/registry.py`：assessment 产品/套餐保留（仍在平台售）；
   `app/catalog/integrations.py`：assessment 端点**保留**（数据与治理未迁出，端点边界不变）。
4. `apps/api/.env.prod.example`：`SS_BAZI_AGENT_URL` 改为通用 `INTERNAL_AI_*` 网关配置。

---

## 8. 决策（原「未决问题」的结论）

### D1｜assessment 产品数据：**留在平台 DB**（平台治理数据）
证据：
- `db/models/product.py` 的产品表不是普通业务数据，而是**受治理的研究数据**：`bazi_predictions`
  有 `storage_consent_version`/`retention_expires_at`/`deleted_at`/密文；`bazi_blind_test_sessions`
  有同意、盲测臂、加密快照与保留期；`bazi_research_exports` 是带撤销的导出授权；
- `docs/architecture/platform-superadmin-and-raw-assessment-access.md` 用 `research:manage` /
  `assessment:raw_data:read|export` 控制单条解密与批量导出；
- `app/api/routes/ops.py` 直接查 `assessment_interpretations` 做平台运行时告警。
结论：**表与数据不迁出**；选项 B（整体搬迁）被否决。迁出的只能是**计算逻辑**。
影响：迁移阶段不再有「数据搬迁 + 双写双读」这一高风险项。

### D2｜内部 AI 网关：**平台托管通用网关**（不是「产品自建 + 平台计量」）
证据：
- `bazi_provider.py` 用平台持有的 `settings.bazi_agent_url` + `bazi_agent_secret`（`config.py:137-140`
  明确 secret 不下发产品站）；
- `ai_interpretation.py` 走平台 provider + `UsageService` + `provider_rate_version`/`provider_cost_points`；
- 平台已经承担 token 计量、速率版本与对账。
结论：新建**版本化内部合同** `/internal/ai/{capability}`（HMAC、schema 版本、幂等键、超时/重试），
由平台统一持有 secret 与计费；产品（含 qmdj）作为**能力提供方**被平台调用，不再由平台写死产品内部路径。
影响：阶段 1 泛化 `SS_BAZI_AGENT_URL`；qmdj 内部端点挂到该合同下并保留一版兼容。

### D3｜迁移窗口：**不设大爆炸窗口**，用标志位 + 适配器灰度
证据：对外 `/api/v1/assessment/*` 是稳定合同；平台按迁移 head + readiness 发布；`commerce.py` 是支付冻结区。
结论：迁移与评估中心/知几的发版节奏**解耦**——由 feature flag 控制「旧（平台内）实现 / 新（产品侧计算）」，
一致性达标后切主、再删旧实现。最终切换点才需要与产品发版对齐。
影响：阶段 3 采用「适配器 + 影子比对」，不要求跨仓同日发布。

### D4｜专业转介绍：**平台治理**（合规/安全，不迁出）
证据：`professional_partners.py` 只接受经审核的 `verified` 目录（`counseling`/`psychiatry`/
`crisis_support`），强制 HTTPS、拒绝占位配置；`assessment.py` 强制**个人主体上下文**、按分诊级别
路由（`urgent → crisis/psychiatric`）、审计事件**白名单且不含筛查答案**。
结论：目录校验、路由规则、审计留平台；线索归属（`assessment.professional_referral_intent` 审计）
也是平台治理数据。迁出会绕过平台对**危机转介**的合规校验，**不允许**。
影响：`professional_partners` + 转介绍路由/审计留在平台产品域「薄适配器」内。


---

## 9. 非目标
- 不重构账户/订单/支付/权益/gate/用量生命周期（合同稳定）。
- 不改变对外 `/api/v1/assessment/*` 与平台公开合同。
- 不在本 RFC 内处理平台其它瘦身项（config 收敛、commerce/auth 拆分、SDK 拆分），另行提案。

---

## 10. 建议决策
采用 **C 选项**，按阶段 0→4 推进；每个阶段以「合同测试全绿 + 文档同步 + 灰度证据」为出口。

依据 §8 的四项决策：
- **D1** 数据/表留平台 → 迁移只搬**计算**，不谈数据搬迁；
- **D2** AI 走**平台托管通用网关**，secret 与计费不出平台；
- **D3** 不设大爆炸窗口，用 **feature flag + 影子比对** 灰度切主；
- **D4** 专业转介绍（合规/危机路由）**留平台**，不迁出。

因此：选项 B（整体迁出）已否决；选项 A（维持现状 + 加固）仅可作为阶段 1 前的临时态。
本 RFC 的最终形态是「**平台 = 受治理数据 + 治理逻辑 + 薄适配器；产品 = 计算与提示词**」。

