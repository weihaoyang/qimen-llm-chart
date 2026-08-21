# Agent 历史题离线审计（2026-08-17）

## 范围

本记录复算已落盘的 DeepSeek 历史选择题结果；没有发送新的模型请求，也不构成对未来事件的预测准确率声明。

输入包括 `F:\temp\mingli-bench-data.json` 和六个 `F:\temp\qmdj-agent-history-*-20260817.json` 结果文件。前者是旧 160 题评测实际使用的题库；不能把它与后来引入的 Fate-Bench JSONL 混作同一批题。

## 已确认结果

| 条件 | 题数 | 覆盖率 | 全题命中率 | 仅已回答题命中率 | 逐题选项数随机期望 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 旧基线 | 160 | 23.1% | 10.6%（95% CI 6.7%–16.4%） | 45.9% | 25.0% |
| 强制选择八字上下文 | 20 | 100.0% | 15.0%（95% CI 5.2%–36.0%） | 15.0% | 25.0% |

结论：45.9% 是只在模型作答的 37 题上计算的选择后条件值，不能宣传为系统准确率；强制选择不提升命中率。旧 20 题实验取题库前缀，类别和届次偏斜，因此只可作为失败模式定位，不能用于候选方案排名。

## 已修正的评测合同

- `ops/run-agent-history-benchmark.mjs` 的有限样本默认按“主题优先、主题 × 选项数再平衡”抽取，并要求记录 `--seed`；`--sample-strategy ordered` 仅为复现旧前缀实验保留。
- 报告同时给出 coverage、all-item accuracy、conditional accuracy、95% Wilson 区间、按实际选项数的随机期望、主题和届次分项。
- `ops/audit-agent-history-results.mjs` 只读取既有 JSON 复算上述指标，支持 JSONL Fate-Bench 与 JSON MingLi-Bench 题库；不会读取 API key 或调用模型。

## 可复核命令

```powershell
node ops/run-agent-history-benchmark.mjs F:\temp\fate-bench\fate_bench.jsonl --sample 20 --seed qmdj-audit-20260817
node ops/audit-agent-history-results.mjs F:\temp\mingli-bench-data.json F:\temp\qmdj-agent-history-baseline-20260817.json F:\temp\qmdj-agent-history-forced-bazi-20-20260817.json
```

两条命令均不带 `--execute`，因此不会产生模型费用。未来如要做新实验，需要用户明确授权模型、最大调用次数和预算；样本应使用固定分层种子并与旧结果隔离保存。

## 后续一次受控盲测

用户明确授权复用服务器已有的 DeepSeek 配置后，使用 `deepseek-chat`、温度 0、产品八字时间上下文、`seed=qmdj-audit-20260817` 执行了一次 20 题分层盲测。运行产物为 `outputs/benchmarks/agent-history-server-key-20260817.json`。

- 20 次请求，0 次请求错误；19/20 产生可评分单选。
- 全题命中 5/20 = 25.0%，Wilson 95% CI 为 11.2%–46.9%。
- 仅回答题命中 5/19 = 26.3%；该题库均为四选一，随机期望为 25.0%。

这次仅显示强制结构化输出提高了覆盖率，不显示高于随机的命中证据。未部署、未改用户界面，未追加模型调用。

## 时序上下文诊断

对 20 题原始回答的复核发现，旧上下文只从问题正文抽取一个年份；当年份只存在于选项时，模型会退回到当前日期的时间字段。这是评测输入错误，不是可归因于模型或命理规则的失败。

第一版修复把选项年份逐一生成流年、大运与紫微大限切片后，用相同 20 题作诊断复跑：4/20 = 20.0%，不优于随机。该样本已经被用于发现缺陷，因此不能再作为盲测或候选排序依据。

后续候选实现已进一步把每个切片的流年十神、流年支/大运支相对原局四柱的六合、冲、害、破预先计算为确定性证据。其单元测试、TypeScript 与 lint 已通过；尚未发起新的模型请求。下一次若评估，必须使用未见的固定分层样本并事先锁定调用上限。

## 真正未见的 Fate-Bench holdout

随后使用未调用过模型的 Fate-Bench 295 题集合，以 `qmdj-fate-holdout-20260817` 分层抽取 20 题，运行候选年份交互证据版本。结果文件为 `outputs/benchmarks/agent-history-fate-holdout-20260817.json`。

- 20 题中 5 题命中；2 次网络请求失败按未命中计，18 题返回可评分答案，覆盖率 90%。
- 全题命中率 25.0%；按真实四/五选项数加权的随机期望为 23.25%。Wilson 95% CI 为 11.2%–46.9%。
- 这是未见题集上的第一条可比结果，但区间很宽，不能宣称显著超越随机，也不能宣传预测准确率。
