import { getMutagensByHeavenlyStem } from "iztro/lib/utils";
import type { NormalizedProfileInput } from "@/lib/profile";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";
import type { ZiweiPalaceSummary } from "@/lib/ziwei/types";
import { HE_TU, INNER_PALACES, LUO_SHU, MUTAGEN_NAMES, STEM_MUTAGENS, TIAN_YI } from "./data";

export type FlyingHit = {
  mutagen: (typeof MUTAGEN_NAMES)[number];
  star: string;
  toPalace: string;
  toIndex: number;
  self: boolean;
};

export type FlyingRow = {
  index: number;
  palace: string;
  stem: string;
  branch: string;
  branchIndex: number;
  isInner: boolean;
  isLaiYin: boolean;
  isTianYi: boolean;
  luoShu: number;
  trigram: string;
  nineStar: string;
  heTu: string;
  hits: FlyingHit[];
  incoming: Array<{ fromPalace: string; mutagen: string; star: string }>;
};

export type ZiweiFlyingChart = {
  format: "qmdj-ziwei-flying-v1";
  input: { datetime: string; timeZone: string };
  year: { stem: string; branch: string; ganZhi: string };
  laiYin: { palace: string; index: number } | null;
  tianYi: { branches: string[]; palaces: string[] };
  natives: Array<{ mutagen: string; star: string; palace: string; index: number }>;
  rows: FlyingRow[];
  chains: {
    luZhuanJi: Array<{ origin: string; star: string; via: string; to: string; star2: string }>;
    jiZhuanJi: Array<{ origin: string; star: string; via: string; to: string; star2: string }>;
  };
  disclaimer: string;
};

const starPalaceIndex = (palaces: ZiweiPalaceSummary[], star: string) => {
  const found = palaces.findIndex((palace) =>
    [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].some((item) => item.name === star),
  );
  return found;
};

export const buildZiweiFlyingChart = (profile: NormalizedProfileInput): ZiweiFlyingChart => {
  const chart = buildZiweiChartFromProfile(profile);
  const palaces = chart.raw.palaces;
  const [yearStem, yearBranch] = chart.raw.rawDates.chineseDate.yearly;

  // 生年四化
  const nativeStars = getMutagensByHeavenlyStem(yearStem as never) as unknown as string[];
  const natives = MUTAGEN_NAMES.map((mutagen, order) => {
    const star = nativeStars[order] ?? STEM_MUTAGENS[yearStem]?.[order] ?? "";
    const index = starPalaceIndex(palaces, star);
    return { mutagen, star, palace: index >= 0 ? palaces[index].name : "—", index };
  });

  // 来因宫（生年天干所在的六内宫）
  const candidates = palaces.filter((palace) => palace.heavenlyStem === yearStem);
  const laiYinPalace = candidates.find((palace) => INNER_PALACES.includes(palace.name)) ?? candidates[0] ?? null;

  // 天乙贵人宫
  const tianYiBranches = TIAN_YI[yearStem] ?? ["", ""];
  const tianYiPalaces = tianYiBranches.map((branch) => palaces.find((palace) => palace.earthlyBranch === branch)?.name ?? "—");

  const tianYiPalaceNames = new Set(tianYiPalaces.filter((name) => name !== "—"));

  const rows: FlyingRow[] = palaces.map((palace) => {
    const stars = getMutagensByHeavenlyStem(palace.heavenlyStem as never) as unknown as string[];
    const hits: FlyingHit[] = MUTAGEN_NAMES.map((mutagen, order) => {
      const star = stars[order] ?? STEM_MUTAGENS[palace.heavenlyStem]?.[order] ?? "";
      const toIndex = starPalaceIndex(palaces, star);
      return { mutagen, star, toPalace: toIndex >= 0 ? palaces[toIndex].name : "—", toIndex, self: toIndex === palace.index };
    });
    const luoShu = LUO_SHU[palace.earthlyBranch];
    const heTu = luoShu ? HE_TU[luoShu.trigram] : undefined;

    // 向心化入：对宫宫干所化之星落入本宫
    const opposite = palaces.find((item) => item.branchIndex === (palace.branchIndex + 6) % 12);
    const incoming = opposite
      ? (getMutagensByHeavenlyStem(opposite.heavenlyStem as never) as unknown as string[]).flatMap((star, order) => {
          const toIndex = starPalaceIndex(palaces, star);
          return toIndex === palace.index ? [{ fromPalace: opposite.name, mutagen: MUTAGEN_NAMES[order], star }] : [];
        })
      : [];

    return {
      index: palace.index,
      palace: palace.name,
      stem: palace.heavenlyStem,
      branch: palace.earthlyBranch,
      branchIndex: palace.branchIndex,
      isInner: INNER_PALACES.includes(palace.name),
      isLaiYin: laiYinPalace?.name === palace.name,
      isTianYi: tianYiPalaceNames.has(palace.name),
      luoShu: luoShu?.number ?? 0,
      trigram: luoShu?.trigram ?? "",
      nineStar: luoShu?.nineStar ?? "",
      heTu: heTu ? `${heTu.pair[0]}·${heTu.pair[1]}（${heTu.element}·${heTu.direction}）` : "",
      hits,
      incoming,
    };
  });

  const follow = (originName: string, originIndex: number, star: string) => {
    const via = palaces[originIndex];
    if (!via) return null;
    const stars = getMutagensByHeavenlyStem(via.heavenlyStem as never) as unknown as string[];
    const star2 = stars[3] ?? STEM_MUTAGENS[via.heavenlyStem]?.[3] ?? "";
    const to = starPalaceIndex(palaces, star2);
    return { origin: originName, star, via: via.name, to: to >= 0 ? palaces[to].name : "—", star2 };
  };

  const anchors = natives.filter((item) => item.index >= 0);
  const luAnchor = anchors.find((item) => item.mutagen === "禄");
  const jiAnchor = anchors.find((item) => item.mutagen === "忌");

  return {
    format: "qmdj-ziwei-flying-v1",
    input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone },
    year: { stem: yearStem, branch: yearBranch, ganZhi: `${yearStem}${yearBranch}` },
    laiYin: laiYinPalace ? { palace: laiYinPalace.name, index: laiYinPalace.index } : null,
    tianYi: { branches: tianYiBranches.filter(Boolean), palaces: tianYiPalaces },
    natives,
    rows,
    chains: {
      luZhuanJi: luAnchor ? ([follow(luAnchor.palace, luAnchor.index, luAnchor.star)].filter(Boolean) as ZiweiFlyingChart["chains"]["luZhuanJi"]) : [],
      jiZhuanJi: jiAnchor ? ([follow(jiAnchor.palace, jiAnchor.index, jiAnchor.star)].filter(Boolean) as ZiweiFlyingChart["chains"]["jiZhuanJi"]) : [],
    },
    disclaimer:
      "紫微斗数「飞星（飞化）· 自化 · 河洛化象」研究盘：十干四化依通行口诀（甲廉破武阳…癸破巨阴贪），宫位与星曜数据来自 iztro（MIT）；飞化、自化、来因宫、禄转忌/忌转忌为北派通行技法；洛书数（一白…九紫）依后天八卦配十二支、河图数（1·6、2·7…）依卦位配生成数，属对照呈现。注意：「天乙飞星」一名未见统一文献术语，本仓按「年干取天乙贵人宫 + 宫干飞化」组合呈现，并在界面标明；本页不作吉凶断语、不替现实决策。",
  };
};
