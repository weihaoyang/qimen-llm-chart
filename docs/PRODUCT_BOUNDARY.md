# 知几产品边界

## 当前仓库

- 知几排盘：入口 `/paipan`，生产域名 `qmdj.singseq.com`。
- 胜天半子：独立产品仓库和生产域名 `shengtian.singseq.com`。

## 共享边界

Casdoor 是唯一身份提供方。SingSeq Platform API 与 Kill Bill 分别负责账号/权益接口和支付事实；产品统一通过固定版本的 `@singseq/platform-sdk` 接入，不得维护平行账号、支付或权益接口。

## 当前接入

产品标识 `qimen`，OAuth scopes 为 `account.read usage.write`。
生产客户端已登记，账户恢复、实际 AI 用量预留/结算及统一平台付款、退款已验收。
生产发布统一由基础设施仓库 GitOps 管理，见 [发布说明](RELEASE.md)。
