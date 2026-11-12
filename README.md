# 知几排盘 · QMDJ

**把传统排盘规则、古籍异文和可复算案例放在同一个开源工作台。**

[在线体验](https://qmdj.singseq.com/paipan) · [研究索引](docs/research/INDEX.md) · [完整研究论文](docs/research/calculation-audit-paper.md) · [参与贡献](CONTRIBUTING.md) · [English](#english)

知几提供奇门、八字、紫微、太乙、大六壬、七政等排盘，也收录现代占星、吠陀分盘、人类图等研究入口。盘面可以导出结构化文本与 JSON，便于复核和后续处理。各体系的来源和完成度不同，**已有案例通过不代表整个体系已经核完**。

## 为什么值得看

- **从书到盘**：记录原书、版本、判据、输入与输出，将规则落实到可运行的测试。
- **把分歧摆出来**：同一术语或盘式在不同古籍中的解释可能不同；尽可能分别展示，不用一种说法覆盖所有版本。
- **保留未完成项**：标明转录、影印、数值模型和历史日期转换的证据边界，方便继续校订。
- **开放复现**：TypeScript 计算代码、盘例和 Vitest 测试都在本仓库；研究文档链接具体书目、页面和测试。

## 从几个真实问题开始

| 问题 | 对照结果 | 入口 |
| --- | --- | --- |
| 奇门六仪击刑 | 《遁甲演义》的值符法与本站逐宫法并列；2026-01-05 上海 02:00 两法不同，12:00 两法同中三宫 | [研究索引](docs/research/INDEX.md) · [测试](src/lib/qimen/chart.test.ts) |
| 太乙岁计边界 | 采用 360 年周期与阳遁局表时，1971 年为第 72 局、1972 年回到第 1 局；另列不同古籍解读 | [研究论文](docs/research/calculation-audit-paper.md) · [测试](src/lib/taiyi/chart.test.ts) |
| 八字立春节界 | 上海 2024-02-04 16:27 与 16:28 分别位于依赖库所算交节时刻两侧；春节换年是独立口径 | [研究索引](docs/research/INDEX.md) · [测试](src/lib/bazi/reverse.test.ts) |
| 七政牛宿界 | 《推步法解》与《五礼通考》卷一九五的牛宿距星表相差 10′；站内保留单边界敏感性对照 | [论文与影印定位](docs/research/calculation-audit-paper.md#牛宿界异文对实际盘面的影响) · [测试](src/lib/qizheng/chart.test.ts) |
| 大六壬伏吟 | 六甲日伏吟三传按所选规则与《六壬大全》对照；《太白》一条电子文本存在末字异文 | [研究索引](docs/research/INDEX.md) · [测试](src/lib/research/extensions.test.ts) |

更多跨书对照、精确输入、原始链接及未解决问题见[研究索引](docs/research/INDEX.md)与[完整论文](docs/research/calculation-audit-paper.md)。历史例证支持的是所列字段或规则的复算，不能单凭相符证明预测效果。

## 本地运行

需要 **Node.js 20.9 或更高版本**、npm 和可访问的依赖下载源：

```bash
git clone https://github.com/weihaoyang/qimen-llm-chart.git
cd qimen-llm-chart
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可用 `Copy-Item .env.example .env.local`。打开 <http://localhost:3000/paipan>。页面启动需要 `.env.example` 中的 `PLATFORM_BASE_URL` 与 `PLATFORM_PRODUCT_CODE`；示例指向奇点序列正式平台。开发环境中的第三方部署应使用自己登记的 OAuth 客户端与回调地址，不要把示例客户端当成通用凭据。

基础排盘与登录、AI 调用分开。真实登录和 AI 用量还需要可用的平台、已登记的 OAuth 客户端、账户额度与服务端模型配置；数据库相关功能需要独立的 PostgreSQL 配置。示例密钥和数据库密码都是占位值，**不要提交真实密钥**。账户与 AI 用量细节见[运行说明](docs/AI_ACCESS_RUNBOOK.md)。

## 测试

```bash
npm run typecheck
npm test
npm run build
# 一次运行上述检查及 ESLint
npm run ci
```

只核查论文列出的案例：

```bash
npm test -- src/lib/qimen src/lib/taiyi src/lib/research src/lib/bazi src/lib/ziwei src/lib/qizheng
```

测试中部分数据库用例使用 PGlite，无需外部数据库；它们不能代替真实数据库的并发验收。测试覆盖和跳过项以实际运行结果为准。

## 参与研究

欢迎提交原书版本和页码、可复算的盘例、算法修正与测试。报告差异时请附时间、时区、输入设置、期望输出及出处；影印不清或仅有转录时请说明。具体流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

代码采用 [GPL-3.0-only](LICENSE)。移植代码及依赖的版权和许可见[第三方声明](docs/THIRD_PARTY_NOTICES.md)；古籍扫描、图像和外部资料的权利及使用条件见[影像权利记录](docs/research/sources/RIGHTS.md)，不能仅据本仓库许可证推定。研究材料与程序用于历史文本、计算方法和文化研究，不构成对占断结果的科学验证。

## English

QMDJ is an open-source chart workbench and a source-led research project covering Qimen Dunjia, BaZi, Zi Wei, Taiyi, Da Liu Ren, Qizheng and other traditions. Its distinguishing feature is traceability: primary texts, variant rules, reproducible examples and executable tests are documented together. See the [research index](docs/research/INDEX.md) and [audit paper](docs/research/calculation-audit-paper.md). The documents are currently in Chinese.

Install Node.js >= 20.9, run `npm ci`, copy `.env.example` to `.env.local`, run `npm run dev`, and open `/paipan`. The example platform settings point to the production SingSeq service; a separate deployment needs its own registered OAuth client. Code is GPL-3.0-only; third-party code and historical images have their own attribution and usage conditions. The project does not establish predictive validity.
