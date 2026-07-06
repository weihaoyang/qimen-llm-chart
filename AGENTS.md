# AGENTS.md

## 项目定位

本仓库是**胜天半子**的产品仓库，不是公司级统一身份、支付、订阅、entitlement 平台仓库。

本仓库负责：

- 产品自己的 UI
- 奇门 / 八字 / 紫微 / 三盘联合的领域逻辑
- 产品自己的工作台状态
- 产品自己的 AI 分析编排

本仓库不负责：

- OTP 登录后端
- 公司统一用户库
- 订单真相
- 支付结果真相
- subscription 真相
- entitlement 真相

## 开始工作前必须先读

任何 Agent 在本仓库开始工作前，必须先阅读以下平台文档：

1. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\ai-agent-platform-integration-spec.md`
2. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\product-integration-guide.md`
3. `F:\\singularity-sequence-consumer-platform\\docs\\integration\\new-product-platform-launch-checklist.md`

如果任务涉及登录、账户、支付、会员、订阅、gate、上线接入，必须先按这些文档执行。

## 当前产品平台参数

这是一个已在平台正式注册的新产品。

- 产品名: `胜天半子`
- 正式 `product_code`: `shengtian-banzi`
- 正式 `access_scope`: `shengtian-banzi-core`
- 产品主域名: `由当前部署环境决定，接入前必须同步到平台 return_url 白名单`
- 预发域名: `由当前部署环境决定，接入前必须同步到平台 return_url 白名单`
- 产品主入口路由: `/`
- 受限能力入口路由: `/`
- 登录入口路由: `/`
- 购买入口路由: `/`
- 支付结果页路由: `/billing/result`
- 平台登录回跳页路由: `/auth/platform-callback`

## 平台接入硬约束

### 1. 登录

必须复用 Consumer Platform 登录能力。

禁止：

- 自己实现 OTP 后端
- 自己发 access token 作为公司统一会话真相
- 自己建一套公司级用户表

### 2. 套餐与订单

必须从平台获取产品套餐，并通过平台创建订单与支付尝试。

禁止：

- 产品仓库自己维护订单真相
- 产品仓库自己决定“支付成功”

### 3. 权限放行

任何受限 AI 能力在进入前都必须查询平台 gate。

禁止：

- 根据前端支付回跳页面直接放行
- 根据本地缓存猜测会员状态
- 通过产品自己的“会员表”替代平台 gate

### 4. 数据边界

本仓库存自己的业务数据，不直接修改平台真相表。

如果数据表达的是以下语义，则应属于平台：

- 用户是谁
- 买了什么
- 是否已支付
- 是否有 entitlement
- 是否允许进入

## 当前已完成的接入状态

- 已接平台 `web-sdk`
- 已接平台社交登录回跳恢复
- 已接平台套餐拉取
- 已接平台下单与支付尝试创建
- 已接平台支付结果恢复页
- 已接平台 gate 控制 AI 分析

## 平台生产状态

- 平台生产 API：`https://api.singseq.com`
- 生产环境已部署到包含 `shengtian-banzi` 的版本
- 生产环境 seed 已包含 `shengtian-banzi` 产品、三档套餐与 `metaphysics_workbench` 行业入口
- Alipay 当前可用；WeChat Pay 尚未配置完成
- 产品上线前仍需把产品自己的正式域名加入平台 `return_url` 白名单

## 标准接入流程

当任务涉及平台接入时，按这个顺序推进：

1. 确认本产品 `product_code` 与 `access_scope`
2. 接平台登录
3. 接平台套餐获取
4. 接平台订单创建
5. 接平台支付尝试创建
6. 接平台支付结果恢复
7. 接平台 gate
8. 用 gate 接管 AI 分析入口
9. 最后再做上线联调

## 进入 AI 分析前的标准判断

进入任何付费 AI 分析能力前，必须先问平台：

- `GET /api/v1/entitlement/products/{product_code}/gate?access_scope=...`

只有 gate 返回允许，前端和后端才都可以继续。

## 推荐使用的接入方式

### Web / TypeScript

优先使用：

- `@singularity-sequence/web-sdk`
- 平台社交登录回跳链路

## 你在本仓库中修改代码时要主动检查

每次涉及平台接入，都主动检查以下问题：

- 有没有偷偷新建一套登录逻辑
- 有没有偷偷新建一套会员判断
- 有没有直接根据支付回跳判断支付成功
- 有没有跳过 gate
- 有没有把平台职责拉进产品仓库

如果有，优先修边界，不要继续叠功能。
