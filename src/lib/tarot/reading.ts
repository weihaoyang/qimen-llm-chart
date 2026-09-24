import type { NormalizedProfileInput } from "@/lib/profile";
import type { TarotCard, TarotReading } from "./types";
const DECK = ["愚者|开始|带着开放心态迈出第一步", "魔术师|行动|把已有资源组织成具体行动", "女祭司|直觉|给沉默的信息留出观察时间", "皇后|滋养|让关系与资源获得持续照料", "皇帝|边界|建立清晰规则与责任", "教皇|传统|向可靠经验与共同规则求证", "恋人|选择|把价值排序说清楚再决定", "战车|推进|聚焦方向并控制节奏", "力量|耐心|以稳定而非强压处理阻力", "隐者|复盘|暂时退后整理自己的判断", "命运之轮|变化|接受周期变化并观察转折", "正义|校准|让承诺与实际成本保持一致", "倒吊人|换位|暂停旧视角寻找新解法", "死神|结束|为新的阶段释放旧结构", "节制|调和|用小步试验恢复平衡", "恶魔|依附|识别让选择变窄的绑定", "高塔|突变|预留空间应对突然重组", "星星|希望|保留可验证的长期方向", "月亮|不确定|把猜测与事实分开核对", "太阳|清晰|让成果与现实反馈见光", "审判|召回|回应已经反复出现的主题", "世界|完成|收束循环并整理下一阶段"];
const hash = (value: string) => Array.from(value).reduce((total, char) => (total * 33 + char.charCodeAt(0)) >>> 0, 5381);
export const buildTarotReading = (profile: NormalizedProfileInput): TarotReading => {
  const seed = hash(`${profile.normalized.datetime}|${profile.normalized.timeZone}`);
  const cards: TarotCard[] = ["当前主题", "阻力", "下一步"].map((position, index) => {
    const number = (seed + index * 7) % DECK.length;
    const [name, keyword, meaning] = DECK[number].split("|");
    return { name, number, orientation: ((seed >>> index) & 1) ? "正位" : "逆位", keyword, meaning: ((seed >>> index) & 1) ? meaning : `反向核对：${meaning}` };
  });
  return { format: "qmdj-tarot-reading-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone }, spread: "三张牌：当前主题 / 阻力 / 下一步", cards, disclaimer: "研究性塔罗抽牌：牌面用于自我反思与问题整理，不替代事实核验或专业建议。" };
};
