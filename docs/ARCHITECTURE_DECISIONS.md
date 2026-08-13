# Architecture decisions

Record only decisions that affect boundaries, data contracts, dependencies, deployment, safety, or reversibility.

## Format

### ADR-001 — title

- Date:
- Status: proposed | accepted | rejected | superseded
- Context:
- Decision:
- Alternatives:
- Consequences:
- Evidence:

### ADR-002 — AI 付费分析统一按平台主体结算

- Date: 2026-08-09
- Status: accepted
- Context: 原流程只使用游客 checkout token，登录账户无法复用平台订单、gate 和用量；支付回跳后也没有账户恢复分支。
- Decision: 账户购买使用平台 `createOrder` / `createPaymentAttempt`，游客仅用于平台允许的 `per_use` 计划；支付结果页重新查询平台 payment-result，账户再查询 gate；AI API 同时接受平台 Bearer session 或游客 checkout token，账户路径固定执行 gate → reserve → model → commit/release。
- Alternatives: 在产品仓库维护本地会员/订单状态；仅依据支付回跳参数放行；全部强制游客购买。
- Consequences: 产品只保存本次工作流恢复所需的临时订单上下文，平台继续作为身份、订单、支付和 entitlement 真相；账户和游客两条路径都可恢复，模型失败不会提交用量。
- Evidence: `src/app/api/agent/route.ts`, `src/app/billing/result/billing-result-client.tsx`, `src/lib/platform/browser.ts`, targeted route tests.
