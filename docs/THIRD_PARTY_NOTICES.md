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

## 运行时依赖

见 `package.json` 的 `dependencies` / `devDependencies`；各包的许可随其发布物提供。

## 已评估但**未采用**的开源实现（许可不兼容）

- `mingyu-core`（含 `huangji-jingshi` 模块）— AGPL-3.0-only
- `caelis-engine` / `Caelus`（`harmonicChart`）— AGPL-3.0
- `kaabalah`（含 enneagram）— AGPL-3.0

AGPL-3.0 与本仓库的 GPL-3.0-only 组合会把整体许可提升为 AGPL，故不引入。
