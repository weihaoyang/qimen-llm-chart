# 当前架构决策

- 知几只承载排盘、原始材料、研究视图和分析；胜天半子的战局域在独立仓库维护。
- 账户由 Casdoor 和原生平台管理；产品使用唯一 `@singseq/platform-sdk` 与 OAuth/PKCE。
- 余额仅供展示；受限 AI 先用原生 reservation 原子授权，生成成功消费，失败释放。
- 计划、价格、付款、退款和续费只由平台与 Kill Bill 维护，产品不保存第二套资金状态。
- 当前盘面、结构化输出和 AI 上下文来自同一份领域数据；出处与未核项保留在材料登记中。
- 产品镜像独立，由基础设施仓库 GitOps 发布；验证 `/api/version` 和镜像 digest。

接入字段以 [平台合同](PLATFORM_INTEGRATION.md) 为准；发布以 [发布说明](RELEASE.md) 为准。
