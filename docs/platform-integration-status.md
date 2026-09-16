# 平台接入状态

## 当前结论

本仓库现在只承载知几排盘代码；胜天半子已复制到独立仓库 `F:\shengtian`。生产平台合同暂仍是历史兼容的 **胜天半子** product code，知几专用 product code/access scope 尚未登记，不能自行改名。

截至 2026-09-16，知几正式域名的统一 OAuth/PKCE 登录入口和移动端
CAPTCHA 已完成生产验收。CAPTCHA/OTP 仍完全属于 Consumer Platform 与统一
官网登录边界；知几只负责发起授权、接收 callback 和恢复平台 session。

我已检查的平台仓库实现包括：

- `F:\\singularity-sequence-consumer-platform\\docs\\integration\\ai-agent-platform-integration-spec.md`
- `F:\\singularity-sequence-consumer-platform\\apps\\api\\app\\services\\bootstrap.py`
- `F:\\singularity-sequence-consumer-platform\\apps\\api\\app\\services\\industry_catalog.py`
- `F:\\singularity-sequence-consumer-platform\\apps\\api\\app\\services\\commerce.py`

## 已确认的平台种子产品

当前平台内置种子产品包括：

- `coach-web`
- `creator-hub`
- `teamspace-pro`
- `shop-growth`
- `health-assistant`
- `zhongfu`
- `guanxiang`
- `shengtian-banzi`
- `singularity-pass`

其中：

- `zhongfu` 对应 `zhongfu-core`
- `guanxiang` 对应 `guanxiang-core`
- `shengtian-banzi` 对应 `shengtian-banzi-core`

## 对本仓库的影响

`胜天半子` 目前**不应硬编码复用** `zhongfu` 或 `guanxiang`。

原因：

- 这是一个全新的产品
- 平台文档要求新产品必须先注册唯一 `product_code`
- `access_scope` 也必须按该产品单独定义
- 平台支付、套餐、gate 都依赖这两个正式值

## 当前正式命名

平台侧已确认该产品使用：

- `product_code`: `shengtian-banzi`
- `access_scope`: `shengtian-banzi-core`

## 当前仓库已完成

仓库已经按“新产品接平台”的模式做好这些能力：

- 平台登录会话恢复
- 平台套餐拉取
- 平台下单
- 平台支付尝试创建
- 平台支付结果恢复页
- 平台 gate 控制 AI 分析

### 账户权益与 AI 请求的强制规则

“账户栏显示有余额”不等于“AI 请求已经授权”。两者必须通过同一账户 session 连接：账户权益可用时，Agent 请求必须带平台 Bearer token，并且不能被旧 guest checkout token 覆盖。兑换后必须重新读取 gate/usage、同步全部 Agent state 并清空 guest 状态。

详细流程、测试矩阵和发布验收见 [`docs/AI_ACCESS_RUNBOOK.md`](./AI_ACCESS_RUNBOOK.md)。

也就是说，代码结构已经准备好，当前可以直接按正式参数联调。

## 平台侧当前已确认

平台侧当前已具备：

1. 正式 `product_code`
2. 正式 `access_scope`
3. 基础套餐：
   - `shengtian-banzi-trial`
   - `shengtian-banzi-monthly`
   - `shengtian-banzi-yearly`
4. 产品目录与套餐接口暴露
5. 行业目录入口：
   - `GET /api/v1/commerce/products/shengtian-banzi/plans`
   - `GET /api/v1/commerce/industries/metaphysics_workbench/launch`

生产环境已经验证：

1. 平台生产 API：`https://api.singseq.com`
2. 健康检查：`GET /healthz`
3. 套餐接口：`GET /api/v1/commerce/products/shengtian-banzi/plans`
4. 行业入口：`GET /api/v1/commerce/industries/metaphysics_workbench/launch`
5. 数据库迁移：生产环境 migration head 已对齐
6. seed 状态：生产环境已包含 `shengtian-banzi` 产品、三档套餐与行业入口
7. OAuth callback：`https://qmdj.singseq.com/auth/platform-callback`
8. CAPTCHA：平台运行 `667f2aa`（form-urlencoded siteverify）；官网运行
   `20260916-214725-16c0b67`（canonical Cap endpoint）；真实移动端用户确认原
   “验证失败”已消失

## 当前仓库需要填写的环境变量

```text
NEXT_PUBLIC_PLATFORM_BASE_URL=https://api.singseq.com
NEXT_PUBLIC_PLATFORM_PRODUCT_CODE=shengtian-banzi
NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
PLATFORM_BASE_URL=https://api.singseq.com
PLATFORM_PRODUCT_CODE=shengtian-banzi
PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
```

## 当前建议

不要继续猜测产品号或复用其他产品配置，直接使用正式注册值。

正确顺序是：

1. 把正式 `product_code / access_scope` 填入本仓库环境变量
2. 把平台地址统一指向 `https://api.singseq.com`
3. 保持正式 callback 与平台 `return_url` 白名单一致；域名或路径变化时重新登记
4. 任何平台/官网/CAP 发布后重新跑真实移动 CAPTCHA、OTP、OAuth callback 与 gate 联调

注意：CAPTCHA 成功、短信发送、OTP 验证和 OAuth 回跳是四个独立证据点。
2026-09-16 的用户确认覆盖此前失败的 CAPTCHA 交互，不应被扩大解释为新的
短信发送或完整登录审计记录。
