# 知几平台接入状态

## 当前合同

- API origin：`https://platform.singseq.com`
- 产品：`qimen`
- 唯一 SDK：`@singseq/platform-sdk`，固定到 `8ba59cdc762602a34930101f6443bc6f9c2cdcbd`
- 账户：平台 OAuth + PKCE；产品 bridge 保存 HttpOnly 会话，平台 API 使用 Bearer。
- 用量：平台原生 reservation / consume / release API；AI 成功消费 reservation，失败释放。
- 支付及订单状态：由平台账单系统持有；产品端不维护副本。

产品坐标的唯一配置来源是 `singseq.product.json` 与 `config/ai-product-manifest.json`，当前均为 `qimen`。接入细节见 [PLATFORM_INTEGRATION.md](./PLATFORM_INTEGRATION.md)。

## 代码验证

平台浏览器和服务端适配层均调用 `@singseq/platform-sdk`。针对账户、额度和 Agent 的窄测试与 TypeScript 检查应随接入变更运行；更广的项目检查见 `npm run ci`。

生产客户端、回调、实际 AI 扣减和统一平台付款/退款已验收。后续发布仍需核对
实际部署镜像、版本与账户恢复，不能把旧工作站日志当作当前运行状态。
