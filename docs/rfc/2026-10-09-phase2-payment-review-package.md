# 阶段 2 解冻材料：支付冻结区泛化评审包

- 状态: Proposal（**需要独立支付评审**才能执行）
- 日期: 2026-10-09
- 配套: `docs/rfc/2026-10-09-platform-boundary-assessment-rfc.md`（阶段 2）、
  `docs/rfc/2026-10-09-phase0-assessment-inventory.md`
- 规则依据（平台自身）:
  - `singularity-sequence-consumer-platform/AGENTS.md` §8：单次分析状态语义、guest token、
    匿名下单重复创建为高风险点；支付语义不随结构重构迁移。
  - 平台 `docs/architecture/website-platform-product-boundary.md` §10「具名豁免」：
    `services/commerce.py` 的 guest 盲测报告绑定位于匿名下单支付冻结区，
    **重构该链路需单独走支付评审**。

---

## 1. 目的

在不改变支付语义的前提下，把 `commerce.py` 里对**产品模型/字面量**的依赖，替换为**平台通用原语**，
使阶段 2 的出口（`commerce.py` 不再出现产品字面量/产品模型、具名豁免移除）具备可评审、可回滚的方案。

**本文只申请评审，不代表已获批准，也不执行改动。**

## 2. 冻结区现状（精确代码面）

`apps/api/app/services/commerce.py`：

| 位置 | 现状 | 说明 |
|---|---|---|
| `:14` | `from app.db.models import BaziBlindTestSession, ...` | 核心区导入产品模型（具名豁免） |
| `:370-376` | `create_guest_order` 内 `blind_session = self.session.get(BaziBlindTestSession, request.blind_test_id)`，写 `blind_session.report_guest_token_hash` | 匿名下单时绑定「支付后一次性报告」 |
| `:409-425` | `_validate_bazi_report_binding(...)`：`select(BaziBlindTestSession).with_for_update()` + 校验 `session_token_hash`/`status`/`deleted_at`/`report_guest_token_hash` | 下单前校验盲测凭证与占用 |

调用链：匿名下单（`create_guest_order`）→ 若带 `blind_test_id` 则绑定；报告解锁走
`app/products/assessment` 的 guest 路径。

## 3. 拟议泛化设计（不改支付语义）

新增**平台通用原语**：`PostPaymentDeliverableBinding`（名称待定）

- 平台定义接口（`app/domain/` 或 `app/services/`）：按 `product_code + plan_code` 解析一个
  「一次性交付绑定器」，能力：
  - `validate_and_claim(context)`：校验凭证、占用锁（`FOR UPDATE`）、拒绝重复占用；
  - `bind_after_order(context)`：下单成功后写入绑定引用。
- `commerce.py` 只依赖该接口 + 注册表，不再 import 产品模型、不再出现产品字面量。
- 产品侧（`app/products/assessment`）注册自己的绑定器实现，内部仍操作 `BaziBlindTestSession`。
- 绑定器注册允许核心→产品的**组合根**装配（沿用 `main.py` / `api/router.py` 的组合根模式）。

关键约束（评审必须确认）：
- **不改变**：订单/支付尝试/payment-result/gate/reserve 的语义与顺序；
- **不改变**：guest token 的哈希/过期/幂等冲突处理；
- **不新增**：产品自己的订单真相或支付回调；
- 绑定失败路径的错误码与状态码保持与现状一致（`guest_bazi_binding_*`）。

## 4. 影响面

- 支付链路：匿名下单创建、幂等冲突分支、报告解锁前的绑定校验。
- 数据：`bazi_blind_test_sessions.report_guest_token_hash` 语义不变；无需迁移（仅代码组织变化）。
- 边界测试：`tests/test_product_boundary_contract.py` 的 `LITERAL_EXEMPT` / `MODEL_IMPORT_EXEMPT`
  将移除 `services/commerce.py`。

## 5. 验证与回归（必须全绿才可合入）

- `tests/test_commerce_and_callback_contract.py`
- `tests/test_bazi_blind_test_contract.py`
- `tests/test_product_boundary_contract.py`（豁免移除后必须仍绿）
- `tests/test_platform_startup_guardrails.py`
- 不扣款冒烟：匿名下单创建、幂等重复下单拒绝、绑定冲突拒绝、报告解锁查询。

命令（`apps/api`）：
```
.venv\Scripts\python.exe -m pytest tests/test_commerce_and_callback_contract.py tests/test_bazi_blind_test_contract.py tests/test_product_boundary_contract.py tests/test_platform_startup_guardrails.py -q
```

## 6. 风险与回滚

| 风险 | 缓解 |
|---|---|
| 触碰支付冻结区导致资金/回调回归 | 只做**结构替换**，语义零变化；保留错误码与顺序 |
| 绑定占用被绕过（重复绑定） | `with_for_update` 与唯一约束保持不变；测试覆盖重复占用 |
| 边界测试误放行 | 先加测试证明「核心不再触达产品模型」再删豁免 |
| 灰度 | 单 PR、可快速 revert；无 schema 迁移 |

## 7. 决策请求

1. 是否批准「支付后一次性交付」原语化的**结构替换**（语义不变）？
2. 绑定器接口放在 `app/domain` 还是 `app/services`？注册表由哪个组合根装配？
3. 是否允许在同一 PR 内移除 `commerce.py` 的边界豁免？

## 8. 非目标

- 不改订单/支付尝试/回调/退款/订阅/gate/reserve 的语义与端点。
- 不迁移 `bazi_*` / `assessment_interpretations` 表与数据（见 RFC D1）。
- 不做上线部署（另按平台 `AGENTS.md` §7/§9 执行）。

---

## 附：阶段 2 中**非支付冻结**的两项（可另行评审，但与上项同属阶段 2 出口）

| 位置 | 现状 | 泛化方向 | 是否冻结 |
|---|---|---|---|
| `app/api/routes/ops.py:11,83` | 只读 `AssessmentInterpretation` 做运行时告警 | 通用「异步任务运行时告警」查询接口/视图 | 否（仅具名豁免） |
| `app/main.py:16,31` | 组合根调用 `BaziPredictionService.purge_expired_experiment_payloads()` | 通用「产品域 retention 注册 + 调度」 | 否 |

这两项也建议随阶段 2 一起批准，否则阶段 2 出口无法达成（`评审批次`）。
