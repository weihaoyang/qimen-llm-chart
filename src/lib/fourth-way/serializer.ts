import { FOURTH_WAY_CONTENT, type FourthWayContent } from "./content";

export const serializeFourthWayToStructuredText = (content: FourthWayContent = FOURTH_WAY_CONTENT) =>
  [
    `${content.title}（研习提要）`,
    content.intro,
    ...content.sections.flatMap((section) => [`## ${section.title}`, section.summary, ...section.points.map((point) => `- ${point}`)]),
    `边界：${content.disclaimer}`,
  ].join("\n");

export const serializeFourthWayToCompactJson = (content: FourthWayContent = FOURTH_WAY_CONTENT) => JSON.stringify(content);
