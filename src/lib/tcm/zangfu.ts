/**
 * 干支／五行 ↔ 中医脏腑、经络、官窍、情志、五味、五色、五音、五数 的对应表。
 *
 * 每张表都注明出处（逐字原文登记在 `src/lib/provenance/registry.ts` 的 `bazi-tcm` 条目里，
 * 面板内「出处与原文」可直接查阅）。**本文件只做对应，不做辨证、不给方药、不做诊断。**
 *
 * 出处一览（均为公有领域古籍）：
 * - 《素问·藏气法时论》「肝主春…其日甲乙；心主夏…其日丙丁；脾主长夏…其日戊己；
 *   肺主秋…其日庚辛；肾主冬…其日壬癸」——五脏主时与配日；
 * - 明·高武《针灸聚英·十二经纳天干歌》「甲胆乙肝丙小肠，丁心戊胃己脾乡，庚属大肠辛属肺，
 *   壬属膀胱癸肾藏，三焦亦向壬中寄，包络同归入癸方」——十干配脏腑（含三焦、心包寄壬癸）；
 * - 明·徐凤《针灸大全·十二经纳地支歌》「肺寅大卯胃辰宫，脾巳心午小未中，申胱酉肾心包戌，
 *   亥三子胆丑肝通」——十二时辰配十二经（子午流注纳子法）；
 * - 《素问·阴阳应象大论》五方段——五行配脏、体、色、音、声、变动、窍、味、志；
 * - 《素问·金匮真言论》五方段——五行配色、脏、窍、味、类、畜、谷、星、音、数、臭。
 *
 * 已知异说：十二经纳支歌有《针灸大成》《针灸聚英》两个别本（用字略异，如「脾已」「亥焦」
 * 「胃辰经」「申膀」），本文件采用《针灸大全》本；十干配脏腑另有「三焦、心包寄壬癸」一法
 *（本文件同时给出寄位，不覆盖原配）。
 */

import type { WuXing } from "./yunqi";

/** 十干配脏腑（《针灸聚英·十二经纳天干歌》）：每干对应一经一脏腑。 */
export const ZANG_FU_BY_GAN: Record<string, string> = {
  甲: "胆",
  乙: "肝",
  丙: "小肠",
  丁: "心",
  戊: "胃",
  己: "脾",
  庚: "大肠",
  辛: "肺",
  壬: "膀胱",
  癸: "肾",
};

/** 三焦／心包寄位（同歌末句：「三焦亦向壬中寄，包络同归入癸方」）。 */
export const JI_WEI_BY_GAN: Record<string, string> = {
  壬: "三焦（寄壬）",
  癸: "心包（寄癸）",
};

/** 十二时辰（地支）配十二经（《针灸大全·十二经纳地支歌》，子午流注纳子法）。 */
export const MERIDIAN_BY_ZHI: Record<string, string> = {
  寅: "肺",
  卯: "大肠",
  辰: "胃",
  巳: "脾",
  午: "心",
  未: "小肠",
  申: "膀胱",
  酉: "肾",
  戌: "心包",
  亥: "三焦",
  子: "胆",
  丑: "肝",
};

/** 五脏主时与配日（《素问·藏气法时论》）。 */
export const ZANG_SEASON_BY_ELEMENT: Record<WuXing, { zang: string; season: string; meridian: string }> = {
  木: { zang: "肝", season: "春", meridian: "足厥阴少阳" },
  火: { zang: "心", season: "夏", meridian: "手少阴太阳" },
  土: { zang: "脾", season: "长夏", meridian: "足太阴阳明" },
  金: { zang: "肺", season: "秋", meridian: "手太阴阳明" },
  水: { zang: "肾", season: "冬", meridian: "足少阴太阳" },
};

/** 五行配属（《素问·阴阳应象大论》五方段 + 《素问·金匮真言论》五方段）。 */
export type ElementAttributes = {
  element: WuXing;
  zang: string;
  body: string;
  orifice: string;
  emotion: string;
  flavor: string;
  color: string;
  note: string;
  voice: string;
  number: string;
  smell: string;
  grain: string;
};

export const ELEMENT_ATTRIBUTES: ReadonlyArray<ElementAttributes> = [
  { element: "木", zang: "肝", body: "筋", orifice: "目", emotion: "怒", flavor: "酸", color: "苍（青）", note: "角", voice: "呼", number: "八", smell: "臊", grain: "麦" },
  { element: "火", zang: "心", body: "脉（血）", orifice: "舌（耳）", emotion: "喜", flavor: "苦", color: "赤", note: "徵", voice: "笑", number: "七", smell: "焦", grain: "黍" },
  { element: "土", zang: "脾", body: "肉", orifice: "口", emotion: "思", flavor: "甘", color: "黄", note: "宫", voice: "歌", number: "五", smell: "香", grain: "稷" },
  { element: "金", zang: "肺", body: "皮毛", orifice: "鼻", emotion: "忧", flavor: "辛", color: "白", note: "商", voice: "哭", number: "九", smell: "腥", grain: "稻" },
  { element: "水", zang: "肾", body: "骨（髓）", orifice: "耳（二阴）", emotion: "恐", flavor: "咸", color: "黑", note: "羽", voice: "呻", number: "六", smell: "腐", grain: "豆" },
];
