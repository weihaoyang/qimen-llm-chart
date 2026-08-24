export type ScenarioModule = {
  id: "reality-echoes" | "observer-conclaves" | "archon-tier" | "ai-symbiote";
  title: string;
  description: string;
  access: "included" | "advanced";
};

export type ScenarioSeed = {
  id: string;
  version: number;
  kind: "battlefield" | "case-study";
  title: string;
  subtitle: string;
  industry: string;
  description: string;
  objective: string;
  minimumOutcome: string;
  idealOutcome: string;
  opponentSummary: string;
  hardDeadlineDays: number;
  modules: ScenarioModule[];
  facts: Array<{ kind: "fact" | "assumption" | "unknown" | "goal" | "emotion"; content: string; confidence: number }>;
  constraints: Array<{ kind: "cash" | "time" | "energy" | "legal" | "contract" | "health" | "relationship" | "reputation" | "privacy" | "other"; label: string; description: string; hard: boolean; severity: number }>;
  inventory: Array<{ category: "cash" | "time" | "skill" | "asset" | "information" | "relationship" | "credential" | "channel" | "other"; label: string; description: string; quantity?: number; unit?: string }>;
  caseStudy?: {
    authorPseudonym: string;
    difficulty: "HIGH" | "EXTREME";
    backgroundSummary: string;
    coreDilemma: string;
    timeRunway: string;
    financialStatus: string;
    choices: Array<{ id:string; name:string; typeLabel:string; description:string; communityChoicePercent:number; survivalRate:number; isAuthorActualChoice:boolean }>;
    authorActualOutcome: string;
    keyTakeaway: string;
    totalSimulations: number;
    bountyReward: number;
  };
};

const modules: ScenarioModule[] = [
  { id: "reality-echoes", title: "现实回响", description: "观察策略落地后的连锁后果与因果尘埃。", access: "included" },
  { id: "observer-conclaves", title: "观测者密会", description: "在明确分享边界后，邀请他人协同观察战局。", access: "advanced" },
  { id: "archon-tier", title: "执政官阶层", description: "根据真实推演记录解锁更高阶的复盘与预兆能力。", access: "advanced" },
  { id: "ai-symbiote", title: "AI 共生体", description: "在用户授权范围内积累长期决策记忆。", access: "advanced" },
];

export const SCENARIO_CATALOG_VERSION = 1;

export const SCENARIOS: readonly ScenarioSeed[] = [
  {
    id: "saas-renewal-crisis", version: 1, kind: "battlefield", title: "客户续约危机与生死跑道", subtitle: "SaaS 大客户续约博弈 · 现金跑道极限推演", industry: "企业级 SaaS / IT 服务",
    description: "官方演示战局：收入占比过高的大客户遭遇竞品补贴，团队必须在现金耗尽前改变博弈维度。",
    objective: "在续约决策窗口关闭前，保住核心业务或找到可承受的退出路径。", minimumOutcome: "团队和核心资产不因本次续约危机失去生存能力。", idealOutcome: "将竞争带入安全合规与定制交付的新战场，提升客户价值并恢复现金跑道。", opponentSummary: "竞品 B 以极低价格切入，客户采购与合规流程可能已经重启。", hardDeadlineDays: 14,
    modules, facts: [
      { kind: "fact", content: "核心客户贡献约 42% 的年度收入。", confidence: 86 },
      { kind: "assumption", content: "竞品可能以补贴价格替代现有方案。", confidence: 48 },
      { kind: "goal", content: "保持团队现金跑道并避免无底线价格战。", confidence: 90 },
    ], constraints: [
      { kind: "cash", label: "现金跑道", description: "账面现金仅够支撑有限月份的固定支出。", hard: true, severity: 5 },
      { kind: "time", label: "续约窗口", description: "客户将在约 14 天内完成关键决策。", hard: true, severity: 5 },
      { kind: "relationship", label: "单一客户依赖", description: "收入集中使得错误降价会放大后续风险。", hard: true, severity: 4 },
    ], inventory: [
      { category: "cash", label: "可用现金储备", description: "可立即动用的现金，不含未确认回款。", quantity: 280000, unit: "CNY" },
      { category: "information", label: "定制工作流与数据安全能力", description: "可用于改变客户采购比较维度的产品资产。" },
      { category: "relationship", label: "客户内部业务关系", description: "存在业务联系，但不能假设其能绕过正式采购流程。" },
    ],
  },
  {
    id: "saas-competitor-price-war", version: 1, kind: "case-study", title: "收入占比 42% 的客户遭竞品低价洗劫", subtitle: "真实复盘 · 改变战场还是跟进价格战", industry: "企业级 SaaS / IT 服务",
    description: "匿名案例推演：在客户续约前 15 天面对巨额补贴报价，比较不同路径的生存概率。", objective: "在不透支团队和核心资产的前提下完成客户危机决策。", minimumOutcome: "保住团队与核心产品资产。", idealOutcome: "以联合云厂商和私有化定制重构报价维度。", opponentSummary: "竞品拥有更低成本结构并已进入客户采购视野。", hardDeadlineDays: 15, modules, facts: [{ kind: "fact", content: "案例当事人最终选择改变战场。", confidence: 100 }], constraints: [{ kind: "cash", label: "现金跑道", description: "现金只能覆盖约两个月工资。", hard: true, severity: 5 }, { kind: "time", label: "决策关门点", description: "续约窗口仅剩 15 天。", hard: true, severity: 5 }], inventory: [{ category: "asset", label: "核心定制能力", description: "可转化为私有化交付方案的产品能力。" }], caseStudy: { authorPseudonym: "暗夜行者 · SaaS连续创业者", difficulty: "EXTREME", backgroundSummary: "创业第3年，唯一现金牛大客户在续约前15天收到对手补贴报价，账面现金仅够发2个月工资。", coreDilemma: "跟进降价必死于现金流枯竭；不降价将直接丢单猝死；如何依靠有限底牌完成升维反制？", timeRunway: "现金跑道 58 天 / 决策关门 14 天", financialStatus: "账面可用现金 ¥280,000 / 月固定硬支出 ¥140,000", choices: [{ id:"c-1", name:"跟进价格战 (降价50%保客户)", typeLabel:"妥协防守", description:"大幅下调报价迎战，试图用现有现金流死撑至年底。", communityChoicePercent:24, survivalRate:12, isAuthorActualChoice:false }, { id:"c-2", name:"死守校友私交 (全力攻坚公关)", typeLabel:"侥幸强攻", description:"押注内部高管校友关系，寄希望于人情破局。", communityChoicePercent:18, survivalRate:20, isAuthorActualChoice:false }, { id:"c-3", name:"升维重构 · 联合云巨头切入私有化定制", typeLabel:"改变战场", description:"放弃纯公有云价格对比，将博弈拖入数据安全与驻场定制新维度。", communityChoicePercent:46, survivalRate:68, isAuthorActualChoice:true }, { id:"c-4", name:"闪电并购 · 将团队与核心代码并入竞对死敌", typeLabel:"焦土对冲", description:"开启资本并购通道，以技术资产换取过桥资金与估值溢价退出。", communityChoicePercent:12, survivalRate:85, isAuthorActualChoice:false }], authorActualOutcome:"作者实际选择了【改变战场】，联合头部云厂商在48小时内输出定制私有化方案，不仅守住了客户，单客客单价提升了2.4倍。", keyTakeaway:"在不对称博弈中，永远不要在对手拥有成本优势的战场拼刺刀。", totalSimulations:1420, bountyReward:8 },
  },
  {
    id: "funding-closing-failure", version: 1, kind: "case-study", title: "A 轮交割前夜毁约与研发停摆", subtitle: "绝境突围 · 过桥资本与专利变现", industry: "硬科技 / 具身智能",
    description: "匿名案例推演：已签署 TS 的资方在交割前暂停打款，团队必须在工资日之前重组救命资本。", objective: "在资方失约后维持团队和核心研发的连续性。", minimumOutcome: "避免核心团队无序流失和关键专利失控。", idealOutcome: "拆分非核心专利获得过桥资金并保留下一轮融资选择权。", opponentSummary: "原资方受自身 LP 影响暂停交割，不应被视作可靠救援来源。", hardDeadlineDays: 28, modules, facts: [{ kind: "fact", content: "资方在正式打款前 48 小时暂停交割。", confidence: 100 }, { kind: "assumption", content: "地方产业方可能愿意为非核心专利提供过桥资金。", confidence: 42 }], constraints: [{ kind: "cash", label: "工资硬支出", description: "当前资金不足以覆盖一个月工资。", hard: true, severity: 5 }, { kind: "time", label: "过桥窗口", description: "必须在 28 天内完成资金重组。", hard: true, severity: 5 }, { kind: "legal", label: "专利授权边界", description: "资产变现必须保留核心技术控制权。", hard: true, severity: 4 }], inventory: [{ category: "asset", label: "非核心专利组合", description: "可授权但不应影响核心产品路线的技术资产。" }, { category: "skill", label: "核心研发团队", description: "需要优先保护的组织资产。" }], caseStudy: { authorPseudonym:"矩阵拓荒者 · 具身智能CEO", difficulty:"HIGH", backgroundSummary:"已签署TS并在尽调期扩大团队，资方在正式打款前48小时暂停交割，团队面临立刻断粮。", coreDilemma:"诉诸法律耗时过长必死；大裁员将导致核心专利流失；如何在28天内重组救命过桥资本？", timeRunway:"现金跑道 28 天 / 工资发放日前 10 天", financialStatus:"可用资金 ¥85,000 / 月度工资硬支出 ¥190,000", choices:[{ id:"c-fund-1", name:"全员降薪50% + 创始人抵押房产", typeLabel:"苦肉防御", description:"创始人个人垫资兜底，团队全员降薪等待奇迹。", communityChoicePercent:32, survivalRate:35, isAuthorActualChoice:false }, { id:"c-fund-2", name:"拆分非核心专利技术向地方国资变现", typeLabel:"断臂求生", description:"将次级算法模型授权给地方产业园区换取即刻过桥资金。", communityChoicePercent:53, survivalRate:72, isAuthorActualChoice:true }, { id:"c-fund-3", name:"对原资方发起高调违约诉讼施压", typeLabel:"同归于尽", description:"公开资方恶意毁约证据，通过行业舆论与法务施压索赔。", communityChoicePercent:15, survivalRate:8, isAuthorActualChoice:false }], authorActualOutcome:"作者在12天内完成地方国资专利授权协议，获得过桥支持，后续完成新一轮战略融资。", keyTakeaway:"危急时刻绝不把希望寄托在违约方的良心上，快速将资产证券化或变现是救生圈。", totalSimulations:890, bountyReward:6 },
  },
];

export function getScenario(id: string): ScenarioSeed | undefined { return SCENARIOS.find((scenario) => scenario.id === id); }
