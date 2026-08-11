import type { BaziPillarDetail } from "./types";

type Stem = BaziPillarDetail["heavenlyStem"];
type Branch = BaziPillarDetail["earthlyBranch"];

const TIAN_YI: Record<string, string[]> = {
  甲: ["丑", "未"],
  戊: ["丑", "未"],
  庚: ["丑", "未"],
  乙: ["子", "申"],
  己: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["亥", "酉"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"],
  辛: ["寅", "午"],
};

const WEN_CHANG: Record<string, Branch> = {
  甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申",
  己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯",
};

const LU_SHEN: Record<string, Branch> = {
  甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳",
  己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子",
};

const YANG_REN: Record<string, Branch> = {
  甲: "卯", 乙: "寅", 丙: "午", 丁: "巳", 戊: "午",
  己: "巳", 庚: "酉", 辛: "申", 壬: "子", 癸: "亥",
};

const TIAN_DE: Record<string, { stem?: Stem; branch?: Branch }> = {
  寅: { stem: "丁" }, 卯: { branch: "申" }, 辰: { stem: "壬" }, 巳: { stem: "辛" },
  午: { branch: "亥" }, 未: { stem: "甲" }, 申: { stem: "癸" }, 酉: { branch: "寅" },
  戌: { stem: "丙" }, 亥: { stem: "乙" }, 子: { branch: "巳" }, 丑: { stem: "庚" },
};

const YUE_DE: Record<string, Stem> = {
  寅: "丙", 午: "丙", 戌: "丙", 申: "壬", 子: "壬", 辰: "壬",
  亥: "甲", 卯: "甲", 未: "甲",
};

const GROUP_TARGET: Record<string, Record<string, Branch>> = {
  桃花: { 寅: "卯", 午: "卯", 戌: "卯", 申: "酉", 子: "酉", 辰: "酉", 亥: "子", 卯: "子", 未: "子", 巳: "午", 酉: "午", 丑: "午" },
  驿马: { 寅: "申", 午: "申", 戌: "申", 申: "寅", 子: "寅", 辰: "寅", 亥: "巳", 卯: "巳", 未: "巳", 巳: "亥", 酉: "亥", 丑: "亥" },
  华盖: { 寅: "戌", 午: "戌", 戌: "戌", 申: "辰", 子: "辰", 辰: "辰", 亥: "未", 卯: "未", 未: "未", 巳: "丑", 酉: "丑", 丑: "丑" },
  将星: { 寅: "午", 午: "午", 戌: "午", 申: "子", 子: "子", 辰: "子", 亥: "卯", 卯: "卯", 未: "卯", 巳: "酉", 酉: "酉", 丑: "酉" },
};

const add = (result: string[], label: string) => {
  if (!result.includes(label)) result.push(label);
};

export const buildShenSha = (
  pillars: BaziPillarDetail[],
  dayMaster: Stem,
): string[][] => {
  const yearBranch = pillars.find((pillar) => pillar.key === "year")?.earthlyBranch;
  const dayBranch = pillars.find((pillar) => pillar.key === "day")?.earthlyBranch;
  const monthBranch = pillars.find((pillar) => pillar.key === "month")?.earthlyBranch;

  return pillars.map((pillar) => {
    const result: string[] = [];
    const { heavenlyStem, earthlyBranch } = pillar;

    if (TIAN_YI[dayMaster]?.includes(earthlyBranch)) add(result, "天乙贵人");
    if (WEN_CHANG[dayMaster] === earthlyBranch) add(result, "文昌贵人");
    if (LU_SHEN[dayMaster] === earthlyBranch) add(result, "禄神");
    if (YANG_REN[dayMaster] === earthlyBranch) add(result, "羊刃");
    const tianDe = monthBranch ? TIAN_DE[monthBranch] : undefined;
    if (tianDe?.stem === heavenlyStem || tianDe?.branch === earthlyBranch) add(result, "天德贵人");
    if (monthBranch && YUE_DE[monthBranch] === heavenlyStem) add(result, "月德贵人");

    for (const [label, targets] of Object.entries(GROUP_TARGET)) {
      if (yearBranch && targets[yearBranch] === earthlyBranch) add(result, `${label}（年）`);
      if (dayBranch && targets[dayBranch] === earthlyBranch) add(result, `${label}（日）`);
    }

    return result;
  });
};
