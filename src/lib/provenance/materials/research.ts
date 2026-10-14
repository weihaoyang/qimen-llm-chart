/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——research。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "research-aggregate": [
    {
      title: "感情线权重 `RELATIONSHIP_WEIGHTS`（本仓 `src/lib/qimen/kline.ts:51-72`，逐值）",
      lines: [
        "samePalace 乙庚同宫: 14",
        "branchPair 乙庚宫地支相合: 5",
        "branchClash 乙庚宫地支相冲: −6",
        "voidness 宫位空亡: −4",
        "gatePressure 门迫: −3",
        "postHorse 驿马: 2",
        "wuBuYuShi 五不遇时: −2",
        "outletSamePalace 值使宫与乙庚宫同宫: 4",
        "outletRelationFactor 值使与乙庚宫的五行关系折算系数: 0.55",
        "outletStructureFactor 值使宫格局对出口可执行性的折算系数: 0.6",
      ],
      note: "本仓代码注释自述（kline.ts:37-50）：「These are product heuristics, not quantities taken from any canonical text」——即**本仓自撰启发式**，并按 `samePalace > branchPair/branchClash > minor signals` 的相对序调参。",
    },
    {
      title: "分时口径权重 `relationshipProfiles`（本仓 `kline.ts:107-112`，逐值）",
      lines: [
        "double-hour（时辰）：axis 1.3 / outlet 1.25 / context 0.8",
        "day（日）：axis 1.15 / outlet 1.1 / context 0.95",
        "month（月）：axis 0.9 / outlet 0.95 / context 1.25",
        "year（年）：axis 0.7 / outlet 0.8 / context 1.4",
      ],
      note: "axis/context/outlet 分别缩放「乙庚主轴」「宫位格局背景」「值使出口」三类权重。",
    },
    {
      title: "阶段分 `STAGE_SCORE`（本仓 `src/lib/research/trend.ts:15-28`，逐值）",
      lines: [
        "帝旺 3；临官 2；长生 2；冠带 1；养 1；沐浴 0；胎 0；衰 −1；墓 −2；病 −2；死 −3；绝 −3",
        "人生线总分（trend.ts:50-58）：STAGE_SCORE[大运 diShi] + STAGE_SCORE[流年 diShi]，再按下列词表逐词 +1/−1，最后 clamp(−8, 8)",
        "SUPPORT_TERMS（trend.ts:30）= 天乙贵人 / 太极贵人 / 福星贵人 / 文昌 / 天喜 / 红鸾 / 三合 / 六合",
        "REVIEW_TERMS（trend.ts:31）= 六冲 / 相刑 / 相害 / 冲太岁 / 刑太岁 / 害太岁 / 破太岁 / 白虎 / 劫煞 / 灾煞 / 亡神",
      ],
      note: "十二长生的分值序列为本仓所定（不是古籍给出的数值）。",
    },
    {
      title: "线型权重与关键点判据（本仓 `kline.ts:127-157,318-329,343-353`；`trend.ts:60-68,131`）",
      lines: [
        "gateSignal（kline.ts:127）：休门/生门/开门 +3；死门/惊门/伤门/杜门 −3；余 0",
        "deitySignal（kline.ts:128）：六合/太阴/九地 +2；白虎/玄武/腾蛇 −2；余 0",
        "starSignal（kline.ts:129）：天心/天辅/天任/天英 +2；天芮/天柱/天禽 −2；余 0",
        "palaceRelation（kline.ts:131-138，五行）：同气 +2；相生 +5；相克 −5；否则 0",
        "palaceStructureSignal（kline.ts:140-157）：旺相 +2；囚死 −2；入墓 −2；六仪击刑 −3；吉格 +min(2, n)；凶格 −min(2, n)；十干克应有生合 +1 / 有克刑 −1",
        "phaseFor(delta)（kline.ts:318-319）：delta ≥ 4 → 上行；delta ≤ −4 → 下行；否则 震荡",
        "K 线 candle（kline.ts:343-353）：分数初值 50；range = clamp(round(4 + |delta|×0.45 + evidence.length×0.35), 4, 12)；high = clamp(max(open, close) + ⌈range/2⌉)；low = clamp(min(open, close) − ⌊range/2⌋)",
        "keyPointReason（kline.ts:328-329）：index 0 → 序列起点；末点 → 序列终点；|delta| ≥ 8 → 分数跃迁；score ≥ 70 → 进入高位区间；score ≤ 30 → 进入低位区间",
        "人生线 candle（trend.ts:60-68）：close = clamp(50 + score×5, 12, 88)；open = 上一 close；high = clamp(max(open, close) + 3 + 支持数×2, 0, 100)；low = clamp(min(open, close) − 3 − 待核数×2, 0, 100)",
        "人生线 keyPoint（trend.ts:131）：index 0 → 起运序列起点；末点 → 当前资料终点；|delta| ≥ 8 → 结构跃迁；score ≥ 70 → 高位区间；score ≤ 30 → 低位区间",
      ],
      note: "以上全部为**本仓自撰启发式**（门/神/星的吉凶分值、五行生克分、关键点阈值、candle 区间公式），不是古籍算法；同一输入恒得同一分数与蜡烛几何。",
    },
  ],
};
