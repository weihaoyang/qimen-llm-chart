import { cards, getCardMeaning } from "@cometpisces/tarot-kit";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { TarotCard, TarotReading } from "./types";
const hash = (value: string) => Array.from(value).reduce((total, char) => (total * 33 + char.charCodeAt(0)) >>> 0, 5381);
export const buildTarotReading = (profile: NormalizedProfileInput, seedOverride?: string): TarotReading => {
  const seedText = seedOverride ?? profile.normalized.datetime + "|" + profile.normalized.timeZone;
  const seed = hash(seedText);
  const used = new Set<number>();
  const readingCards: TarotCard[] = ["当前主题", "阻力", "下一步"].map((_, index) => {
    let number = (seed + index * 17) % cards.length;
    while (used.has(number)) number = (number + 1) % cards.length;
    used.add(number);
    const card = cards[number];
    const reversed = ((seed >>> index) & 1) === 0;
    return { id: card.id, name: card.name.zh ?? card.name.en, number: card.number, arcana: card.arcana, orientation: reversed ? "逆位" : "正位", keyword: card.coreKeyword.zh ?? card.coreKeyword.en, meaning: getCardMeaning({ card, orientation: reversed ? "reversed" : "upright" }, "zh") };
  });
  return { format: "qmdj-tarot-reading-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, seed: seedText }, spread: "三张牌：当前主题 / 阻力 / 下一步", cards: readingCards, disclaimer: "研究性塔罗抽牌：使用完整 78 张 Rider-Waite 牌组；当前按出生资料生成可复现抽牌，用于自我反思，不替代事实核验或专业建议。" };
};
