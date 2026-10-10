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
- 采用部分：十二宫名与顺序（命宫/财帛/兄弟/田宅/子女/奴仆/夫妻/疾厄/迁移/官禄/福德/相貌）、二十八宿序、庙旺陷表、七政与四余的五行/吉凶表。
- **已修正上游脚本的错误**：上游 `longitudeToPalace` 把白羊 0° 映射到「寅宫」，与其自身按古典键位（太阳庙于**戌**＝白羊）编制的庙旺陷表互相矛盾。本仓改为古典十二次口径（白羊=戌、金牛=酉、双子=申、巨蟹=未、狮子=午、处女=巳、天秤=辰、天蝎=卯、射手=寅、摩羯=丑、水瓶=子、双鱼=亥），修正后庙旺判定才可达（如太阳入白羊即得「庙」）。
- **命宫（已改果老式）**：上游用紫微斗数的「寅起正月、顺数至生月、再逆数至生时」且月取公历月；本仓改用果老式「以生时加太阳所躔之宫，顺数至卯」。
- **二十八宿为近似（未解决）**：与上游一致采用等分 360/28 且角宿起 0°；古典宿度并不等分（觜约 2°、井约 33°）且二十八宿为恒星锚定、随岁差移动，故宿界附近可有约 ±10° 偏差，宿名仅作粗定位、不作判据。
- **紫气并非古典虚星**：上游约定「紫气 = 太阴黄经 − 90°」，与古典长周期虚星「紫气」无关。本仓保留该数值但已在代码、界面与载荷中明确标注为「脚本约定虚星，非经典定义」，不再声称「经典四余定义」。
- 未采用部分：该脚本的简化天文（太阳/月亮/五星线性近似）；本仓改用真星历（celestine）。
- 待办（需可核验来源才动手）：加入古典二十八宿黄道距度表与岁差换算；月孛/紫气若改用古典定义需先确定历元与周期。

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
- 溯源状态：上述 GitHub 仓库已 **404**（2026-10 核实）。本仓数值以 npm 上仍在发布的 `vedic-panchanga@0.2.0` / `vedic-kundali@0.1.0` 逐项比对为准（分盘规则另经古典 BPHS 复核）。
- 位置：`src/lib/vedic/data.ts`、`src/lib/vedic/varga.ts`、`src/lib/vedic/ayanamsa.ts`、`src/lib/vedic/chart.ts`
- 采用部分：
  - 16 分盘定义（Shodashavarga）与各分盘的 `vargaSign` 换算规则（含 D30 Trimsamsa 阳/阴宫分段表、D2 Hora 的日月时划分、各盘的起点规则）。
  - Lahiri（Chitrapaksha）岁差：J2000 基准值 23.853064° 与 J2000 起的岁差多项式；ΔT（Espenak–Meeus 分段式）；平交点（mean node）公式。
  - 12 宫（rashi）与 27 宿（nakshatra）名称、宿的宿主循环序列。
- 未采用部分：该库自带的简易行星 / 月亮 / 太阳星历；本仓改用已有的 Celestine 星历（回归黄经）再减岁差得到恒星黄经。
- 自撰部分：中文名对照（宫名、九曜、分盘主管领域）与界面文案；分盘「主管领域」为古典文献所述意义。

### 大六壬（天地盘 · 四课三传）

- 来源：<https://github.com/hhszzzz/taibu>（npm `taibu-core`，MIT，`daliuren` 域）→ 其底层为 <https://github.com/look-fate/liuren-ts-lib>（npm `liuren-ts-lib`，Apache-2.0，(c) Coaixy / LookFate）
- 位置：`src/lib/research/extensions.ts`（`buildDaliurenResearch`）、`src/components/classic-observatory-panel.tsx`（大六壬盘面渲染）
- 采用部分：直接调用上游引擎产出天地盘、四课、三传、课体、各项神煞与文本/JSON 载荷；本仓不自行为其重写算法。
- 历史说明：本仓曾另有一份自研六壬（含 720 组三传查表）作为独立标签页；因上游引擎即同一权威且字段更全，已**删除自研副本，只保留上游这一份**。

### 太乙神数（三式之一）

- **未采用 taibu-core 的 `taiyi` 域**：经阅读源码确认为「太乙九星推演」——以 `lunar-javascript` 的年/月/日/时九星换皮，并非古典太乙神数（无十六神、天目、始击、主客算、格局）。该「太乙·九星」观测入口与 `buildTaiyiResearch` 已从产品中**移除**，只保留本仓的古典太乙神数。（注：本仓确实依赖 `taibu-core`，但只用于**大六壬**域，未调用其 `taiyi` 域。）
- 位置：`src/lib/taiyi/data.ts`、`src/lib/taiyi/chart.ts`
- 依据（公共领域古籍）：《太乙金镜式经》（唐·王希明）、《太乙秘書》与《淘金歌》一系通行规则——十六神名称/建月/主事、八将运行规则、八正宫与间神、主客算与大将/参将宫算法、入局数与天目（文昌）求法、计神与始击求法、格局（杜塞/对/格/掩/囚/关）、长短数与和数。
- **已修正两处错解**（2026-10 审计）：
  - 太乙行宫**阴遁未逆行**：原实现恒用阳遁顺行次序，导致阴遁整盘错位。已改为「阳遁顺行、阴遁起九宫逆行」；同时把「遁」改为由七十二局分阳遁 36 局 / 阴遁 36 局决定（原先由太乙所在宫阴阳反推，方向相反）。
  - **计神方向反了**：原为顺行，古籍口诀「一寅、二丑、三子」与「寅鼠逆周流」皆主逆行，已改。
- **已补参将宫**：「三因大将，满十去之」＝ 大将宫 × 3 取个位，主客参将均输出。
- 校验（古籍自带例子，均已作测试向量）：
  - 入局 1（阳遁）→ 太乙乾一宫、天目申、主算 7、客算 13、主参 1、客参 9。
  - 万历戊子（积年 1938145 → 入局 49，阴遁）→ 太乙九宫、主算 16、客算 1、主参 8、客参 3。
  - 另以「入局 71 → 阳遁天目在坤、阴遁在艮」与积年锚点「唐开元十二年 = 1937281 积年」作向量。
- 未实现并如实声明：古籍另有「击 / 迫（内外迫）/ 提挟 / 四郭固」等格局，因未获可核验的完整定义而不实现（不以推测补齐）；「上和/次和/下和」按本仓口径合成（两算俱和 / 一和一不和 / 俱不和）。
- 异说标注：「元六纪周期」古籍作三百六十五，本仓默认 360 且可在界面切换；入局数与遁在界面可覆盖。

### 赫尔墨斯卡巴拉（四界 · 十辉 · 二十二字母 · 数术）

- 来源：<https://github.com/moshejs/mispar>（npm `mispar`，MIT，(c) Moshe Malka）
- 位置：`src/lib/qabalah/gematria.ts`
- 采用部分：希伯来字母数值表、终形（final form）处理、十三种 gematria 算法（hechrachi / gadol / katan / siduri / katan-mispari / perati / meshulash / kidmi / boneeh / haakhor / milui / atbash / albam）与「拼读（milui）」拼写表。算法本身为犹太数术的古典方法。
- 未采用：`kaabalah`（AGPL-3.0）等被红线排除的库。
- 自撰部分（依据公共领域古典内容，非本仓发明）：
  - 十辉与二十二字母的名称、数值、三分法（3 母 / 7 双 / 12 单）出自《创造之书》（Sepher Yetzirah，中世纪）。
  - 「四界 / 十辉」的神名、天使与天使序，以及「字母 ↔ 塔罗 / 元素 / 行星 / 星座」的对照为赫尔墨斯传统（Golden Dawn 一系）的通行对应。
  - 中文名、面板文案与「数根 → 辉位」对照链为本仓所加，并在界面标注为对照而非等式。

### 阿卡西记录 · 全息宇宙

- **阿卡西记录部分：无开源实现、且非可计算体系**。本仓**不提供任何「读取」**，只把该概念的来源（ākāśa 的印度哲学背景、神智学的「宇宙记忆」、Cayce 的声称、Laszlo 的「阿卡西场」）、分期、被记载的实践做法与伦理边界整理为知识条目。这些条目为通行的历史/文献陈述，不是本仓创制。
- **全息部分：可算物理**，使用教科书标准式，未移植任何第三方代码：
  - 史瓦西半径 r_s = 2GM/c²、视界面积 A = 4πr_s²、贝肯斯坦–霍金熵 S = k_B·A/(4ℓ_P²)（每 4 个普朗克面积 1 比特）、体积律对照、贝肯斯坦界 S ≤ 2πk_BRE/(ħc)。
  - 全息碎片重建演示：自实现基数-2 FFT，物点经轴上参考光生成干涉条纹，整幅与碎片分别重建；另含自相似分形维数（解析值）。
  - 位置：`src/lib/akasha/holography.ts`、`src/lib/akasha/data.ts`
- 校验：地球（5.9722e24 kg）r_s ≈ 8.87 mm、约 1e66 比特；太阳约 1e77；观测宇宙约 1e122；FFT 与朴素 DFT 逐点一致；碎片（25%）重建峰位与整幅一致、主峰幅值约降为 1/4、相关系数 0.755。

### 紫微斗数排盘引擎（iztro）

- 来源：<https://github.com/SylarLong/iztro>（npm `iztro`，MIT）
- 位置：`src/lib/ziwei/chart.ts`（`astro.bySolar` / `astro.byLunar`）、`src/lib/ziwei-flying/chart.ts`（`getMutagensByHeavenlyStem`）
- 采用部分：紫微斗数命盘排布（十二宫、宫干、十四主星与辅曜杂曜、生年四化、大限等）与「十干四化」工具函数。
- 说明：本仓不修改该库；飞星（宫干飞化）、自化、来因宫、禄转忌/忌转忌、河洛数（洛书/河图）等表与算法为本仓依公共领域口诀与通行技法另写（见 `src/lib/ziwei-flying/data.ts`）。

### 紫微飞星 · 河洛化象

- 依据（公共领域口诀与通行技法，未移植第三方代码）：
  - 十干四化口诀「甲廉破武阳，乙机梁紫阴，丙同机昌廉，丁阴同机巨，戊贪阴右机，己武贪梁曲，庚阳武阴同，辛巨阳曲昌，壬梁紫左武，癸破巨阴贪」。
  - 飞化／自化（离心、向心化入）／来因宫／禄转忌·忌转忌，为飞星（飞宫）与北派通行技法。
  - 天乙贵人口诀「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎」。
  - 洛书数（一白…九紫）依后天八卦配十二支；河图生成数（1·6、2·7、3·8、4·9、5·10）依卦位。
- **「天乙飞星」一名未见统一文献术语**：本仓按「年干取天乙贵人宫 + 宫干飞化」组合呈现，并在界面与载荷中显式标注，不冒充既有成词技法。
- 位置：`src/lib/ziwei-flying/data.ts`、`src/lib/ziwei-flying/chart.ts`

## 运行时依赖（直接调用，未修改其源码）

下列 npm 依赖被本仓直接调用（作为库使用，未修改、未内嵌其源码）。各包完整许可文本随其发布物提供。

| 包 | 版本 | 许可 | 用途 | 来源 |
| --- | --- | --- | --- | --- |
| `3meta` | ^2.6.0 | MIT | 奇门遁甲排盘主引擎（定局、布三奇六仪、值符值使、转天盘、八门九星八神、格局） | <https://github.com/3metaJun/3meta> |
| `taobi` | ^0.4.5 | **MPL-2.0** | 奇门「拆补/茅山」三元局法适配（另一套开源实现） | <https://github.com/Taogram/taobi> |
| `lunar-typescript` / `lunar-javascript` | ^1.8.6 / ^1.7.7 | MIT | 历法基础：四柱、藏干、十神、纳音、空亡、大运、节气 | <https://github.com/6tail/lunar-typescript> |
| `iztro` | ^2.5.8 | MIT | 紫微斗数排盘（十二宫、主星辅曜、生年四化、大限） | <https://github.com/SylarLong/iztro> |
| `celestine` | ^0.2.1 | MIT | 真星历：行星/日月的黄经、宫位、相位、四轴（星盘、吠陀、七政四余共用） | <https://github.com/Anonyfox/celestine> |
| `hd-chart-engine` | ^0.1.1 | MIT | 人类图激活计算（门/爻/色/调/基、中心与通道） | <https://github.com/domalhambra/hd-chart-engine> |
| `astronomy-engine` | ^2.1.19 | MIT | `hd-chart-engine` 的底层天文计算（间接依赖） | <https://github.com/cosinekitty/astronomy> |
| `taibu-core` | ^3.5.0 | MIT | **仅用其大六壬域**（天地盘/四课三传），底层为 `liuren-ts-lib` | <https://github.com/hhszzzz/taibu> |
| `@cometpisces/tarot-kit` | ^0.2.0 | MIT | 78 张塔罗牌数据、正逆位与中文牌义 | npm（CometPisces） |

- `taobi` 为 **MPL-2.0**（文件级 copyleft）：本仓只把其作为依赖调用、未修改其文件，也不内嵌其源码；MPL-2.0 允许与 GPL 项目组合（其 §3.3 明确允许在 GPL 等次级许可下分发）。
- 其余依赖均为 MIT，MIT 代码可并入 GPL-3.0-only 项目（保留署名与许可声明）。

## 本仓自撰的启发式、近似与未实现项（如实声明）

以下内容**没有**开源实现或古典原文可直接对齐，属本仓自撰或近似，已在代码注释、界面或载荷中标注，不作为古典判据：

- **八字结构审计与调候**（`src/lib/bazi/structure-audit.ts`、`shen-sha.ts`）：旺衰权重、从格门槛、调候取用为**产品启发式**打分，不是古籍中的固定算法。
- **八字古籍摘录**（`src/lib/agent/bazi-classics.ts`）：`text` 为原项目语料摘录，**未经逐字校对**；`editorial` 为本仓现代说明。载荷已明令：只能表述为「据《书名·篇目》大意」，禁止当逐字原文引用；「编者按」不得挂书名引用。
- **术数研究 / 人生 K 线打分**（`src/lib/qimen/kline.ts`、`src/lib/qimen/trend.ts`、`src/lib/research/*`）：线型权重与 STAGE_SCORE 为产品启发式；K 线可视化层移植自 `miounet11/life-kline`（Apache-2.0，参见 `src/lib/research/life-kline-reading.ts` 头注释）。
- **奇门格局评分与话术**（`src/lib/qimen/patterns.ts`）：旺衰分档与判定文案为本仓所加，非上游 `3meta` 输出。
- **奇门「拆补/茅山」盘**（`src/lib/qimen/taobi.ts`）：调用 `taobi`，但上游该模块对三元局法/八神自注 `@check FALSE` 且含 TODO，且本适配器混用 `3meta` 的四柱/节气与 `taobi` 的局/门/星/神，跨引擎口径未完全对齐（界面已提示「暂不强行对齐」）。**该两法与「转盘（3meta）」口径不同，仅作对照，不作准绳。**
- **星盘**（`src/lib/astro/*`）：宫位沿用 `celestine` 默认的 Placidus（盘面与载荷已标注宫制；高纬约 |φ|>66° 时库内会自动回退，已在宫制说明中提示）。相位与图形已覆盖 10 行星 + 凯龙 + 谷神/智神/婚神/灶神 + 黄白交点 + 莉莉丝（不再截断为十大行星）；**未纳入**阿拉伯点（lots）与恒星。
- **人类图**（`src/lib/human-design/chart.ts`）：激活为权威算法；但 `incarnationCross` 只给角度类型与四个门，**不给十字名**（免责声明已声明该限制）；`tone/base` 为估值（上游 `hd-chart-engine` 自带 `precision` 字段已透出）。
- **七政四余**：二十八宿为等分近似、紫气为脚本约定虚星（详见上文该条）。
- **玛雅 Dreamspell**（`src/lib/maya/dreamspell.ts`）：已移植 13:20 计数、闰日约定、印章/调性/波符/神谕/十三月历；上游的**银河门户（PORTALS_MATRIX）与神秘柱**未移植，属章节缺失（非算错）。
- **吠陀**（`src/lib/vedic/*`）：罗睺/计都仅取**平交点**（无真交点选项）；岁差为「J2000 常量 + 一般岁差多项式」，非 Spica 锚定的严格 Chitrapaksha（差异在角秒级）。
- **卡巴拉**（`src/lib/qabalah/gematria.ts`）：十三法与上游 `mispar` 逐行等价，但 `letterValues` 逐字入口对 `katan-mispari` 返回标准值，而上游对该法直接抛错——语义与上游不严格一致。「数根 → 辉位」对照链为本仓所加（界面标注为对照而非等式）。
- **神圣几何**（`src/lib/sacred-geometry/patterns.ts`）：图形按几何构造分层生成（非写死坐标）；`PHI` 为上游导出但本仓未使用的死常量。
- **汉堡学派**（`src/lib/uranian/elements.ts`）：轨道要素与开普勒解算忠实移植 Astrolog；未做周年光行差（差约 0.006°，远小于 1.5° 容许度）。盘面支持 90°/45°/22.5° 切换，并实现中点（A/B=C）、和点（A+B=C）、差点（A−B=C）与和点等式（A+B=C+D）四类检索。
- **太乙神数**：格局未收「击/迫/提挟/四郭固」；「上和/次和/下和」按本仓口径合成（详见上文该条）。
- **阿卡西记录**：非可计算体系，本仓只列知识条目，**不提供任何「读取」**。

## 已评估但**未采用**的开源实现（许可不兼容）

- `mingyu-core`（含 `huangji-jingshi` 模块）— AGPL-3.0-only
- `caelis-engine` / `Caelus`（`harmonicChart`）— AGPL-3.0
- `kaabalah`（含 enneagram）— AGPL-3.0
- Swiss Ephemeris 系（`swemplan.cpp` 等）与 `falcon-ephemeris` — AGPL-3.0（汉堡学派仅取其 GPL 的轨道要素表，未取瑞士星历接口）

AGPL-3.0 与本仓库的 GPL-3.0-only 组合会把整体许可提升为 AGPL，故不引入。
