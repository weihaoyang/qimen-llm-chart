# Agent 提升路线调研（2026-08-17）

## 结论先行

Fate-Bench holdout 的 20 题结果为 5/20，逐题随机期望 4.65/20；这个差异远小于小样本误差，不能说超越随机。20 题的标准误约为 9.7 个百分点，95% 区间天然很宽。这个结果对一个四选一、跨流派、出生地/时区不完整的历史题集合并不反常，但也不能被解释成“模型已经正常准确”。

旧 MingLi 160 题结果更差（10.6% 全题命中、23.1% 覆盖），其中一部分来自旧静态上下文和大量拒答，不能与 Fate-Bench holdout 直接拼成一个准确率。

## 公开方法给出的可执行方向

1. **先做选择性预测校准，而不是强迫每题回答。**
   - Wen et al., *Know Your Limits: A Survey of Abstention in Large Language Models*, TACL 2024 / arXiv: [2407.18418](https://arxiv.org/abs/2407.18418)。该综述把弃答分成 query、model、human-values 三个层面，并强调 coverage 与 risk 必须一起评估。
   - *Calibrating LLMs for Selective Prediction: Balancing Coverage and Accuracy*（OpenReview 检索结果）。核心做法是把置信度校准成“在某覆盖率下的风险”，而不是把模型自报的 confidence 当概率。
   - 对本产品：用未见校准集学习 abstain threshold；报告 coverage、selective risk、all-item accuracy，禁止把回答子集准确率当 headline。

2. **把“选项年份”变成结构化候选对照。**
   这是本轮已实现的方向：每个候选年生成流年、大运、紫微大限，并预先计算流年/大运对原局的十神与六合、冲、害、破。第一版只补年份切片在同样本中降到 4/20，说明仅增加文字没有用；交互特征版必须在未见题集验证，不能靠同题调参。

3. **分层、按届次、按选项数报告。**
   公开竞赛的届次、四选一/五选一、答案来源和人类基线不同。评测必须按 source/edition/category/options 分层，并计算每题实际随机期望；不能把所有题合并后拿一个 25% 基线。

4. **把事实真值和传统解释分开。**
   这类公开题的答案是历史事件标签，不能证明命理机制；模型应先完成确定性排盘和时间证据，再做受限选择。出生地点只写“USA”等时，不能伪造时区/真太阳时校正。

5. **暂不微调、不引入 Agent 框架。**
   295 题不足以支撑可靠微调；LangGraph/DSPy/DeepEval 不会修复输入时点错位或真值口径问题。下一步优先是数据合同、候选特征和校准 holdout。

## 推荐研发顺序

1. 为 295 题建立永久 train / calibration / holdout ID 清单，评测器强制排除已跑 ID。
2. 在 calibration split 上拟合弃答阈值和置信度映射；不得用 holdout 调 prompt。
3. 用固定的一次模型配置跑完整 holdout，再报告 Wilson 区间和随机基线。
4. 只有当多次独立 holdout 的下界仍高于随机，才讨论“高于随机”；在此之前产品卖点只能是可复核证据与行动建议。

## 不能做的事

- 不把上/中/下三条世界线写成概率或准确率。
- 不把 20 题的偶然 55%（有重叠诊断）当提升。
- 不把 45.9% 的选择后条件命中率当系统准确率。
