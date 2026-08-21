# Current task contract

```yaml
task: '胜天半子现实极限博弈终端目标模式重构'
objective_key: 'shengtian-battle-domain-rebuild-20260820'
ownership_key: 'shengtian-battle-domain'
owner: 'main'
mode: 'completed_locally'
scope:
  include:
    - '建立 Battle Domain 领域模型、版本化持久化与纯规则引擎'
    - '实现产品宪法中的 P0、P1、P2 功能，并保持付费、账户与平台 gate 边界'
    - '把现有 Agent 工作区作为兼容入口迁移到 Battle Domain，不再扩展旧决策树字段'
  exclude:
    - '把术数结论作为现实事实、预测保证或真实概率'
    - '新增未经授权的模型调用、真实扣款测试或生产部署'
    - '改动统一账户、支付、订单、entitlement 和平台 gate 真相'
invariants:
  - '现实事实、用户假设、AI 推演、行动结果必须有独立类型和来源，不能互相冒充'
  - '每一手行动必须有验证信号、硬期限和至少一个风险断路器'
  - '已落子版本不可被新结论静默覆盖；改线必须留下新版本与变化原因'
  - '术数默认为可选证据叠层，关闭后 Battle Domain 仍完整可用'
  - '新功能不能直接依赖旧 Agent UI state 或把 SQL 写入组件'
  acceptance:
  - 'Battle Domain 类型、数据库迁移、领域服务和确定性规则测试通过'
  - 'P0 API 与 UI 通过真实数据库/HTTP 的最小闭环验证'
  - 'P1/P2 功能在独立模块中实现，不把研究端工具暴露给普通用户；顾问意见、事实和 AI 输出保持分层'
  - '相关 TypeScript、lint、目标测试和生产构建通过；未授权前不部署'
status: 'completed_locally'
next_action: '如获上线授权，确认真实服务器拓扑后执行生产备份、迁移、重建、readiness 与无扣款冒烟；本轮不部署'
```
