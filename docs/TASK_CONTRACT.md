# Current task contract

```yaml
task: '让 Agent 决策工作区成为可恢复、可复盘的正式产品能力'
objective_key: 'qmdj-agent-workspace-durability-20260812'
ownership_key: 'agent-product-workspace-postgres'
owner: 'main'
mode: 'implementation'
scope:
  include:
    - '平台主体 ownership 下的人生议题、访谈、证据快照和决策树业务数据'
    - '服务器工作区创建、保存、恢复和切换的正确性'
    - '产品专属 PostgreSQL 迁移与运行时安全'
    - '现有平台 gate、reserve/commit/release 合同的保持'
  exclude:
    - '自建平台登录、用户、订单、支付或 entitlement 真相'
acceptance:
  - '未登录请求不能读取或写入 Agent 工作区'
  - '同一平台主体只能读取自己的 case'
  - '切换服务器 case 会恢复其访谈，而不是将当前对话写入另一 case'
  - '工作区保存不改变平台付费 AI 的 gate 与用量结算规则'
  - '生产服务、数据库迁移、主页和未登录 API 保护均有可复核证据'
verification:
  commands:
    - 'npm.cmd test -- --run'
    - 'npm.cmd run lint'
    - 'npm.cmd run build'
    - 'production curl homepage + unauthenticated /api/agent/cases + PostgreSQL table/service check'
status: 'implementing'
next_action: '使用已登录测试账户完成保存、刷新恢复、切换 case 和跨主体拒绝的端到端验证'
```
