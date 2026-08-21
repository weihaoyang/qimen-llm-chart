# Fate-Bench / MingLi-Bench 准确度审计（2026-08-17）

## 结论

`shunshi-ai/fate-bench` 是当前最适合加入本地回归的公开扩展集：63 个命盘、295 道全球算命师大赛历史题，数据 CC BY 4.0，代码 MIT。它同时包含八字与紫微字段，并明确哪些命盘缺失出生时刻或出生资料。

本地下载物：`F:\temp\fate-bench\cases.json`、`F:\temp\fate-bench\fate_bench.jsonl`。

审计结果：

- 63 个命盘中 61 个有可用的公历出生时刻和八字四柱；2 个按来源说明跳过（一个出生时辰正是题目要求推断的变量，一个网页未公开出生资料）。
- 61/61 使用产品支持的默认口径“立春换年 + 子正换日”复现公开四柱；四种年/日口径中没有无法复现的样本。
- 紫微主星宫位结构 60/61 与 Fate-Bench 导出一致。唯一 `mlb_case_31` 的 Fate-Bench 紫微导出（文昌 / 土五局）与同一出生资料的上游 MingLi-Bench（天同 / 火六局）相互冲突；产品 `iztro` 与上游 MingLi-Bench 一致，因此该项被标为来源差异，未为匹配单一导出而改动产品计算。
- 295 道题全部有唯一 ID、答案均存在于选项、`num_options` 与选项数一致、`case_id` 可关联；271 道四选一、24 道五选一；289 道有可评分命盘资料。
- 数据 SHA-256：`cases.json` = `33979ab837bdce2dc5a6c6dee7dca4363f51ca9c70d9780ed5edd104fe077267`；`fate_bench.jsonl` = `2a2bef90e372db39ec8b0f03570a02ea2f3b1b06b049c8f33fc8e0a840bec39a`。

同一目标的 `DestinyLinker/MingLi-Bench` 仍保留：32 个公开源命盘在明确流派口径下四柱 32/32、紫微结构 32/32。Fate-Bench 的 61 个新增可用命盘使用默认口径全部复现，因此没有触发新的排盘口径分歧。

## 可复现命令

```powershell
node ops/audit-fate-bench.mjs F:\temp\fate-bench\cases.json F:\temp\fate-bench\fate_bench.jsonl
$env:FATE_BENCH_CASES_PATH='F:\temp\fate-bench\cases.json'
npx.cmd vitest run src/lib/bazi/fate-bench.audit.test.ts --reporter=dot
```

前者检查来源哈希、样本过滤、四柱/紫微结构和题目完整性；后者直接调用产品 `buildBaziChartFromProfile` 与 `buildZiweiChartFromProfile`，不是只调用独立脚本的底层依赖。

## 研究边界

这些题目是已发生事件的历史选择题，不是前瞻性预测集。它们可以用于检测排盘字段、结构化证据、提示词和模型版本的回归，不能转译成“用户未来预测准确率”。`--execute` 的模型评测仍保持显式 opt-in，未在本轮调用付费模型。

`Bazi-Bench`（Apache 2.0 代码 / CC BY 4.0 文档）是另一个形式化规则推理基准；其强弱权重和流派定义与产品的 `ziping-luming-rules-v1` 不同，暂不把它的金标准直接覆盖到生产默认规则。后续应作为独立 lineage profile 做符号推理一致性对照，而不是静默改变现有用户口径。

已在本地运行其 v0.1.1 参考实现的 4 个金例，结果 4/4 通过；这只验证了该外部参考实现及下载表的自洽性，不意味着产品现有权重“错误”或应被替换。当前产品结构审计已经明确把调候、合化、从格等有分歧的判断标为候选和待复核；在获得可比较的流派定义与更多独立样本前，保持这一边界。

## 来源

- https://github.com/shunshi-ai/fate-bench
- https://github.com/DestinyLinker/MingLi-Bench
- https://github.com/Notcokeaddictedanymore/Bazi-Bech

## 三式数据边界

本轮 GitHub 只发现八字/紫微的可复核赛事资料；未发现同时满足“起局时间与地点、排盘口径、完整盘面、事后结果、许可清晰”的奇门、大六壬或太乙公开 benchmark。因此奇门感情 K 线当前只能由规则证据与序列确定性测试约束，不能把八字赛事分数外推为三式预测准确率。该缺口已登记在 `docs/TECH_DEBT.yaml`，不通过猜测数据来填补。
