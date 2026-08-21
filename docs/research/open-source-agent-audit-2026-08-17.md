# 开源术数引擎与 Agent 项目审计（2026-08-17）

## 结论

本轮审计没有发现一个可以直接证明“命理预测准确率很高”的开源 Agent。可复用价值主要来自三类基础设施：

1. 确定性排盘与时序计算；
2. 结构化证据包和稳定输出契约；
3. 可重复的领域回归测试与弃答/校准评测。

因此 qmdj 不应复制某个“算命提示词”或把古籍全文塞进上下文。最值得吸收的是 `taibu-core` 的工程边界和 `bazi-ziwei-skill` 的证据分层，再用 qmdj 自己的奇门序列、人生/感情 K 线和 benchmark 做验证。

## 项目对比

| 项目 | 证据 | 许可证/活跃度 | 实际能力 | 可吸收 | 不应直接吸收 |
|---|---|---|---|---|---|
| [hhszzzz/taibu](https://github.com/hhszzzz/taibu) | commit `e8f6369`（2026-08-01）；npm `taibu-core` 3.5.0 | MIT；仓库近期持续提交 | 八字、紫微、奇门、太乙、大六壬、六爻等 domain；统一 schema、canonical text/JSON、MCP；core 有 qimen/taiyi/daliuren/ziwei 等测试 | 领域边界、输入校验、时区处理、结构化输出、每个术数独立回归测试；可作为 qmdj 的 reference engine | 不把它的结果视为“真值”；不同起局口径、节气/时区/转盘规则必须逐字段核对；不要把整个 Web/MCP 应用引入生产 |
| [dzcmemory-web/bazi-ziwei-skill](https://github.com/dzcmemory-web/bazi-ziwei-skill) | 当前浅克隆；MIT（README/License）；约 817 stars、130 forks（审计时页面值） | MIT；提交较少但文档完整 | iztro + tyme4ts 确定性排盘，额外旺衰/格局/调候/刑冲合害 enrich；LLM 只解读；有 7 组案例回归 | “排盘 → enrich → LLM → 固定 JSON/HTML”三层分离；依据+置信度；方法文档与测试指南 | 7 组案例不是公开预测准确率；vendored 依赖和 corpus 需逐项核对 NOTICE；其古籍/经验规则不能当统计真值 |
| [Johnson-Jia/ziwei-bazi-reading](https://github.com/Johnson-Jia/ziwei-bazi-reading) | commit `b36c85d`；含 `tests/test_empower.js`、methods、data、vendor | Apache-2.0；个人项目 | 紫微/八字双引擎、命书生成、运限、四化、积极赋能层；明确禁止 LLM 自行排盘和编造经历 | 输出 schema、免责声明、证据引用、命局/运限分层、凶象转化为行动建议的产品表达 | 不能把叙事“置信度”解释成预测概率；不应复制其大段 corpus 或 HTML 模板到普通用户产品 |
| [lzm0x219/ziwei](https://github.com/lzm0x219/ziwei) / `@ziweijs/core` | commit `264567b`（2026-08-17）；Zig；含 `tests/*`、benchmark 合同和报告生成 | MIT；项目明确处于持续重构 | 标准驱动的紫微本命盘核心；有公开 API、集成测试、可复现 benchmark、环境指纹与报告 manifest | 对 qmdj 的紫微参考核验、fixture 合同、跨版本回归报告有价值 | 不是完整 Agent，也不覆盖奇门/八字解读；Zig 引擎接入会增加构建复杂度，先作为离线 reference，不替换线上主引擎 |
| [`bazi-agent` 1.0.0](https://pypi.org/project/bazi-agent/) | PyPI wheel 1.0.0；MIT；metadata 的主页仍是 `github.com/yourusername/bazi-agent` | Beta；无可核验上游仓库与公开 benchmark | `lunar-python` 排盘 + 自定义规则评分 + OpenAI/Anthropic 生成 11 维人物画像；真太阳时校正是简化经度×4分钟 | 可参考模块化输出字段和 LLM provider 抽象 | 不采用其计算核心：旺衰是固定加分启发式，真太阳时公式不完整，缺少测试/真值集；不能支持准确率声明 |
| [miounet11/life-kline](https://github.com/miounet11/life-kline) | Apache-2.0（已做过初审） | 活跃度有限 | 大运分区、MA/K 线阅读层 | 仅吸收可视化/分区层 | 不吸收其未审计命理计算和“趋势”结论 |
| `timeshining/ziwei-doushu`（用户提及） | 按该仓库名的 Git URL 审计时返回 `Repository not found` | 无法确认 | 无法验证源码、许可证、测试或成绩 | 请用户提供确切链接/commit 后再审计 | 不依据小红书或转述把它当“已验证准确” |

## 关键技术判断

### 1. 模型问题与知识问题要分开

`bazi-agent` 代表“规则文本 + LLM 画像”，`bazi-ziwei-skill` 和 `taibu` 代表“算法先算、模型后解读”。前者即使写得很像真人，也不能修复四柱、交运、时区或候选年份错位。qmdj 当前评测已显示：补充流年/大运字段能提升证据完整性，但不能自动提升命中率。因此下一步优先级仍是：

```text
统一排盘口径 → 候选选项逐项 evidence/counter-evidence
→ 受限排序/可拒答 → calibration/holdout → 结果复盘
```

### 2. `taibu-core` 最适合做离线参考核验

qmdj 已经使用 `taibu-core` 的 qimen/bazi/ziwei 能力。审计显示其优势是：

- qimen 测试覆盖九宫、值符值使、空亡、驿马、四柱、时区并发与非法时区；
- taiyi 测试覆盖日/时/分模式、四层九星上下文、compact/full 输出；
- daliuren 测试覆盖天地盘、四课、三传、课体、时区回归和已知错例修复；
- 输出层同时提供 canonical text 和结构化 JSON，适合 Agent 只读证据。

这可以补足 qmdj 研发端的“第二实现对照”，但不能把两套实现不一致直接判成谁正确。每次核验必须记录方法、时区、节气、年界、转盘/拆补口径。

### 3. 评测框架只解决可见性，不创造准确率

Promptfoo、DeepEval、OpenAI Evals、LangGraph、DSPy 等可以帮助组织回归、轨迹和评分，但不会替代领域真值。qmdj 应保留自己的轻量 runner：固定题目 ID、校准集/holdout 分离、全题准确率/coverage/selective risk/Wilson 区间，并把 reference engine 输出作为 evidence，不作为答案标签。

## 推荐吸收顺序（研发端）

1. **立即吸收**：`taibu-core` 的 schema/时区错误处理/各 domain targeted tests；在 qmdj 增加“同一输入双引擎差异报告”，只用于研发。
2. **随后吸收**：`bazi-ziwei-skill` 的 evidence enrich 契约，将命局、运限、候选年份、规则依据分成稳定字段；普通用户只看结论、依据和建议。
3. **保留为参考**：`@ziweijs/core` 作为紫微离线 reference，先跑固定 fixture，不接线上请求路径。
4. **不接入**：`bazi-agent` 的启发式旺衰/简化真太阳时；任何未能给出源码、许可证和可复现实验的“全对 Agent”。
5. **评测层**：继续使用现有 qmdj benchmark；任何提示词/规则改动必须在未见 holdout 上一次性比较，禁止用同一题反复调参后报分。

## 本轮已吸收

- `src/lib/research/provenance.ts` 固定记录 `taibu-core@3.5.0`、MIT、上游地址和 `reference_only` 角色；研发导出不会把参考引擎伪装成产品真值。
- 核验数据、太乙和大六壬研究输出均携带 provenance；普通用户叙事不展示该内部字段。
- 已通过 26 个 Agent/研究窄测试和 TypeScript 检查；未部署。

## 不能据此宣传的结论

- 开源项目有测试 ≠ 命理预测准确；测试多数只证明字段结构和确定性。
- 人类/小红书“全对”若没有赛前完整答案、不可编辑时间戳和分母，不能作为基准。
- 当前 qmdj 的 20 题/295 题结果仍不足以声称高于随机，更不能宣传“精准预测”。

## 审计来源

- https://github.com/hhszzzz/taibu/tree/e8f636972a6fdb14f2a532ee223101f889ab4820
- https://github.com/dzcmemory-web/bazi-ziwei-skill
- https://github.com/Johnson-Jia/ziwei-bazi-reading/tree/b36c85df7c7c057f9074ff52b70b6deffc2caecb
- https://github.com/lzm0x219/ziwei/tree/264567b8dbcb5da6520d9b9248fcd2e9cce71f3b
- https://pypi.org/project/bazi-agent/
- https://github.com/miounet11/life-kline
- https://arxiv.org/abs/2407.18418
