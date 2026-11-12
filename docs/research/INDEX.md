# 知几算法审查索引

[研究论文](calculation-audit-paper.md)的「网站入口与审查覆盖」列出 23 个产品入口、已核字段和待核项。下表按计算主题选取可直接复算的案例。书影与逐项转录见 [sources](sources/)，每个引用版本及判据详见论文对应章节。

| 主题 | 可复算案例与应检查的结果 | 史料和测试 |
| --- | --- | --- |
| 奇门 | 上海 2026-01-05 02:00，逐宫法报四宫六仪击刑，值符法无命中。同日 12:00 两法均中三宫 | [《遁甲演义》四库全书本](https://zh.wikisource.org/zh-hans/遁甲演義_(四庫全書本)/全覽) · [盘面测试](../../src/lib/qimen/chart.test.ts) |
| 奇门 | 上海 2026-01-01 16:00，阳一局八宫丙生九天，阳七局六宫乙开天心 | [《遁甲演义》卷二](https://zh.wikisource.org/zh-hans/遁甲演義_(四庫全書本)/卷2) · [《奇门遁甲元灵经》](https://zh.wikisource.org/zh-hant/奇門遁甲元靈經) · [盘面测试](../../src/lib/qimen/chart.test.ts) |
| 太乙 | 唐开元十二年积年 1,937,281。1971 年入七十二局，1972 年回第一局 | [《太乙金镜式经》卷一](https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷01) · [岁计测试](../../src/lib/taiyi/chart.test.ts) |
| 大六壬 | 六甲日伏吟均取寅巳申。《太白》甲申电子条的末传另见夘，待核书影 | [《六壬大全》卷七](https://zh.wikisource.org/zh-hans/六壬大全/7) · [《太白兵备统宗宝鉴》甲申旬](https://www.shidianguji.com/book/SDZJ0646/chapter/1kg32r7axqwij) · [论文「甲申第三局」](calculation-audit-paper.md#甲申第三局的跨书补证与文字缺口) |
| 八字 | 2024-02-04 上海，依赖库立春约 16:27:07；16:27 为癸卯、16:28 为甲辰。按春节换年的口径当天仍为癸卯 | [香港天文台 2024 年历](https://www.hko.gov.hk/tc/gts/astron2024/files/HKO_almanac_2024.pdf) · [八字测试目录](../../src/lib/bazi/) |
| 紫微 | 逐格比对明刊本五局起紫微日表。水二局廿一日的字迹单列待核 | [明刊表转录](sources/ziwei-ming-edition-start-tables.json) · [排盘测试](../../src/lib/ziwei/chart.test.ts) |
| 七政四余 | 以冬至 270° 起，每隔 30° 检查十二次的初度宿名。90° 鹑首在康熙表为觜，在乾隆表为参 | [《清史稿》卷二十八](https://zh.wikisource.org/zh-hans/清史稿/卷28) · [排盘测试](../../src/lib/qizheng/chart.test.ts) |

从仓库根目录运行：

```sh
npm test -- src/lib/qimen src/lib/taiyi src/lib/research src/lib/bazi src/lib/ziwei src/lib/qizheng
npm test
npm run typecheck
```

占星星历、人类图、玛雅历法、几何和全息演示的证据主要来自星历对照、现代源档、铭文或数学复算，详见论文对应章节。外部数值比对脚本见 [西洋宫制](astro-house-grid.py)、[人类图星历](hd-ephemeris-comparison.py)和[七政紫气](ziqi-comparison.py)，运行参数与依赖以脚本为准。

尚待重点复核的项目包括奇门置闰各传本、《太乙秘书》电子本阳六十局缺文、六壬神将异法、紫微安星异本、七政庙旺体系和塔罗全牌义。案例的证据范围为所列计算字段、文献判据及其输出；预测效果仍需另设研究验证。
