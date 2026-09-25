# 星盘、人类图与塔罗开源审计

## 结论

本次扩展沿用知几现有 Next.js / React / TypeScript 工作台，不新增运行时或 UI 框架。三个新盘均有独立类型、真实计算适配器、结构化文本和可下载 JSON；视觉入口与标题栏保持统一。

## 检索记录

- 星盘候选：[Anonyfox/celestine](https://github.com/Anonyfox/celestine)，MIT，TypeScript，提供天文计算方向；当前未直接引入，原因是需要先完成与产品时区、地点和精度口径的验证。
- 人类图候选：[tomasbatovsky-png/know-thyself-pro](https://github.com/tomasbatovsky-png/know-thyself-pro)，仓库未声明明确许可证；不复制代码或数据。
- 现有开源参考：[`taibu`](https://github.com/hhszzzz/taibu) 已在本仓库作为东方术数参考登记，但不覆盖人类图或塔罗。
- npm 检索可见 `openhumandesign-library`、`hd-chart-engine`、`@cometpisces/tarot-kit` 等候选；本次不直接添加，需单独完成许可证、数据来源、精度与包稳定性审计。

## 当前实现边界

- 星盘：使用 Celestine 天文计算引擎，输出太阳、月亮、上升、行星与宫位，并在缺少经纬度时 fail closed。
- 人类图：使用 MIT hd-chart-engine 输出人格/设计两侧 13 个天体的闸门、线、色彩、基调和底色；类型、权威、人生角色与人生主题仍保持待推导。
- 塔罗：使用 MIT @cometpisces/tarot-kit 的完整 78 张牌、正逆位与中文牌义，当前提供可复现三张牌抽取。

三种新盘均可在面板标题区域一键复制 JSON，也可从“盘面资料 → JSON”复制；JSON 内容来自当前工作台真值。

每个模块都有独立类型、计算器、序列化函数和测试；后续替换引擎只需保持 `format` 与结构化文本契约。
