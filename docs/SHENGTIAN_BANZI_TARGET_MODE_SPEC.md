# 胜天半子：目标模式实施规格

版本：v1.0 · 2026-08-20
状态：实现基线，不是演示稿

## 1. 产品边界

胜天半子是现实硬约束下的非对称博弈终端。它管理的是战局、事实、资源、窗口、行动、结果和校准，不管理“命运结论”。术数只作为可关闭的时间/心理观察叠层；关闭后，战局主链仍完整可用。

每个能力必须经过这条因果链：

```text
事实/约束 → 默认重力线 → 交叉点 → 三手策略 → 落子版本
→ 执行与断路器 → 物理结果 → 冷酷复盘 → 个人档案
```

禁止：泛聊天代替战局、模型输出直接成为事实、静态假按钮、前端支付结果代替平台 gate、协作者直接覆写所有者事实、把附件二进制塞数据库。

## 2. 分层架构

### 2.1 领域层

`src/lib/battle/types.ts` 是唯一公共类型契约；`rules.ts` 是无副作用确定性规则；`service.ts` 编排加载、扫描和版本生成；`repository.ts` 与 `extended-repository.ts` 负责持久化和 ownership 检查。UI 不写 SQL，不依赖旧 `agent_*` state。

### 2.2 数据层

- `battle_cases`：战局主对象和 platform subject owner。
- `battle_facts`：事实、假设、未知、目标、情绪，带来源和置信度。
- `battle_constraints`：现金、时间、法律、合同、健康、关系、声誉等红线。
- `battle_inventory_items`：硬筹码、数量、可用性、期限、成本和证据。
- `battle_resource_snapshots`：资源快照版本。
- `battle_gravity_lines`：默认重力线版本。
- `battle_junctions`：现实交叉点和窗口半衰期。
- `battle_moves`：强攻/试局/对冲策略版本。
- `battle_move_actions`：行动清单与实际执行状态。
- `battle_breakers`：现金、时间、关系、健康、法律、假设和机会断路器。
- `battle_commitments`：不可静默覆盖的落子令版本。
- `battle_timeline_nodes/edges`：时间—因果图；反事实边永远标为 `counterfactual`。
- `battle_opportunities`：行动窗口及关闭、衰减和状态。
- `battle_reviews`：结果、事实变化、诊断和下一调整。
- `battle_strategy_profiles`、`battle_resource_allocations`、`battle_playbook_entries`、`battle_calibration_events`：跨战局档案。
- `battle_collaborators`：受邀/active/revoked 协作者及角色。
- `battle_advice`：顾问意见独立层；所有者采纳时才创建事实或行动记录。
- `battle_attachments`：证据元数据；对象存储负责二进制。

迁移按 `001`—`006` 顺序执行，`ops/migrate.mjs` 以 SHA-256 记录并在已执行迁移被修改时 fail-closed。

## 3. 用户功能清单

### 3.1 开局采集

用户创建战局并填写标题、目标、最低结果、理想结果、对手/重力来源和硬期限。之后可逐条录入现实事实；事实必须选择类型、来源、置信度和时间。输入不足时只提示缺失变量，不补造事实。

### 3.2 冷酷底牌

录入现金、固定支出、净现金流、每周可投入小时、已承诺小时、压力耐受天数；系统计算现金跑道和时间余量。录入硬筹码、人际信用和红线，并保存版本化快照。

### 3.3 默认重力线

确定性规则根据目标、期限、约束、资源和筹码生成常规路径摘要、资源成本、失败原因、不可变变量和不确定性。它是基准情景，不是成功概率或人生预言。

### 3.4 现实交叉沙盘

用户可创建事实、选择、资源、风险、机会、行动和结果节点，并用导致、加速、阻断、依赖、冲突、重复、验证、继承、传导或幽灵对照连线。已发生事实、假设、推演和验证结果必须在 UI 中颜色与标签分层。

### 3.5 机会雷达

登记公开、合法的机会和关闭时间，展示最佳行动时点、衰减原因、资源冲突和错过后的物理代价。当前提供持久化与读取；通知渠道需在确定 Web Push/日历/邮件契约后单独实现，不在产品内自造发送系统。

### 3.6 三手推演

每个交叉点生成：

1. 强攻手：集中稀缺筹码击穿单点；
2. 试局手：低成本探针验证假设；
3. 对冲手：锁定底线、停止承受不可逆损失。

每一手都必须有关键变量、动作、执行人、期限、资源成本、上行、最坏结果、承伤上限、成功信号、证伪条件、验证期限、止损线和下一手。`0.5 Delta Index` 只表示夺回的选择权，不表示成功率。

### 3.7 落子执行

选择策略后创建不可覆盖的 commitment 版本，生成行动清单、执行状态、资源消耗、附件引用、验证信号和止损条件。改线只能创建新版本并记录变化原因。

### 3.8 风险断路器

断路器触发后立即停止 move 和 active commitment，记录触发时间与原因，把战局恢复到可重开推演状态。不得用文案鼓励越过用户自己设置的红线。

### 3.9 冷酷复盘

复盘比较当时信息和后来事实，分别诊断信息、推理、资源、时间、风险、执行和关系误差；不能用结果倒推当时决策质量。复盘结果进入 calibration 和长期档案。

### 3.10 协作意见分层

active 的 advisor/contributor 可提交意见，意见显示作者、依据和不确定性。只有 owner 可将意见明确采纳为事实、未来行动或仅作参考；原意见、采纳人、采纳时间和目标记录 ID 永久保留。协作者不能直接修改 facts、gravity、moves 或 commitments。

### 3.11 证据引用

owner 可登记合同、报价、纪要、数据、截图等外部 HTTPS 或对象存储引用的元数据：文件名、媒体类型、大小、校验和、目标对象和存储引用。当前不接收二进制上传；接入对象存储时必须实现预签名 adapter，并复用同一 ownership 规则。

### 3.12 长期档案

跨战局保存资源冲突、私有打法、用户逐条确认的匿名案例、校准事件和战略画像。匿名共享不是默认行为；共享记录不得携带账户标识。

### 3.13 报告与数据权利

战局可导出 Markdown/JSON 战报，包含战局、事实、重力线、交叉点、策略、落子、时间线、机会、复盘、分层意见和证据引用。删除、访问控制和平台账户身份保持边界，不在本仓库建立第二套用户真相。

删除使用 `DELETE /api/battles/[id]`，请求体必须包含 `{"confirmation":"DELETE"}`；只允许 owner 执行，数据库级联删除战局及其事实、策略、执行、时间线、附件和资源关联。

### 3.14 现实推演官

`/api/battles/[id]/copilot` 复用统一平台 gate 与用量 reserve/commit/release，只把当前 Battle Domain 的结构化上下文送入模型。推演结果默认不持久化、不改事实、不替用户落子；失败释放预留用量。前端明确标识“审查批注”，用户若要入账必须通过事实、行动或顾问意见的显式保存动作。

## 4. API 契约

主 API：`/api/battles`、`/[id]/facts`、`constraints`、`inventory`、`resources`、`analysis`、`copilot`、`moves`、`commitments`、`timeline`、`opportunities`、`reviews`、`report`、`collaborators`、`advice`、`attachments`。

档案 API：`/api/battles/allocations`、`playbook`、`calibration`、`profile`。

所有 API：

- 通过平台 `requireAccountSubject` 获取身份；
- owner 写入默认只允许 owner；active collaborator 只读主战局；意见另有 advisor/contributor 写入权限；
- UUID、枚举、长度、日期、数值和 JSON 对象在边界校验；
- 错误必须返回明确状态和可重试信息，不能吞错；
- 任何 `anonymous_pool` 或意见采纳均需要显式动作。

## 5. 验收门槛

### 本地门槛

```text
npx tsc --noEmit --pretty false
npx eslint src/components/battle-command-center.tsx src/components/battle-collaboration-panel.tsx src/lib/battle src/app/api/battles
npx vitest run src/lib/battle src/components/app-shell.test.tsx --reporter=dot --testTimeout=60000
npm run build
```

### 数据库/HTTP 门槛

在真实 `DATABASE_URL` 下依次执行 `npm run db:status`、`npm run db:migrate`，确认 `003`—`006` 已应用；使用 owner、active collaborator、第三方三种身份完成创建战局、保存事实、扫描、落子、断路器、复盘、时间线、机会、意见采纳、附件引用和跨 subject 拒绝测试。

### 发布门槛

未完成真实数据库/HTTP 冒烟、线上拓扑确认、备份、重建容器、迁移头、healthz 与不扣款冒烟前，不得声称上线。支付、账户、entitlement 和 gate 仍由统一平台负责。

## 6. 未伪装成已完成的边界

- 已在隔离 PostgreSQL 与身份 gate mock 上执行 001–006 迁移和真实 HTTP 闭环；生产环境仍须在其真实 `DATABASE_URL`、平台 gate 与服务器拓扑上执行发布门槛。
- 主动通知尚未绑定合法渠道。
- 二进制附件上传等待对象存储契约。
- 术数叠层仍是可选参考，不参与现实事实、重力线或策略字段。
- 不以任何命理赛事或模型离线命中率宣传现实预测准确率。
