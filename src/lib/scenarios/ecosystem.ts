import type { DeepArchiveItem, WorldPulseEvent } from "@/shengtian-reference/types";

export type CatalogPulseEvent = WorldPulseEvent & {
  sectors: string[];
  complexity: number;
  volatility: number;
  intelLogs: string[];
};

export const WORLD_PULSE_CATALOG_VERSION = 1;
export const WORLD_PULSE_TICKER = [
  "MACRO: US Treasury yield curve steepening signals potential shift in tech valuation multiples...",
  "COMPLIANCE: EU Parliament drafts new AI liability framework, severely impacting downstream application margins.",
  "SUPPLY CHAIN: Red Sea shipping disruptions causing 15% freight cost spike and inventory cycle delays.",
  "MARKET: Sovereign wealth funds shifting allocation towards real assets, causing liquidity tightening in venture markets.",
  "SECURITY: Enterprise SaaS vendor suffers zero-day exploit, triggering supply chain audit wave across Fortune 500.",
  "SYSTEM: Macro Intelligence Terminal operating at nominal capacity.",
];

export const WORLD_PULSE_CATALOG: CatalogPulseEvent[] = [
  {
    id: "evt-tokyo-ai", code: "MACRO-26A", title: "亚洲核心算力供应链断裂 (宏观推演案例)", region: "亚洲 · 供应链核心区", lat: 35.67, lng: 139.65,
    riddleDescription: "核心算力基建受地缘政策及突发限电双重打击，供应链停滞。作为高度依赖算力的企业，客户面临合规约束与运力宕机的双重绞杀。请评估物理阻断对贵公司现金流的传导链条。",
    severity: "TECH_COLLAPSE", equityCostToIntervene: 50, activeObservers: 342, status: "ACTIVE", expiresInMins: 48,
    sectors: ["AI算力", "半导体供应链", "数据基建"], complexity: 85, volatility: 92,
    intelLogs: ["[04:12] 主要代工厂宣布不可抗力停工", "[04:15] 二级市场相关期权隐含波动率飙升", "[04:18] 跨国云厂商开始限制新开算力实例"],
  },
  {
    id: "evt-london-fund", code: "MACRO-26B", title: "离岸美元债违约与流动性挤兑 (实战推演案例)", region: "欧洲 · 离岸金融中心", lat: 51.5, lng: -0.12,
    riddleDescription: "宏观黑天鹅导致离岸核心做市商暂停报价，百亿级杠杆资金抽离。企业客户面临信贷收紧与汇率剧烈波动的双杀。此案旨在演练极端流动性枯竭下的现金池保卫战。",
    severity: "FINANCIAL_SINGULARITY", equityCostToIntervene: 80, activeObservers: 589, status: "ACTIVE", expiresInMins: 15,
    sectors: ["跨境资本", "企业信贷", "汇兑对冲"], complexity: 94, volatility: 98,
    intelLogs: ["[11:42] 核心做市商宣布暂停双边报价", "[11:43] 离岸流动性池出现断崖式抽水", "[11:44] 监管机构紧急召开闭门会议"],
  },
  {
    id: "evt-sf-biotech", code: "MACRO-26C", title: "核心知识产权遭遇跨国诉讼狙击 (防御推演案例)", region: "北美 · 创新科技枢纽", lat: 37.77, lng: -122.41,
    riddleDescription: "在关键IPO/融资听证会前夕，竞对通过恶意交叉诉讼冻结核心专利资产，企图用高昂诉讼成本耗死目标企业现金流。此案用于推演非对称反击与合规破局。",
    severity: "GLOBAL_CRITICAL", equityCostToIntervene: 50, activeObservers: 215, status: "ACTIVE", expiresInMins: 112,
    sectors: ["生物医药", "知识产权", "风险投资"], complexity: 76, volatility: 64,
    intelLogs: ["[14:00] 竞品公司向法院申请预先禁令", "[14:05] 核心研发人员收到匿名猎头邀约", "[14:15] 董事局提议启动毒丸计划"],
  },
];

export const DEEP_ARCHIVES_CATALOG_VERSION = 1;
export const DEEP_ARCHIVES_CATALOG: DeepArchiveItem[] = [
  {
    id: "arch-ltcm-1998", codeName: "ARCH-1998-LTCM", historicEventTitle: "1998 长期资本管理公司 (LTCM) 黑天鹅破局", year: "1998", location: "美国 · 格林威治",
    summary: "诺奖得主模型遭遇俄罗斯债务违约黑天鹅，46亿美元杠杆资产面临挤兑。美联储牵头14家华尔街巨头联合注资36.25亿美元，完成史上经典非对称过桥纾困。",
    keyDilemma: "百亿衍生品持仓在无买盘情况下被迫清算，引发全球金融体系连锁雪崩。",
    finalRippleSequence: ["第一步：封存单边利差套利敞口，剥离非核心对冲持仓", "第二步：向纽约联储展示系统性传染因果图，倒逼银行业财团介入", "第三步：以90%股权让渡换取无追索权过桥资金，保全核心资产信用"],
    historicalSigilName: "【永恒的阿基米德】", historicalAlphaRate: 0.9245, isUnlocked: true, unlockCostEquity: 0,
  },
  {
    id: "arch-lehman-2008", codeName: "ARCH-2008-LEHMAN", historicEventTitle: "2008 雷曼兄弟清算夜：巴克莱资产火种抢救", year: "2008", location: "美国 · 纽约曼哈顿",
    summary: "在失去最后贷款人支持的绝境72小时内，将优质投行与交易业务与有毒次贷资产彻底物理隔离，由巴克莱以17.5亿美元极速收购，保全逾万名员工火种。",
    keyDilemma: "母公司现金仅剩数小时耗尽，常规破产将导致全球清算链条全盘冻结。",
    finalRippleSequence: ["第一步：实施「焦土切割」，将核心交易牌照与有毒资产实体剥离", "第二步：在破产法第11条框架下极速完成资产包过桥转让协议", "第三步：锁定关键骨干团队留任奖金，维持北美交易柜台不间断运转"],
    historicalSigilName: "【深潜的利维坦】", historicalAlphaRate: 0.785, isUnlocked: false, unlockCostEquity: 100,
  },
  {
    id: "arch-tylenol-1982", codeName: "ARCH-1982-TYLENOL", historicEventTitle: "1982 强生泰诺投毒事件：第一性伦理奇点突围", year: "1982", location: "美国 · 芝加哥",
    summary: "遭遇恶意投毒危机后，强生管理层顶住1亿美元直接损失，在全国范围内无条件召回3100万瓶药品，并率先发明三层防篡改包装，次年市占率奇迹回升至30%。",
    keyDilemma: "品牌面临毁灭性公信力崩塌，传统公关辩解只会加速死亡。",
    finalRippleSequence: ["第一步：启动第一性伦理原则，无条件全美召回并悬赏缉凶", "第二步：率先研发并公开三层防篡改安全包装工业标准", "第三步：全面重构消费者信任协议，以诚挚透明重夺市场第一"],
    historicalSigilName: "【孤峰的守望者】", historicalAlphaRate: 0.889, isUnlocked: false, unlockCostEquity: 80,
  },
];
