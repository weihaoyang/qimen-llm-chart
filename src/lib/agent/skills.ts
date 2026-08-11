import type { WorkbenchMode } from "@/lib/workbench/types";

export type AgentSkillId =
  | "evidence-ledger"
  | "bazi-classics"
  | "qimen-structure"
  | "ziwei-linkage"
  | "combined-compare"
  | "life-trend"
  | "algorithm-audit"
  | "daliuren-classes"
  | "taiyi-observation";

export type AgentSkillDefinition = {
  id: AgentSkillId;
  label: string;
  description: string;
  prompt: string;
  modes: readonly string[];
};

export const AGENT_SKILLS: readonly AgentSkillDefinition[] = [
  {
    id: "evidence-ledger",
    label: "证据账本",
    description: "把每个判断绑定到事实、推断、假设和下一步验证。",
    prompt: "所有核心判断都按‘盘面事实 → 传统推断 → 待验证假设 → 现实验证’落账；缺少字段时标记材料不足。",
    modes: ["*"],
  },
  {
    id: "bazi-classics",
    label: "八字文献",
    description: "优先引用当前问题最相关的古籍摘录。",
    prompt: "八字文献只引用已提供的原始摘录，保留书名/篇目，原文与现代解释分开，不以单句古文替代全盘判断。",
    modes: ["bazi", "combined", "research"],
  },
  {
    id: "qimen-structure",
    label: "奇门取证",
    description: "按时令、局数、值符值使、门星神和宫位取证。",
    prompt: "奇门按‘时令/遁局/局数 → 值符值使 → 相关宫位 → 门星神干 → 空亡驿马旺衰’顺序取证。",
    modes: ["qimen", "combined"],
  },
  {
    id: "ziwei-linkage",
    label: "紫微联动",
    description: "围绕命宫、身宫、三方四正、四化与运限分层。",
    prompt: "紫微必须区分本命、三方四正、四化和运限；不得用单颗星直接等同于确定事件。",
    modes: ["ziwei", "combined"],
  },
  {
    id: "combined-compare",
    label: "三盘比较",
    description: "只在议题、时间层级和字段语义可比时判定共振。",
    prompt: "三盘联合先分盘列事实，再比较同一议题和时间层级；每个共振、互补或冲突都要标注来源盘与字段。",
    modes: ["combined"],
  },
  {
    id: "life-trend",
    label: "人生趋势",
    description: "解释结构波动 K 线，不伪装成财富或事件预测。",
    prompt: "人生趋势只解释大运、流年、十二长生、关系和神煞构成的结构波动；不把分数写成财富、健康或事件概率。",
    modes: ["research"],
  },
  {
    id: "algorithm-audit",
    label: "算法核验",
    description: "并列主引擎和参考引擎输出，解释差异来源。",
    prompt: "算法核验只报告输入、口径和输出差异；不要把某个引擎自动认定为唯一正确，优先指出节气、年界、时区和用局法差异。",
    modes: ["research"],
  },
  {
    id: "daliuren-classes",
    label: "大六壬四课三传",
    description: "围绕天地盘、四课、三传和课体组织材料。",
    prompt: "大六壬分析必须先列天地盘、四课、三传、课体，再区分传统推断和现实验证，不把三传当作确定事件时间表。",
    modes: ["research"],
  },
  {
    id: "taiyi-observation",
    label: "太乙九星",
    description: "按年/月/日/时尺度解释太乙观测锚点。",
    prompt: "太乙分析明确当前尺度（日盘等）、主星、五行、方位和判断歌诀来源；不得越过输入尺度推断个人宿命。",
    modes: ["research"],
  },
];

export const selectAgentSkills = ({ mode, question = "", focus = "", tool = "" }: { mode: WorkbenchMode | string; question?: string; focus?: string; tool?: string }) => {
  const text = `${question} ${focus} ${tool}`.toLowerCase();
  const selected = AGENT_SKILLS.filter((skill) => skill.modes.includes("*") || skill.modes.includes(mode)).filter((skill) => {
    if (skill.id === "evidence-ledger") return true;
    if (skill.id === "bazi-classics") return /八字|文献|古籍|四柱/.test(text) || mode === "combined";
    if (skill.id === "qimen-structure") return /奇门|宫位|值符|值使|门星神/.test(text) || mode === "qimen" || mode === "combined";
    if (skill.id === "ziwei-linkage") return /紫微|命宫|身宫|四化|三方四正/.test(text) || mode === "ziwei" || mode === "combined";
    if (skill.id === "combined-compare") return mode === "combined" || /三盘|共振|分歧/.test(text);
    if (skill.id === "life-trend") return tool === "trend" || /趋势|大运|流年|k线/.test(text);
    if (skill.id === "algorithm-audit") return tool === "verification" || /核验|差异|算法|引擎/.test(text);
    if (skill.id === "daliuren-classes") return tool === "daliuren" || /六壬|四课|三传/.test(text);
    if (skill.id === "taiyi-observation") return tool === "taiyi" || /太乙|九星观测/.test(text);
    return false;
  });
  return selected.length > 0 ? selected : [AGENT_SKILLS[0]];
};

export const formatAgentSkillsPrompt = (skills: readonly AgentSkillDefinition[]) =>
  ["【当前启用的 Agent 技能】", ...skills.map((skill) => `- ${skill.label}：${skill.prompt}`)].join("\n");
