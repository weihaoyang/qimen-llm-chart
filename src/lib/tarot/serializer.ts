import type { TarotReading } from "./types";
export const serializeTarotToStructuredText = (reading: TarotReading) => ["塔罗牌（研究性抽牌）", `牌阵：${reading.spread}`, ...reading.cards.map((card, index) => `${["当前主题", "阻力", "下一步"][index]}：${card.name}（${card.orientation}）· ${card.keyword} · ${card.meaning}`), `边界：${reading.disclaimer}`].join("\n");
export const serializeTarotToCompactJson = (reading: TarotReading) => JSON.stringify(reading);
