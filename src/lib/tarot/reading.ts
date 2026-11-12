import { cards, getCardMeaning } from "@cometpisces/tarot-kit";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { TarotCard, TarotReading, TarotSpreadId } from "./types";
const hash = (value: string) => Array.from(value).reduce((total, char) => (total * 33 + char.charCodeAt(0)) >>> 0, 5381);
const SPREADS: Record<TarotSpreadId, { label: string; positions: string[] }> = {
  "three-card": { label: "三张牌：当前主题 / 阻力 / 下一步", positions: ["当前主题", "阻力", "下一步"] },
  decision: { label: "决策三牌：现状 / 选项 / 建议", positions: ["现状", "选项", "建议"] },
  relationship: { label: "关系三牌：自己 / 对方 / 连接", positions: ["自己", "对方", "连接"] },
};
export const buildTarotReading = (profile: NormalizedProfileInput, seedOverride?: string, spreadId: TarotSpreadId = "three-card"): TarotReading => {
  const seedText = seedOverride ?? profile.normalized.datetime + "|" + profile.normalized.timeZone;
  const spread = SPREADS[spreadId];
  let seed = hash(seedText);
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const deck = [...cards];
  const readingCards: TarotCard[] = spread.positions.map((_, index) => {
    const selected = index + Math.floor(random() * (deck.length - index));
    [deck[index], deck[selected]] = [deck[selected], deck[index]];
    const card = deck[index];
    const reversed = random() < 0.5;
    return { id: card.id, name: card.name.zh ?? card.name.en, number: card.number, arcana: card.arcana, orientation: reversed ? "逆位" : "正位", keyword: card.coreKeyword.zh ?? card.coreKeyword.en, meaning: getCardMeaning({ card, orientation: reversed ? "reversed" : "upright" }, "zh") };
  });
  return { format: "qmdj-tarot-reading-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, seed: seedText }, spreadId, spread: spread.label, positions: spread.positions, cards: readingCards, disclaimer: "研究性塔罗抽牌：使用完整 78 张 Rider–Waite–Smith 牌组，牌义采用 tarot-kit 的现代释义；牌面核心词不区分正逆，具体牌义按正逆分别读取。当前按出生资料生成可复现抽牌，用于自我反思，不替代事实核验或专业建议。" };
};
