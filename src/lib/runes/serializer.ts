import type { RuneReading } from "./draw";
import { AETTIR } from "./data";
import { NINE_WORLDS, YGGDRASIL_LEVELS } from "./nine-worlds";

export const serializeRunesToStructuredText = (reading: RuneReading) => [
  "卢恩符文（Elder Futhark）",
  `牌阵：${reading.spread.name}（${reading.spread.short}）—— ${reading.spread.tagline}`,
  ...reading.draws.map((draw, index) => {
    const position = reading.spread.positions[index];
    const meaning = draw.orientation === "reversed" ? draw.rune.reversed : draw.rune.upright;
    return `${index + 1}. ${position.name}（${position.q}）：${draw.rune.name} ${draw.rune.char} · ${draw.orientation === "reversed" ? "逆位" : "正位"} · ${AETTIR[draw.rune.aett].name} · 读音 ${draw.rune.sound} · 关键词 ${draw.rune.keywords.join("、")} · ${meaning} 建议：${draw.rune.advice}`;
  }),
  "",
  "北欧宇宙九界（Yggdrasil 三层）：",
  ...NINE_WORLDS.map((world) => `${world.level} · ${world.nameZh}（${world.name}）：${world.residents} —— ${world.note}`),
  `世界树分层：上 = ${YGGDRASIL_LEVELS.上}；中 = ${YGGDRASIL_LEVELS.中}；下 = ${YGGDRASIL_LEVELS.下}`,
  "边界：符文与九界属神话与象征体系，词义为该体系的文化解释；抽符为反思提示，不是预测，也不作医疗、心理或现实裁决。",
].join("\n");

export const serializeRunesToCompactJson = (reading: RuneReading) =>
  JSON.stringify({
    format: "qmdj-runes-v1",
    spread: { id: reading.spreadId, name: reading.spread.name, short: reading.spread.short },
    draws: reading.draws.map((draw, index) => ({
      position: reading.spread.positions[index],
      rune: { id: draw.rune.id, name: draw.rune.name, char: draw.rune.char, sound: draw.rune.sound, aett: AETTIR[draw.rune.aett].name, keywords: draw.rune.keywords, lore: draw.rune.lore },
      orientation: draw.orientation,
      meaning: draw.orientation === "reversed" ? draw.rune.reversed : draw.rune.upright,
      advice: draw.rune.advice,
    })),
    nineWorlds: NINE_WORLDS,
  });
