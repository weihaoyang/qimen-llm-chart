/**
 * 《太乙秘書》逐局回归语料（公共领域：宋·王佐一系，维基文库本；作者逝世逾百年且 1931 年前出版）。
 *
 * 取「定主客胜负阳局七十二局」第 1–24 局、「定主客胜负阴局七十二局」第 1–12 局，共 36 局，
 * 逐字照抄秘書之 太乙宫／天目／主算／主大将／主参将／客目（始击）／客算／客大将／客参将／计神，
 * **不按本仓实现改写**。
 *
 * 说明：
 * 1. 秘書原文字多形讹（如「大阳阴」「太昊」「太灵」「太神」），此类字段以 `skip` 具名跳过，
 *    并在 `notes` 记出与《太乙金镜式经》卷三立成的互校结果；不为一字段去改算法。
 * 2. 秘書与卷三立成在个别数值上互相矛盾者，两说并列写入 `notes`，不择一当真理。
 * 3. 神名以卷二〈推十六神所主法〉为据换算方位：子地主、丑阳德、艮和德、寅吕申、卯高丛、
 *    辰太阳、巽大炅、巳大神、午大威、未天道、坤大武、申武德、酉太簇、戌阴主、乾阴德、亥大义。
 *    （秘書「大簇」＝太簇、「太炅」＝大炅，皆同神异写。）
 * 4. `mishuPatterns` 为秘書局注所用格局用语（掩／击辰／击宫／迫外／迫内／囚／关／格／杜塞／挟）；
 *    `patternExceptions` 为本仓判据与秘書用语确有出入、已核实并具名者（不因之改算法）。
 */

/** 卷二〈推十六神所主法〉的神名 → 地盘方位。 */
export const DEITY_POSITION: Record<string, string> = {
  地主: "子", 阳德: "丑", 和德: "艮", 吕申: "寅", 高丛: "卯", 太阳: "辰",
  大炅: "巽", 太炅: "巽", 大神: "巳", 太神: "巳", 大威: "午", 天道: "未",
  大武: "坤", 武德: "申", 太簇: "酉", 大簇: "酉", 阴主: "戌", 阴德: "乾", 大义: "亥",
};

export type MishuField = "tianMu" | "host" | "hostGeneral" | "hostSu" | "guestName" | "guest" | "guestGeneral" | "guestSu" | "jiShen";

export type MishuJu = {
  ju: number;
  dun: "阳遁" | "阴遁";
  taiyi: number;
  tianMu?: string;
  host?: number;
  hostGeneral?: number;
  hostSu?: number;
  guestName?: string;
  guest?: number;
  guestGeneral?: number;
  guestSu?: number;
  jiShen?: string;
  skip?: MishuField[];
  mishuPatterns?: string[];
  patternExceptions?: string[];
  notes?: string;
};

export const MISHU_CORPUS: MishuJu[] = [
  // ── 定主客胜负阳局七十二局 1–24 ──
  { ju: 1, dun: "阳遁", taiyi: 1, tianMu: "武德", host: 7, hostGeneral: 7, hostSu: 1, guestName: "大武", guest: 13, guestGeneral: 3, guestSu: 9, jiShen: "寅", mishuPatterns: ["掩", "囚", "格"], notes: "秘書「始击将大武掩主大将」（始击同主大将七宫）；《推掩法》「掩主大将」，本仓掩已含此判据。" },
  { ju: 2, dun: "阳遁", taiyi: 1, tianMu: "太簇", host: 6, hostGeneral: 6, hostSu: 8, guestName: "阴主", guest: 1, guestGeneral: 1, guestSu: 3, jiShen: "丑", mishuPatterns: ["迫内", "迫外", "击辰", "囚", "挟"], patternExceptions: ["挟"], notes: "秘書「主挟」（主大将/主参将挟客大将），本仓提挟只取太乙＋大将共挟之形，自挟未实现。" },
  { ju: 3, dun: "阳遁", taiyi: 1, tianMu: "阴主", host: 1, hostGeneral: 1, hostSu: 3, guestName: "大义", guest: 40, guestGeneral: 4, jiShen: "子", skip: ["guestSu"], mishuPatterns: ["迫内", "迫外", "囚"], patternExceptions: ["迫外"], notes: "客参将秘書作三宫，与客大将四宫（三因得二）不符——阳局5 同客大将四宫作客参将二宫，故此处系讹；始击大义（亥）秘書作「辰迫」，卷三〈推击法〉与秘書其余属局皆作「击」，本仓作击（外辰击）。" },
  { ju: 4, dun: "阳遁", taiyi: 2, tianMu: "阴德", host: 25, hostGeneral: 5, hostSu: 5, guestName: "阳德", guest: 17, guestGeneral: 7, jiShen: "亥", skip: ["guestSu"], mishuPatterns: ["杜塞", "迫内"], patternExceptions: ["迫内"], notes: "客参将秘書作二宫，与客大将七宫（三因得一）不符——阳局15 同客大将七宫作客参将一宫；客大将七宫秘書作「内迫」，与阳局28（太乙二宫：客大将九宫内迫、客参将七宫外迫）矛盾，本仓作外迫。" },
  { ju: 5, dun: "阳遁", taiyi: 2, tianMu: "阴德", host: 25, hostGeneral: 5, hostSu: 5, guestName: "吕申", guest: 14, guestGeneral: 4, guestSu: 2, jiShen: "戌", mishuPatterns: ["杜塞", "囚"] },
  { ju: 6, dun: "阳遁", taiyi: 2, tianMu: "大义", host: 25, hostGeneral: 5, hostSu: 5, guest: 10, guestGeneral: 1, guestSu: 3, jiShen: "酉", skip: ["guestName"], mishuPatterns: ["杜塞"], notes: "客目秘書作「大阳阴」，形讹；卷三立成阳局6 作太阳（辰），与本仓一致。" },
  { ju: 7, dun: "阳遁", taiyi: 3, tianMu: "地主", host: 8, hostGeneral: 8, hostSu: 4, guestName: "大神", guest: 25, guestGeneral: 5, guestSu: 5, jiShen: "申", mishuPatterns: ["迫内", "迫外", "杜塞"] },
  { ju: 8, dun: "阳遁", taiyi: 3, tianMu: "阳德", host: 1, hostGeneral: 1, hostSu: 3, guestName: "大武", guest: 22, guestGeneral: 2, guestSu: 6, jiShen: "未", mishuPatterns: ["迫内", "囚"] },
  { ju: 9, dun: "阳遁", taiyi: 3, tianMu: "和德", host: 3, hostGeneral: 3, hostSu: 9, guestName: "大簇", guest: 15, guestGeneral: 5, guestSu: 5, jiShen: "午", mishuPatterns: ["囚", "杜塞"] },
  { ju: 10, dun: "阳遁", taiyi: 4, tianMu: "吕申", host: 1, hostGeneral: 1, hostSu: 3, guestName: "阴德", guest: 12, guestGeneral: 2, guestSu: 6, jiShen: "巳", mishuPatterns: ["迫内", "格"] },
  { ju: 11, dun: "阳遁", taiyi: 4, tianMu: "高丛", host: 4, hostGeneral: 4, hostSu: 2, guestName: "阳德", guest: 4, guestGeneral: 4, guestSu: 2, jiShen: "辰", mishuPatterns: ["囚", "关"] },
  { ju: 12, dun: "阳遁", taiyi: 4, tianMu: "太阳", host: 37, hostGeneral: 7, hostSu: 1, guestName: "吕申", guest: 1, guestGeneral: 1, guestSu: 3, jiShen: "卯", mishuPatterns: ["迫外", "击辰", "迫内"] },
  { ju: 13, dun: "阳遁", taiyi: 6, tianMu: "大炅", host: 18, hostGeneral: 8, hostSu: 4, guestName: "太阳", guest: 19, guestGeneral: 9, guestSu: 7, jiShen: "寅", mishuPatterns: ["格"], patternExceptions: ["格"], notes: "秘書「主参将四宫格」；与太乙六宫对冲的是主参将，卷三〈推格法〉明文「客目大小将与太乙对宫为格」，本仓格只取客方。" },
  { ju: 14, dun: "阳遁", taiyi: 6, tianMu: "大神", host: 10, hostGeneral: 1, hostSu: 3, guest: 9, guestGeneral: 9, guestSu: 7, jiShen: "丑", skip: ["guestName"], mishuPatterns: ["迫外", "迫内"], notes: "秘書此局未写始击名。" },
  { ju: 15, dun: "阳遁", taiyi: 6, tianMu: "大威", host: 9, hostGeneral: 9, hostSu: 7, guestName: "大武", guest: 7, guestGeneral: 7, guestSu: 1, jiShen: "子", mishuPatterns: ["迫内", "击宫", "迫外"] },
  { ju: 16, dun: "阳遁", taiyi: 7, tianMu: "天道", host: 1, hostSu: 3, guestName: "太簇", guest: 33, guestGeneral: 3, guestSu: 9, jiShen: "亥", skip: ["hostGeneral"], mishuPatterns: ["迫内", "格"], patternExceptions: ["格"], notes: "主大将秘書作二宫，与主参将三宫（应自大将一宫三因得三）不符，系讹；「主参将三宫格」同主之格例，本仓格只取客方。" },
  { ju: 17, dun: "阳遁", taiyi: 7, tianMu: "大武", host: 7, hostGeneral: 7, hostSu: 1, guestName: "大义", guestGeneral: 7, guestSu: 1, jiShen: "戌", skip: ["guest"], mishuPatterns: ["囚", "关"], notes: "客算秘書作三十七，卷三立成阳局17 作二十七，与本仓一致（大义亥顺数至坤七宫前得二十七）。" },
  { ju: 18, dun: "阳遁", taiyi: 7, tianMu: "大武", host: 7, hostGeneral: 7, hostSu: 1, guestName: "地主", guest: 26, guestGeneral: 6, guestSu: 8, jiShen: "酉", mishuPatterns: ["囚", "迫外", "挟"], patternExceptions: ["挟"], notes: "秘書「客挟」「主人大小将挟客大小将」。" },
  { ju: 19, dun: "阳遁", taiyi: 8, tianMu: "武德", host: 8, hostGeneral: 8, hostSu: 4, guestName: "和德", guestGeneral: 2, guestSu: 6, jiShen: "申", skip: ["guest"], mishuPatterns: ["囚", "格", "挟"], patternExceptions: ["挟"], notes: "客算秘書作一十二，卷三立成阳局19 作三十二，与本仓一致（和德艮顺数至子八宫前得三十二）；「大小将挟文昌」属自挟。" },
  { ju: 20, dun: "阳遁", taiyi: 8, tianMu: "太簇", host: 7, hostGeneral: 7, hostSu: 1, guestName: "太阳", guest: 26, guestGeneral: 6, guestSu: 8, jiShen: "未", mishuPatterns: ["迫内", "囚", "挟"], patternExceptions: ["挟"], notes: "秘書「主挟」「客大将为客大小将挟之」。" },
  { ju: 21, dun: "阳遁", taiyi: 8, tianMu: "阴主", host: 2, hostGeneral: 2, hostSu: 6, guestName: "大神", guest: 17, guestGeneral: 7, guestSu: 1, jiShen: "午", mishuPatterns: ["格", "迫内"], patternExceptions: ["格"], notes: "秘書「主大将二宫格」；对冲太乙八宫者为主大将，本仓格只取客方。" },
  { ju: 22, dun: "阳遁", taiyi: 9, tianMu: "阴德", host: 16, hostGeneral: 6, hostSu: 8, guestName: "天道", guest: 30, guestGeneral: 3, guestSu: 9, jiShen: "巳", mishuPatterns: ["囚"] },
  { ju: 23, dun: "阳遁", taiyi: 9, tianMu: "阴德", host: 16, hostGeneral: 6, hostSu: 8, guestName: "武德", guest: 23, guestGeneral: 3, guestSu: 9, jiShen: "辰", mishuPatterns: ["囚"] },
  { ju: 24, dun: "阳遁", taiyi: 9, tianMu: "大义", host: 16, hostGeneral: 6, hostSu: 8, guestName: "阴主", guest: 17, guestGeneral: 7, guestSu: 1, jiShen: "卯", mishuPatterns: ["格", "挟"], patternExceptions: ["挟"], notes: "秘書「客大小将挟主大将」属自挟。" },

  // ── 定主客胜负阴局七十二局 1–12 ──
  { ju: 1, dun: "阴遁", taiyi: 9, tianMu: "吕申", host: 5, hostGeneral: 5, hostSu: 5, jiShen: "申", skip: ["guestName", "guest", "guestGeneral", "guestSu"], mishuPatterns: ["杜塞", "囚"], notes: "秘書阴局1 只注「客大将囚」，未列客目/客算/客大将/客参将；卷三立成阴局1 作客目大武、客算二十九（客大将九宫囚），与本仓一致。" },
  { ju: 2, dun: "阴遁", taiyi: 9, tianMu: "高丛", host: 4, hostGeneral: 4, hostSu: 2, guestName: "阴主", guest: 17, guestGeneral: 7, guestSu: 1, jiShen: "未", mishuPatterns: ["迫内", "迫外", "格"] },
  { ju: 3, dun: "阴遁", taiyi: 9, tianMu: "太阳", host: 1, hostGeneral: 1, hostSu: 3, guestName: "大义", guest: 16, jiShen: "午", skip: ["guestGeneral", "guestSu"], mishuPatterns: ["迫内", "格"], patternExceptions: ["格"], notes: "客大将秘書作八宫，与客算十六（个位应为六宫）不符，卷三立成阴局3 此列空缺无法互校，姑置不论；「主大将一宫格」同主之格例。" },
  { ju: 4, dun: "阴遁", taiyi: 8, host: 25, hostGeneral: 5, hostSu: 5, guestName: "阳德", guest: 33, guestGeneral: 3, guestSu: 9, jiShen: "巳", skip: ["tianMu"], mishuPatterns: ["杜塞", "击辰", "迫外"], notes: "天目秘書作「太昊」，形讹；卷三立成阴局4 作大炅（巽），与本仓一致。" },
  { ju: 5, dun: "阴遁", taiyi: 8, host: 25, hostGeneral: 5, hostSu: 5, guestName: "吕申", guest: 30, guestGeneral: 3, guestSu: 9, jiShen: "辰", skip: ["tianMu"], mishuPatterns: ["杜塞", "迫外"], notes: "天目秘書作「太灵」，形讹；卷三立成阴局5 作大炅（巽）。" },
  { ju: 6, dun: "阴遁", taiyi: 8, host: 17, hostGeneral: 7, hostSu: 1, guestName: "太阳", guest: 26, guestGeneral: 6, guestSu: 8, jiShen: "卯", skip: ["tianMu"], mishuPatterns: ["囚", "挟"], patternExceptions: ["挟"], notes: "天目秘書作「太神」，卷三立成阴局6 作大神（巳）——同神异写，仍按讹字跳过。" },
  { ju: 7, dun: "阴遁", taiyi: 7, tianMu: "大威", host: 2, hostGeneral: 2, hostSu: 6, guestName: "大神", guest: 3, guestGeneral: 3, guestSu: 9, jiShen: "寅", mishuPatterns: ["迫内", "迫外", "格"] },
  { ju: 8, dun: "阴遁", taiyi: 7, tianMu: "天道", host: 1, hostGeneral: 1, hostSu: 3, guestSu: 1, jiShen: "丑", skip: ["guestName", "guest", "guestGeneral"], mishuPatterns: ["迫内", "关", "格", "掩"], patternExceptions: ["格"], notes: "秘書此局未列客目/客算/客大将，只注客参将一宫（与本仓合）；卷三立成阴局8 作客目大武、客算七。「主参将三宫格」同主之格例。" },
  { ju: 9, dun: "阴遁", taiyi: 7, tianMu: "大武", host: 7, hostGeneral: 7, hostSu: 1, guestName: "太簇", jiShen: "子", skip: ["guest", "guestGeneral", "guestSu"], mishuPatterns: ["囚", "击宫", "迫内"], patternExceptions: ["迫内"], notes: "秘書阴局9 作客算三十四、客大将四宫、客参将二宫；卷三立成阴局9 作三十三，且同形之阳局16（太乙七宫、客目太簇）两书皆作三十三——两局太乙与客目全同则客算必等，故秘書阴局9 三名连讹，本仓作三十三→客大将三宫→客参将九宫。" },
  { ju: 10, dun: "阴遁", taiyi: 6, tianMu: "武德", host: 1, hostGeneral: 1, hostSu: 3, guestName: "阴德", guestGeneral: 4, guestSu: 2, jiShen: "亥", skip: ["guest"], mishuPatterns: ["迫内", "迫外", "击宫", "格"], notes: "客算秘書作二十四，卷三立成阴局10 作三十四，与本仓一致；客大将四宫、客参将二宫两说皆合（三十四取个位四、四三因得二），故仍断言。" },
  { ju: 11, dun: "阴遁", taiyi: 6, tianMu: "太簇", host: 6, hostGeneral: 6, hostSu: 8, guestName: "阳德", guest: 26, guestGeneral: 6, guestSu: 8, jiShen: "戌", mishuPatterns: ["囚", "关"], notes: "卷三立成阴局11 客算作三十六，秘書作二十六，与本仓一致（阳德丑顺数至酉六宫前得二十六）。" },
  { ju: 12, dun: "阴遁", taiyi: 6, tianMu: "阴主", hostGeneral: 5, hostSu: 5, guestName: "吕申", guest: 23, guestGeneral: 3, guestSu: 9, jiShen: "酉", skip: ["host"], mishuPatterns: ["迫外", "杜塞"], notes: "主算秘書作二十五，卷三立成阴局12 作三十五，与本仓一致（阴主戌顺数至酉六宫前得三十五）；两说之主大将/主参将皆在五宫（不出中宫），故仍断言。" },
];
