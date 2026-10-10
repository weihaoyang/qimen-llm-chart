# 第三方声明（Third-Party Notices）

## 随仓库内嵌（vendored）的代码

### 皇极经世 · 元会运世纪年

- 来源：<https://github.com/Ryanlyly-ai/huangji-jingshi>（`src/chronology.ts`、`src/constants.ts`、`src/types.ts`）
- 许可：MIT License — Copyright (c) 2026 Huangji Jingshi contributors
- 位置：`src/lib/huangji/chronology.ts`（忠实移植并改写导出与文档注释，算法与原实现一致）
- 说明：本仓库为 GPL-3.0-only。MIT 为宽松许可，允许在有署名与许可声明的前提下使用、修改与再分发；MIT 代码并入 GPL 项目是允许的方向。上表许可原文如下。

```
MIT License

Copyright (c) 2026 Huangji Jingshi contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 七政四余（框架与表格）

- 来源：<https://github.com/dglijin-oss/chinese-metaphysics-skills>（`qizheng-siyu-skill`）
- 许可：MIT License — Copyright (c) 2026 天工长老
- 位置：`src/lib/qizheng/chart.ts`
- 采用部分：十二宫名与顺序、二十八宿序、庙旺陷表、命宫公式、七政/四余五行与吉凶表、宫/宿的等分口径。
- 未采用部分：该脚本的简化天文（太阳/月亮/五星线性近似）与「月孛=太阴+90°、紫气=太阴−90°」约定；本仓改用真星历（celestine）与经典四余定义，详见 `src/lib/qizheng/chart.ts` 头部说明与文件内注释。

### 神圣几何（图案定义）

- 来源：<https://github.com/evoluteur/sacred-geometry>（`patterns.js`；npm 包 `sacred-geometry-generator`）
- 许可：MIT License — (c) 2026 Olivier Giulieri
- 位置：`src/lib/sacred-geometry/patterns.ts`
- 采用部分：Vesica Piscis、Seed of Life、Flower of Life、Metatron's Cube、Golden Spiral 的**图案定义与几何构造**（单位空间、构造圆半径 = 1，返回形状描述符）；本仓只改写为 TypeScript 并自行渲染 SVG。

### 卢恩符文（Elder Futhark）

- 来源：<https://github.com/evoluteur/rune-reading>（`js/runes-data.js`）
- 许可：MIT License — (c) 2026 Olivier Giulieri
- 位置：`src/lib/runes/data.ts`
- 采用部分：24 符文的名称、Unicode 字符、读音、三个 aett 的划分、传统 lore、关键词、正/逆位含义与建议；四组牌阵（单符文 / 三女神 / 五符文十字 / 奥丁九符）的位置与问题。本仓改写为 TypeScript，并保留原项目的 40×64 SVG 笔画路径以便不依赖符文专用字体。
- 未采用部分：无（数据整体移植并注明来源）。
- 自撰部分：北欧九界（`src/lib/runes/nine-worlds.ts`）为北欧神话 Yggdrasil 三层九界的通行说法整理，属公共神话事实，不含受版权保护的文本。

### 汉堡学派八虚星（Uranian / 天王星系统）

- 来源：<https://github.com/CruiserOne/Astrolog>（`matrix.cpp` 的 Neely / Matrix 轨道要素表）
- 许可：GPL-2.0-or-later — Copyright (C) 1991-2026 Walter D. Pullen；原始行星计算核心为 James Neely 的公式（Michael Erlewine《Manual of Computer Programming for Astrologers》, Matrix Software）。本仓库为 GPL-3.0-only，GPL-2.0-or-later 可与之合并。
- 位置：`src/lib/uranian/elements.ts`
- 采用部分：八虚星（Cupido、Hades、Zeus、Kronos、Apollon、Admetos、Vulkanus、Poseidon）与地球 / 太阳的轨道要素（平近点角、离心率、半长轴、近日点黄经、升交点、倾角，历元 J1900.0），以及「解 Kepler 方程 → 轨道面旋转 → 地心黄经」的解算流程。
- 未采用部分：Astrolog 的其它星历（`swemplan.cpp` 等属 Swiss Ephemeris，AGPL，未采用）、高次误差修正项与瑞士星历接口。
- 自撰部分：`src/lib/uranian/dial.ts` 的 90°/45°/22.5° 盘算术、中点与行星图景检索为自实现；八虚星的「原则」归类为该体系通行的象征解释，非计算事实。

### 玛雅历法与卓尔金（13:20 / Dreamspell）

- 传统部分（长纪年 / 卓尔金 / 哈布 / 夜之主 / 历法轮）：本仓自实现，采用 GMT 相关系数 584283；日名与月名（尤卡坦语与基切语）为公共领域的历史名称。卓尔金口径与 `nahuales@1.0.4`（ISC License, Sergio Zuleta / Walter Vides）及 `MiguelYax/mayan-calendar`（MIT）一致，并以 1983-09-16 = 1 Bʼatzʼ 校验。
- 13:20 部分（Kin / 印章 / 调性 / 波符 / 城堡 / 神谕 / 十三月历）：
  - 来源：<https://github.com/oshimish/dreamspell-math>（`@oshimishi/dreamspell-math`，MIT，(c) oshimish）
  - 来源：<https://github.com/joyozhang333-lgtm/mayan-kin>（MIT，参考日 2013-07-26 = Kin 164 与「闰日不推进」约定）
  - 位置：`src/lib/maya/dreamspell.ts`
  - 采用部分：13:20 计数与闰日约定、印章/调性/颜色/波符/神谕（高我五位）推导、十三月历（13×28 + 无时间日）的月日与四周划分。
  - 命名说明：印章与调性名称（红龙、磁性…）出自 José Argüelles 的 Dreamspell / 13 Moon Calendar 体系，此处按上述开源实现转写，属该体系的通行命名与象征解释。

### 吠陀占星分盘（Vedic / Shodashavarga）

- 来源：<https://github.com/ravipathak3001/vedic-panchang>（`vedic-kundali` 与 `vedic-panchanga`，MIT，(c) ravipathak3001）
- 位置：`src/lib/vedic/data.ts`、`src/lib/vedic/varga.ts`、`src/lib/vedic/ayanamsa.ts`、`src/lib/vedic/chart.ts`
- 采用部分：
  - 16 分盘定义（Shodashavarga）与各分盘的 `vargaSign` 换算规则（含 D30 Trimsamsa 阳/阴宫分段表、D2 Hora 的日月时划分、各盘的起点规则）。
  - Lahiri（Chitrapaksha）岁差：J2000 基准值 23.853064° 与 J2000 起的岁差多项式；ΔT（Espenak–Meeus 分段式）；平交点（mean node）公式。
  - 12 宫（rashi）与 27 宿（nakshatra）名称、宿的宿主循环序列。
- 未采用部分：该库自带的简易行星 / 月亮 / 太阳星历；本仓改用已有的 Celestine 星历（回归黄经）再减岁差得到恒星黄经。
- 自撰部分：中文名对照（宫名、九曜、分盘主管领域）与界面文案；分盘「主管领域」为古典文献所述意义。

### 大六壬（天地盘 · 四课三传）

- 来源：<https://github.com/look-fate/liuren-ts-lib>（npm `liuren-ts-lib`，Apache-2.0，(c) Coaixy / LookFate）
- 位置：`src/lib/liuren/sanchuan-table.ts`（三传查表）
- 采用部分：三传（初/中/末三支）与课体名的预计算表（60 日干支 × 12 种干上神 = 720 组），本仓压缩为紧凑元组后移植（原表 `src/sanchuan.json`）。该表可用性依据：天地盘由偏移量（月将−时支）唯一决定，而该偏移又由「日干支＋干上神」唯一确定，故 720 组覆盖全部情形；本仓测试验证「偏移 0 ⇒ 伏吟 60/60」「偏移 6 ⇒ 反吟 59/60（乙酉因有贼克记作涉害）」。
- 未采用部分：该库的行星/节气依赖（`tyme4ts`）与其天将贵人表；本仓改用 `3meta` 的四柱与节气、并按通行口诀自定昼夜贵人（该库将壬癸的昼夜贵人互乙）。
- 自撰部分：天地盘、四课、天将、旬遁、旬空、六亲、驿马、建除、三合局与月将（太阳过宫）的算法，以及界面文案。

### 赫尔墨斯卡巴拉（四界 · 十辉 · 二十二字母 · 数术）

- 来源：<https://github.com/moshejs/mispar>（npm `mispar`，MIT，(c) Moshe Malka）
- 位置：`src/lib/qabalah/gematria.ts`
- 采用部分：希伯来字母数值表、终形（final form）处理、十三种 gematria 算法（hechrachi / gadol / katan / siduri / katan-mispari / perati / meshulash / kidmi / boneeh / haakhor / milui / atbash / albam）与「拼读（milui）」拼写表。算法本身为犹太数术的古典方法。
- 未采用：`kaabalah`（AGPL-3.0）等被红线排除的库。
- 自撰部分（依据公共领域古典内容，非本仓发明）：
  - 十辉与二十二字母的名称、数值、三分法（3 母 / 7 双 / 12 单）出自《创造之书》（Sepher Yetzirah，中世纪）。
  - 「四界 / 十辉」的神名、天使与天使序，以及「字母 ↔ 塔罗 / 元素 / 行星 / 星座」的对照为赫尔墨斯传统（Golden Dawn 一系）的通行对应。
  - 中文名、面板文案与「数根 → 辉位」对照链为本仓所加，并在界面标注为对照而非等式。

### 太乙神数（三式之一）

- **未采用开源实现**：检索到的 `taibu-core`（MIT，npm）之 `taiyi` 域经阅读源码确认为「太乙九星推演」——即以 `lunar-javascript` 的九星（年/月/日/时九星）换皮，并非古典太乙神数（十六神、天目、始击、主客算、格局），故不采用；本仓亦未引用该包。
- 位置：`src/lib/taiyi/data.ts`、`src/lib/taiyi/chart.ts`
- 依据（公共领域古籍）：《太乙金镜式经》（唐·王希明）与《太乙全书》一系的通行规则——十六神名称/建月/主事、八将运行规则、八正宫与间神、主客算与大将宫算法、入局数与天目（文昌）求法、计神与始击求法、格局（杜塞/对/格/掩/囚/关）、长短数与不和数。
- 校验：以古籍自带例子「入局 71 → 阳遁天目在坤（大武）、阴遁在艮（和德）」与积年锚点「唐开元十二年 = 1937281 积年」作测试向量。
- 异说标注：「元六纪周期」古籍作三百六十五，而据金镜式经复现的现代平台与三百六十吻合，故两者可切换（默认 360）；起元与阳/阴遁亦有异说，入局数与遁在界面可覆盖。参将宫未实现（古籍「求参将宫」诀未见于所据文本）。

### 阿卡西记录 · 全息宇宙

- **阿卡西记录部分：无开源实现、且非可计算体系**。本仓**不提供任何「读取」**，只把该概念的来源（ākāśa 的印度哲学背景、神智学的「宇宙记忆」、Cayce 的声称、Laszlo 的「阿卡西场」）、分期、被记载的实践做法与伦理边界整理为知识条目。这些条目为通行的历史/文献陈述，不是本仓创制。
- **全息部分：可算物理**，使用教科书标准式，未移植任何第三方代码：
  - 史瓦西半径 r_s = 2GM/c²、视界面积 A = 4πr_s²、贝肯斯坦–霍金熵 S = k_B·A/(4ℓ_P²)（每 4 个普朗克面积 1 比特）、体积律对照、贝肯斯坦界 S ≤ 2πk_BRE/(ħc)。
  - 全息碎片重建演示：自实现基数-2 FFT，物点经轴上参考光生成干涉条纹，整幅与碎片分别重建；另含自相似分形维数（解析值）。
  - 位置：`src/lib/akasha/holography.ts`、`src/lib/akasha/data.ts`
- 校验：地球（5.9722e24 kg）r_s ≈ 8.87 mm、约 1e66 比特；太阳约 1e77；观测宇宙约 1e122；FFT 与朴素 DFT 逐点一致；碎片（25%）重建峰位与整幅一致、主峰幅值约降为 1/4、相关系数 0.755。

## 运行时依赖

见 `package.json` 的 `dependencies` / `devDependencies`；各包的许可随其发布物提供。

## 已评估但**未采用**的开源实现（许可不兼容）

- `mingyu-core`（含 `huangji-jingshi` 模块）— AGPL-3.0-only
- `caelis-engine` / `Caelus`（`harmonicChart`）— AGPL-3.0
- `kaabalah`（含 enneagram）— AGPL-3.0

AGPL-3.0 与本仓库的 GPL-3.0-only 组合会把整体许可提升为 AGPL，故不引入。
