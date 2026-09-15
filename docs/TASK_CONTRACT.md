# Current task contract

```yaml
task: '知几排盘工作台本地开发收口与平台接入验证'
objective_key: 'qmdj-paipan-local-completion-20260913'
ownership_key: 'qmdj-paipan-workbench'
owner: 'main'
mode: 'completed_locally'
scope:
  include:
    - '保持 /paipan 为知几产品唯一主入口并完整复用参考排盘前端'
    - '验证奇门、八字、紫微、三盘联合及分析能力的后端接入与本地持久化'
    - '保持账户、套餐、支付、entitlement 与 AI gate 由 Consumer Platform 统一负责'
  exclude:
    - '把术数结论作为现实事实、预测保证或真实概率'
    - '新增未经授权的模型调用、真实扣款测试或生产部署'
    - '改动统一账户、支付、订单、entitlement 和平台 gate 真相'
invariants:
  - '排盘领域逻辑与工作台状态保持在产品边界内，不复制平台账户/支付真相'
  - '受限 AI 入口和后端 API 均先查询平台 gate，失败默认拦截'
  - '支付回跳只用于恢复流程，不直接推断支付成功或权益'
  - '新功能不能把 SQL 写入组件或建立第二套用户/订单/会员真相'
  acceptance:
  - '排盘类型、数据库迁移、领域服务和确定性规则测试通过'
  - '/paipan 首屏与核心 API 通过真实数据库/HTTP 的最小闭环验证'
  - '分析、登录恢复、支付恢复和 gate 在独立模块中实现，产品数据边界清晰'
  - '相关 TypeScript、lint、目标测试和生产构建通过；未授权前不部署'
status: 'completed_locally'
next_action: '继续维护本地验证证据；未经明确授权不部署、不推送、不提交'
```
