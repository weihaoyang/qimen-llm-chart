# 平台接入状态

## 当前结论

本仓库对应的是平台内已经正式注册的产品：**胜天半子**。

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
3. 确认产品自己的线上域名已经加入平台 `return_url` 白名单
4. 再跑一次真实登录、支付回跳与 gate 联调
