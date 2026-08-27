import type { ScenarioSeed } from "./catalog";

export type ScenarioStrategyTemplate = {
  id: "LEVERAGE_STRIKE" | "FIELD_SHIFT" | "SCORCHED_EARTH";
  name: string;
  codeName: string;
  coreIdea: string;
  primaryLever: string;
  resourceList: string[];
  sacrificeList: string[];
  successSignal: string;
  initialFirstStep: string;
  survivalProbability: number;
  coreAssetProtectionRate: number;
  estimatedCashAt30Days: number;
  estimatedCashAt60Days: number;
  ghostTimeline: Array<{ day:number; cashRunwayDays:number; survivalProb:number; customerTrust:number; eventLabel?:string; isPivotalPoint?:boolean; pivotalRiskDescription?:string }>;
  criticalWindow: string;
  leadingIndicators: string[];
  abortCriteria: string;
};

/** Official scenario content. Served only after battle access is authorized. */
const templates: readonly ScenarioStrategyTemplate[] = [
  { id:"LEVERAGE_STRIKE", name:"杠杆打击", codeName:"Leverage Strike · 结构性支点饱和击穿", coreIdea:"识别战局中最脆弱、影响最大的结构性支点，将大部分资源集中于此，暂时放弃其他阵地。", primaryLever:"客户内审合规流程中的数据迁移安全风险与对手的回报周期压力。", resourceList:["集中研发力量在 48 小时内完成合规与安全材料", "创始人直接约见客户审计与法务负责人", "保留预算用于第三方专家论证与行业背书"], sacrificeList:["暂停长尾客户功能迭代与定制需求", "放弃短期小额现金流项目", "承担团队短期高强度工作的疲劳风险"], successSignal:"客户法务及审计部门要求采购重新核验方案的合规风险。", initialFirstStep:"在下一次正式沟通前完成竞品数据安全风险对照表，并交付给客户法务与安全负责人。", survivalProbability:58, coreAssetProtectionRate:85, estimatedCashAt30Days:140000, estimatedCashAt60Days:80000, ghostTimeline:[{day:0,cashRunwayDays:59,survivalProb:35,customerTrust:50,eventLabel:"饱和攻击启动"},{day:7,cashRunwayDays:52,survivalProb:48,customerTrust:65,eventLabel:"合规函件送达",isPivotalPoint:true,pivotalRiskDescription:"若法务没有进入正式复核，必须在 48 小时内转入下一方案。"},{day:15,cashRunwayDays:45,survivalProb:55,customerTrust:72,eventLabel:"采购复核"},{day:30,cashRunwayDays:68,survivalProb:58,customerTrust:80,eventLabel:"重启谈判"},{day:60,cashRunwayDays:120,survivalProb:65,customerTrust:88,eventLabel:"续约或退出路径明确"}], criticalWindow:"未来 72 小时，在客户预算初审前完成证据材料。", leadingIndicators:["客户法务是否接收并回复材料", "采购是否推迟竞争性评审", "对手是否开始解释合规资质"], abortCriteria:"若客户正式确认已批准豁免条款，立即中止，保全剩余资金。" },
  { id:"FIELD_SHIFT", name:"改变战场", codeName:"Field Shift · 升维重构博弈规则", coreIdea:"如果在价格战必输，就把博弈带入定制化数据安全与业务工作流深度集成的新维度。", primaryLever:"把标准 SaaS 价格比较转为私有部署、数据隔离和行业工作流交付。", resourceList:["将现有能力整理为私有化或混合云交付方案", "联合合规的云服务伙伴共同投标", "准备说明低价方案风险的可核验材料"], sacrificeList:["放弃与对手进行纯价格比较", "承认标准版市场收缩，转向高客单价服务", "让渡一部分合作伙伴利润"], successSignal:"客户业务部门将私有化数据隔离列为明确的采购要求。", initialFirstStep:"在 48 小时内与战略伙伴共同递交混合云架构和专属运维提案。", survivalProbability:65, coreAssetProtectionRate:78, estimatedCashAt30Days:125000, estimatedCashAt60Days:190000, ghostTimeline:[{day:0,cashRunwayDays:59,survivalProb:40,customerTrust:55,eventLabel:"新战场转移"},{day:10,cashRunwayDays:50,survivalProb:52,customerTrust:68,eventLabel:"联合方案送审",isPivotalPoint:true,pivotalRiskDescription:"若合作伙伴无法锁定支持，必须停止依赖其交付资格。"},{day:25,cashRunwayDays:42,survivalProb:62,customerTrust:82,eventLabel:"技术指标重构"},{day:40,cashRunwayDays:60,survivalProb:65,customerTrust:86,eventLabel:"高客单项目决策"},{day:60,cashRunwayDays:145,survivalProb:72,customerTrust:90,eventLabel:"回款或退出方案明确"}], criticalWindow:"未来 7 天，在客户冻结技术指标前完成方案植入。", leadingIndicators:["技术组对私有化隔离的认可度", "伙伴是否签署联合投标协议", "风险材料是否被正式纳入评审"], abortCriteria:"若客户明确禁止定制化和私有化方案，立即中止，转向资产保全。" },
  { id:"SCORCHED_EARTH", name:"焦土对冲", codeName:"Scorched Earth · 利益捆绑与战略威慑", coreIdea:"当独立存活概率过低时，以严格保密的资产合作或并购通道交换时间、现金和团队连续性。", primaryLever:"将可转移资产和团队能力与可信战略方的利益绑定，换取过桥支持。", resourceList:["启动保密的战略投资或资产合作通道", "整理核心资产与协同价值清单", "明确对外沟通与数据保密边界"], sacrificeList:["让渡部分控制权或品牌独立性", "接受时间紧迫下的估值折扣", "从独立运营转向合作方体系"], successSignal:"战略方在限定时间内出具可执行的意向和过桥支持，或客户因此重新评估换商风险。", initialFirstStep:"与潜在战略方进行保密沟通，并交付经过权限控制的资产与协同清单。", survivalProbability:82, coreAssetProtectionRate:92, estimatedCashAt30Days:320000, estimatedCashAt60Days:600000, ghostTimeline:[{day:0,cashRunwayDays:59,survivalProb:50,customerTrust:45,eventLabel:"战略通道开启"},{day:7,cashRunwayDays:55,survivalProb:68,customerTrust:60,eventLabel:"意向沟通",isPivotalPoint:true,pivotalRiskDescription:"尽调泄漏会造成团队动荡，必须验证保密与过桥承诺。"},{day:20,cashRunwayDays:95,survivalProb:78,customerTrust:75,eventLabel:"过桥条件确认"},{day:45,cashRunwayDays:180,survivalProb:82,customerTrust:85,eventLabel:"合作或资产安排完成"},{day:60,cashRunwayDays:365,survivalProb:90,customerTrust:92,eventLabel:"团队连续性恢复"}], criticalWindow:"未来 10 天，在现金跑道耗尽前确认可执行的过桥条件。", leadingIndicators:["战略方是否签署保密协议并启动尽调", "意向是否含不可撤销的过桥支持", "客户是否因战略动向重新评估"], abortCriteria:"若尽调周期过长且没有过桥支持，立即叫停，防止核心资产被无偿套取。" },
];

export function strategyTemplatesForScenario(_scenario: Pick<ScenarioSeed, "id">): readonly ScenarioStrategyTemplate[] {
  return templates;
}
