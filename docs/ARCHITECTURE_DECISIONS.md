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

### ADR-004 — 账户权益状态优先于旧游客会话

- Date: 2026-08-25
- Status: accepted
- Context: 邀请码兑换后页面已经显示账户剩余次数，但本地恢复的旧 guest Agent state 仍可能被选为共享请求状态，造成 `/api/agent` 没有 Bearer token，服务端按未授权拒绝。
- Decision: 当已认证账户存在可用平台权益时，所有 Agent 入口统一使用账户状态；兑换/登录成功后同步全部 Agent state 为 `account`，清空 guest checkout token/order。客户端余额只用于显示，服务端仍必须执行 gate → reserve → model → commit/release。
- Alternatives: 让账户和 guest 状态按最后写入时间竞争；只在 UI 层显示账户余额；依据本地余额直接放行。
- Consequences: 账户和游客主体不会串线；旧 guest 会话仍可在未登录账户路径使用，但不能覆盖已认证账户。需要在兑换、刷新恢复和 AI 请求头测试中锁定这一不变量。
- Evidence: `docs/AI_ACCESS_RUNBOOK.md`, `src/components/app-shell.tsx`, production release `20260825-2318-qmdj-agent-auth`, `/api/health`, `/api/version`.

### ADR-003 — 胜天半子以 Battle Domain 作为唯一产品业务核心

- Date: 2026-08-20
- Status: accepted
- Context: 原有 `agent_cases`、访谈和决策树能保存对话，但无法表达现实底牌、资源消耗、默认重力线、时间交叉点、行动版本、风险断路器和跨战局档案。继续在旧组件上增加字段会把产品变成不可验证的条件分支集合。
- Decision: 建立独立的 Battle Domain 层。领域对象包括 Battle、InventoryItem、GravityLine、Junction、Move、MoveAction、CircuitBreaker、TimelineNode、TimelineEdge、Review 和 StrategyProfile。数据库以版本化记录保存事实、假设、推演、行动和结果；UI/API 只能通过领域服务读写，不直接拼装 SQL 或把 AI 文本当作事实。
- Alternatives: 继续扩展旧 `agent_cases` 的 JSON；把所有状态放在 React；引入通用工作流/Agent 框架作为业务核心。
- Consequences: 需要新增迁移和 API，短期不能一次性删除旧工作区；通过适配层兼容已有付费用户的旧案例，新的战局全部走 Battle Domain。确定性规则负责约束、重力线、交叉点和断路器，AI 只负责在结构化输入上提出候选策略并注明依据。
- Evidence: `docs/SHENGTIAN_BANZI_PRODUCT_CONSTITUTION.md`，本次 Battle Domain 类型、迁移与规则引擎的单元测试。
## 2026-08-20 · 顾问意见与证据引用独立成层

- 决策：新增 `battle_advice`，顾问意见不能直接写入 `battle_facts`、`battle_moves` 或 `battle_commitments`；owner 必须显式采纳为 fact/action/reference，并保存 adopted record 与操作者。
- 决策：`battle_attachments` 本轮只提供受控外部引用元数据 API；禁止把二进制放进 PostgreSQL，直到对象存储 adapter 契约确定。
- 原因：保持事实、AI 推演、人工意见和证据来源可审计，避免协作直接覆写现实真相。
- 代价：真实文件上传和通知调度延后到其外部契约确定后，不用临时目录伪造生产能力。

## 2026-08-20 · Battle Copilot 只做不可持久化批注

- 决策：新增 `/api/battles/[id]/copilot`，复用平台 gate 和用量 reserve/commit/release；模型只读取结构化 Battle Domain 上下文。
- 决策：Copilot 输出默认不写入事实、策略或落子版本；用户必须通过显式保存/采纳动作改变领域状态。
- 原因：AI 不是现实真相源，同时保留模型对冲突、未知变量、验证信号和断路器的辅助价值。
- 约束：无平台权益、预留失败或模型失败时不生成结果；失败释放用量。

## 2026-08-21 · 分析快照必须可恢复，协作者不得被误判为 owner

- 决策：新增 `GET /api/battles/[id]/analysis` 作为已持久化重力线、交叉点和策略的只读快照；战局重新打开时 UI 直接恢复原选择，不要求重新扫描或重写版本。
- 决策：`getBattleAccess` 先用 `isBattleOwner` 判定 owner，再查询 active collaborator。不能用包含协作者的 `getBattle` 结果推断所有权。
- 原因：恢复性和授权边界都是 Battle Domain 的硬不变量；错误会导致状态看似存在但不可恢复，或 viewer/advisor 越权写入。
- Evidence: `src/app/api/battles/[id]/analysis/route.ts`, `src/components/battle-command-center.tsx`, `src/lib/battle/extended-repository.ts`。

## 2026-08-21 · 版本换线、机会历史与匿名输出边界

- 决策：已有 active commitment 时，创建新落子必须提交 `changeReason`；原因写入新版本快照，旧版本只转为 `superseded`，不静默覆盖。
- 决策：机会雷达更新采用按 ID upsert，历史 `acted/missed/closed` 不被开放窗口保存操作删除。
- 决策：匿名模式库读取时隐藏 `battleId`，写入 source 只保留匿名 provenance，避免把账户/战局标识带到共享结果。
- 决策：复盘 `diagnosis` 中带 expected/actual 的维度自动写入 calibration，形成“执行→结果→校准”闭环。
- Evidence: `src/lib/battle/repository.ts`, `src/lib/battle/extended-repository.ts`, `src/app/api/battles/[id]/commitments/route.ts`, `src/app/api/battles/[id]/reviews/route.ts`。

## 2026-08-29 · 官方目录由数据库承载，用户状态与目录版本隔离

- 决策：新增 `official_catalog_entries`，统一承载官方案例、AI 人格、世界脉搏、历史档案和技能模板的已发布版本；服务端以幂等种子写入，已发布版本不可被应用启动静默改写。
- 决策：用户仍通过 clone 生成自己的 `battle_cases` 和 `battle_scenario_snapshots`；目录记录只读，用户进度不写回目录。
- 原因：前端可见内容不能继续只依赖 TypeScript 常量，否则多实例、迁移和内容版本无法审计，且无法证明 clone 时使用的官方版本。
- 代价：首次目录请求需要数据库 readiness；发布新官方内容必须新增版本并显式切换 published 状态。
- Evidence: `database/migrations/019_official_catalog_entries.sql`, `src/lib/catalog/official-repository.ts`, 2026-08-29 catalog HTTP smoke。
