# 知几产品边界

## 当前仓库

- 知几排盘：入口 `/paipan`，生产域名 `qmdj.singseq.com`。
- 胜天半子：独立产品仓库和生产域名 `shengtian.singseq.com`。

## 共享边界

Casdoor 是唯一身份提供方。SingSeq Platform API 与 Kill Bill 分别负责账号/权益接口和支付事实；产品统一通过固定版本的 `@singseq/platform-sdk` 接入，不得维护平行账号、支付或权益接口。

## 迁移状态

知几源码已固定使用唯一 SDK；产品标识和授权范围为 `qimen` / `qimen-core`。生产 OAuth client 登记、账户/额度验收及新产品镜像发布仍待完成，切换前保持发布门禁关闭。
