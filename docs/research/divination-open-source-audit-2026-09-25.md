# 星盘、人类图与塔罗开源审计

## 结论

本次扩展沿用知几现有 Next.js / React / TypeScript 工作台，不新增运行时或 UI 框架。三项能力均先采用本仓库内的纯 TypeScript 确定性 MVP，保留可替换的领域类型与序列化契约。

## 检索记录

- 星盘候选：[Anonyfox/celestine](https://github.com/Anonyfox/celestine)，MIT，TypeScript，提供天文计算方向；当前未直接引入，原因是需要先完成与产品时区、地点和精度口径的验证。
- 人类图候选：[tomasbatovsky-png/know-thyself-pro](https://github.com/tomasbatovsky-png/know-thyself-pro)，仓库未声明明确许可证；不复制代码或数据。
- 现有开源参考：[`taibu`](https://github.com/hhszzzz/taibu) 已在本仓库作为东方术数参考登记，但不覆盖人类图或塔罗。
- npm 检索可见 `openhumandesign-library`、`hd-chart-engine`、`@cometpisces/tarot-kit` 等候选；本次不直接添加，需单独完成许可证、数据来源、精度与包稳定性审计。

## 当前实现边界

- 星盘：平均轨道位置的研究性近似，输出太阳、月亮、上升、行星与宫位。
- 人类图：稳定的 MVP 类型、策略、权威、人生角色、中心与闸门结构，不宣称认证排盘。
- 塔罗：自有 22 张大阿卡那元数据与确定性三张牌抽取，不引入外部牌面图片或解释文本。

每个模块都有独立类型、计算器、序列化函数和测试；后续替换引擎只需保持 `format` 与结构化文本契约。
