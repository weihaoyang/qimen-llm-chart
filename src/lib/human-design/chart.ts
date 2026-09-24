import type { NormalizedProfileInput } from "@/lib/profile";
import type { HumanDesignChart, HumanDesignCenter, HumanDesignType } from "./types";
const CENTERS = ["头", "阿基那", "喉咙", "G中心", "意志力", "脾", "情绪", "骶骨", "根部"];
const hash = (value: string) => Array.from(value).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
export const buildHumanDesignChart = (profile: NormalizedProfileInput): HumanDesignChart => {
  const seed = hash(`${profile.normalized.datetime}|${profile.normalized.timeZone}`);
  const centers: HumanDesignCenter[] = CENTERS.map((name, index) => ({ name, defined: ((seed >>> index) & 1) === 1, gate: ((seed + index * 17) % 64) + 1 }));
  const defined = centers.filter((center) => center.defined).length;
  const type: HumanDesignType = defined <= 1 ? "反映者" : centers[7].defined ? (centers[2].defined ? "显示生产者" : "生成者") : centers[2].defined ? "投射者" : "显化者";
  return {
    format: "qmdj-human-design-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone }, type,
    strategy: type === "生成者" || type === "显示生产者" ? "等待回应" : type === "投射者" ? "等待邀请" : type === "反映者" ? "等待一个月亮周期" : "等待告知",
    authority: centers[6].defined ? "情绪权威" : centers[5].defined ? "脾脏权威" : centers[7].defined ? "骶骨权威" : "自我投射",
    profile: `${(seed % 6) + 1}/${((seed >>> 3) % 6) + 1}`, incarnationCross: `闸门 ${((seed >>> 5) % 64) + 1} / ${((seed >>> 11) % 64) + 1}`,
    centers, disclaimer: "研究性人类图 MVP：闸门与中心用于工作台结构化探索，不代表认证排盘或医学、心理诊断。",
  };
};
