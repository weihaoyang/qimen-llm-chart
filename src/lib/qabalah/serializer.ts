import type { QabalahReading } from "./chart";
import { LETTERS, SEPHIROT, WORLDS } from "./data";

export const serializeQabalahToStructuredText = (reading: QabalahReading) => [
  "赫尔墨斯卡巴拉（四界 · 二十二字母 · 数术）",
  `输入：${reading.input || "（空）"} · 字母 ${reading.letters.length} 个 · 标准值 ${reading.standard} · 数根 ${reading.digitalRoot}`,
  reading.sephirah ? `数根对照：第 ${reading.sephirah.number} 辉 ${reading.sephirah.name}（${reading.sephirah.zh}）· 天使 ${reading.sephirah.archangel} · 天使序 ${reading.sephirah.order}${reading.world ? ` · 界 ${reading.world.name}（${reading.world.zh}）` : ""}` : "数根对照：—",
  "",
  "字母（逐字数值 / 属性 / 塔罗）：",
  ...reading.letters.map((letter) => `- ${letter.letter} ${letter.name}（${letter.zh}）= ${letter.value} · ${letter.kind}·${letter.attribution}${letter.path ? ` · 路径 ${letter.path}` : ""} · 塔罗 ${letter.tarot}`),
  "",
  "十三法：",
  ...reading.methods.map((method) => `- ${method.label}：${method.value}`),
  `Atbash：${reading.atbash || "—"} · Albam：${reading.albam || "—"}`,
  `同值字母：${reading.sameValueLetters.length ? reading.sameValueLetters.map((letter) => `${letter.name}（${letter.zh}）`).join("、") : "无"}`,
  "",
  "四界：",
  ...WORLDS.map((world) => `- ${world.name}（${world.zh}）：元素 ${world.element} · 四字圣名位 ${world.letter} · 神名 ${world.divineNameTranslit} · 天使 ${world.archangel} · 天使序 ${world.order} · 对应辉 ${world.sephirot.join("、")} · 灵魂层 ${world.soul}`),
  "",
  "十辉：",
  ...SEPHIROT.map((sephirah) => `- ${sephirah.number} ${sephirah.name}（${sephirah.zh}）：神名 ${sephirah.divineNameTranslit} · 天使 ${sephirah.archangel} · 天使序 ${sephirah.order} · ${sephirah.pillar} · ${sephirah.attribution}`),
  "",
  `二十二字母（路径 11–32）：${LETTERS.map((letter) => `${letter.glyph}${letter.value}`).join(" ")}`,
  "",
  `边界：${reading.disclaimer}`,
].join("\n");

export const serializeQabalahToCompactJson = (reading: QabalahReading) =>
  JSON.stringify({
    format: "qmdj-qabalah-v1",
    input: reading.input,
    standard: reading.standard,
    digitalRoot: reading.digitalRoot,
    sephirah: reading.sephirah ? [reading.sephirah.number, reading.sephirah.name, reading.sephirah.zh, reading.sephirah.archangel, reading.sephirah.order] : null,
    world: reading.world ? [reading.world.name, reading.world.zh, reading.world.element, reading.world.archangel, reading.world.order] : null,
    letters: reading.letters.map((letter) => [letter.letter, letter.value, letter.base, letter.kind, letter.attribution, letter.tarot, letter.path]),
    methods: reading.methods.map((method) => [method.method, method.value]),
    sameValueLetters: reading.sameValueLetters.map((letter) => letter.name),
    atbash: reading.atbash,
    albam: reading.albam,
    worlds: WORLDS.map((world) => [world.name, world.element, world.divineNameTranslit, world.archangel, world.order, world.sephirot]),
    sephirot: SEPHIROT.map((sephirah) => [sephirah.number, sephirah.name, sephirah.divineNameTranslit, sephirah.archangel, sephirah.order]),
    lettersTable: LETTERS.map((letter) => [letter.path, letter.glyph, letter.name, letter.value, letter.kind, letter.attribution, letter.tarot]),
    boundary: "四界与十辉的天使/神名对照、字母↔塔罗/元素/行星/星座对照为赫尔墨斯传统通行对应；十辉与字母数值出自《创造之书》；gematria 十三法引自 MIT 的 mispar。仅供研究。",
  });
