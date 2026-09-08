# 知几 / 胜天半子边界

## 当前仓库

- `F:\qmdj`：知几排盘，入口 `/paipan`，生产域名 `qmdj.singseq.com`。
- `F:\shengtian`：胜天半子，入口 `/`，生产域名 `shengtian.singseq.com`。

## 共享边界

账户、登录、订单、支付、订阅、权益和 AI provider 仍由 Consumer Platform 作为唯一真相源。两个产品只能通过平台 API/SDK 访问这些能力。

## 迁移状态

胜天半子已从 qmdj 工作区复制为独立 Git 仓库并提交。qmdj 专用 host 通过代理进入 `/paipan`；生产切流完成前根路径保留兼容入口。旧 Vite 工程已移动到 `F:\shengtian-legacy-20260909` 作为可回滚归档。

生产平台合同目前仍沿用历史 `shengtian-banzi` product code，知几专用产品合同必须先在平台登记后才能切换，不能猜测新 code。
