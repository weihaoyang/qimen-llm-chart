import { buildDreamspell, type DreamspellChart } from "./dreamspell";
import { buildTraditionalCalendar, type TraditionalCalendar } from "./traditional";

export const MAYA_CORRELATION = 584283;

export type MayaChart = {
  format: "qmdj-maya-v1";
  date: string;
  correlation: number;
  traditional: TraditionalCalendar;
  dreamspell: DreamspellChart;
  disclaimer: string;
};

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const buildMayaChart = (iso: string): MayaChart => {
  const date = ISO_PATTERN.test(iso) ? iso : iso.slice(0, 10);
  return {
    format: "qmdj-maya-v1",
    date,
    correlation: MAYA_CORRELATION,
    traditional: buildTraditionalCalendar(date),
    dreamspell: buildDreamspell(date),
    disclaimer:
      "研究性历法换算：传统部分采用 GMT 相关系数 584283（0.0.0.0.0 = 4 Ajaw 8 Kumkʼu），学界另有 584285 / 584286 等口径；13:20 部分为 Dreamspell / 十三月历的通行算法（闰日不推进 kin）。日名、印调名称与神谕含义属该体系的命名与象征解释，不构成预测或现实裁决。",
  };
};
