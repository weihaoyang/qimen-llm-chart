/**
 * 北欧宇宙九界（Nine Worlds）参考表。
 *
 * 这是北欧神话中关于 Yggdrasil（世界之树）三层九界的通行说法，
 * 属神话传说整理，不是可计算系统，也不作现实解读。
 */

export type NineWorld = {
  id: string;
  name: string;
  nameZh: string;
  residents: string;
  level: "上" | "中" | "下";
  note: string;
};

export const YGGDRASIL_LEVELS: Record<NineWorld["level"], string> = {
  上: "树冠 / 诸神与精灵之境",
  中: "树干 / 人类与巨人、矮人之境",
  下: "树根 / 火、冰与亡者之境",
};

export const NINE_WORLDS: NineWorld[] = [
  { id: "asgard", name: "Asgard", nameZh: "阿斯加德", residents: "阿萨神族（Æsir）", level: "上", note: "奥丁与众神居所，英灵殿（Valhalla）在此。" },
  { id: "vanaheim", name: "Vanaheim", nameZh: "华纳海姆", residents: "华纳神族（Vanir）", level: "上", note: "与阿萨神族曾交战，后和解并交换人质。" },
  { id: "alfheim", name: "Alfheim", nameZh: "亚尔夫海姆", residents: "光精灵（Ljósálfar）", level: "上", note: "由弗雷（Freyr）统辖的精灵之乡。" },
  { id: "midgard", name: "Midgard", nameZh: "中庭", residents: "人类", level: "中", note: "人类居所，环绕以尘世巨蟒（Jörmungandr）。" },
  { id: "jotunheim", name: "Jotunheim", nameZh: "约顿海姆", residents: "霜巨人（Jötnar）", level: "中", note: "巨人之乡，与诸神长期对立又通婚。" },
  { id: "svartalfheim", name: "Svartalfheim / Nidavellir", nameZh: "斯瓦塔尔法海姆", residents: "矮人 / 黑暗精灵", level: "中", note: "巧匠之乡，诸神宝物多出于此。" },
  { id: "muspelheim", name: "Muspelheim", nameZh: "穆斯贝尔海姆", residents: "火巨人（苏尔特尔统领）", level: "下", note: "诸神黄昏中，苏尔特尔将焚毁世界。" },
  { id: "niflheim", name: "Niflheim", nameZh: "尼福尔海姆", residents: "冰雪与雾", level: "下", note: "创世之初的冰雾之国，与穆斯贝尔海姆相对。" },
  { id: "helheim", name: "Helheim", nameZh: "赫尔海姆", residents: "亡者（非战死者）", level: "下", note: "由洛基之女赫尔（Hel）统辖的冥界。" },
];
