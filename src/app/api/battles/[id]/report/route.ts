import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { getActiveCommitment, getBattle, getExecutionPlan, getLatestGravityLine, listBattleConstraints, listBattleFacts, listInventory, listJunctions, listMoves } from "@/lib/battle/repository";
import { listAdvice, listAttachments, listOpportunities, listReviews, listTimeline } from "@/lib/battle/extended-repository";

type Context={params:Promise<{id:string}>};

export async function GET(request:Request,context:Context){
  try{
    const id=(await context.params).id;
    if(!isUuid(id))return NextResponse.json({error:"战局标识无效。"},{status:400});
    const subject=await requireAccountSubject(request);
    const battle=await getBattle(subject,id);
    if(!battle)return NextResponse.json({error:"战局不存在。"},{status:404});
    const [facts,constraints,inventory,gravity,junctions,moves,commitment,timeline,opportunities,reviews,advice,attachments]=await Promise.all([
      listBattleFacts(subject,id),listBattleConstraints(subject,id),listInventory(subject,id),getLatestGravityLine(subject,id),listJunctions(subject,id),listMoves(subject,id),getActiveCommitment(subject,id),listTimeline(subject,id),listOpportunities(subject,id),listReviews(subject,id),listAdvice(subject,id),listAttachments(subject,id),
    ]);
    const execution=await Promise.all((moves??[]).map(async(move)=>({moveId:move.id,plan:await getExecutionPlan(subject,id,move.id)})));
    const report={exportedAt:new Date().toISOString(),battle,facts,constraints,inventory,gravity,junctions,moves,commitment,execution,timeline,opportunities,reviews,advice,attachments};
    if(new URL(request.url).searchParams.get("format")==="markdown"){
      const json = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
      const text=[
        `# ${battle.title}`,
        `\n> 天是现实重力，子是你手里仍能落下的那一步。`,
        `\n## 战局\n- 目标：${battle.objective}\n- 最低结果：${battle.minimumOutcome||"未填写"}\n- 理想结果：${battle.idealOutcome||"未填写"}\n- 对手/重力来源：${battle.opponentSummary||"未填写"}\n- 硬期限：${battle.hardDeadline||"未量化"}\n- 状态：${battle.status}`,
        `\n## 现实事实与分层输入\n${(facts??[]).map((x)=>`- [${x.kind}] ${x.content}（来源：${x.source}；置信度：${x.confidence}；发生：${x.occurredAt||"未标注"}；核验：${x.verifiedAt||"未核验"}）`).join("\n")||"- 暂无"}`,
        `\n## 硬约束与底牌\n### 硬约束\n${(constraints??[]).map((x)=>`- [${x.hard?"红线":"软约束"}] ${x.label}（${x.kind}，严重度 ${x.severity}）${x.description?`：${x.description}`:""}`).join("\n")||"- 暂无"}\n### 关键筹码\n${(inventory??[]).map((x)=>`- [${x.category}/${x.availability}] ${x.label}${x.description?`：${x.description}`:""}${x.expiresAt?`（到期 ${x.expiresAt}）`:""}`).join("\n")||"- 暂无"}`,
        `\n## 默认重力线与对手盘\n${gravity?.summary||"尚未生成"}\n\n- 预期基准：${gravity?.expectedOutcome||"未生成"}\n- 失败原因：${gravity?.failureReasons?.join("；")||"未生成"}\n- 证据与扫描：\n\`\`\`json\n${json(gravity?.source)}\n\`\`\``,
        `\n## 现实交叉点\n${(junctions??[]).map((x)=>`- ${x.title}（紧急 ${x.urgency}/5，杠杆 ${x.leverage}/5，不可逆 ${x.irreversibility}/5）\n  - ${x.description}\n  - 核心变量：${x.coreVariable}\n  - 窗口：${x.windowStart||"未定"} → ${x.windowEnd||"未定"}；半衰点：${x.halfLifeAt||"未定"}`).join("\n")||"- 暂无"}`,
        `\n## 三手策略与验证\n${(moves??[]).map((x)=>`### ${x.title}（${x.kind}，${x.state}）\n- 关键变量：${x.keyVariable}\n- 理由：${x.rationale}\n- 成本：${json(x.cost)}\n- 上行：${json(x.upside)}\n- 最坏结果：${json(x.failureCost)}\n- 验证：${json(x.validation)}\n- 止损：${json(x.stop)}\n- 行动：${x.actions.map((a)=>`${a.title}（${a.owner||"执行人待定"}，截止 ${a.dueAt||"未定"}）`).join("；")||"未配置"}`).join("\n")||"- 暂无"}`,
        `\n## 落子与执行\n${commitment?`- 版本：V${commitment.version}\n- 状态：${commitment.status}\n- 策略：${commitment.moveId}\n- 快照：\n\`\`\`json\n${json(commitment.snapshot)}\n\`\`\``:"- 尚未落子"}\n\n### 执行台\n${execution.map((entry)=>`- 策略 ${entry.moveId}\n  - 行动：${entry.plan?.actions.map((action)=>`${action.title} [${action.status}]，实际成本 ${json(action.actualCost)}`).join("；")||"尚未生成"}\n  - 断路器：${entry.plan?.breakers.map((breaker)=>`${breaker.label}${breaker.triggeredAt?`（已触发 ${breaker.triggeredAt}）`:"（未触发）"}`).join("；")||"尚未生成"}`).join("\n")||"- 暂无"}`,
        `\n## 时间—因果图\n### 节点\n${(timeline?.nodes??[]).map((x)=>`- [${x.truthStatus}] ${x.title}（${x.kind}，${x.startsAt||"未定时间"}）${x.description?`：${x.description}`:""}`).join("\n")||"- 暂无"}\n### 连线\n${(timeline?.edges??[]).map((x)=>`- ${x.fromNodeId} —${x.relation}→ ${x.toNodeId}（置信度 ${x.confidence}）`).join("\n")||"- 暂无"}`,
        `\n## 行动窗口\n${(opportunities??[]).map((x)=>`- [${x.status}] ${x.title}：${x.description||"无描述"}\n  - 开放：${x.opensAt||"未定"}；最佳行动：${x.bestActionAt||"未定"}；关闭：${x.closesAt||"未定"}\n  - 衰减：${json(x.decay)}`).join("\n")||"- 暂无"}`,
        `\n## 顾问意见（分层记录）\n${(advice??[]).map((x)=>`- [${x.status}] ${x.opinion}${x.adoptedAs?` · 采纳为 ${x.adoptedAs}（记录 ${x.adoptedRecordId||"未关联"}）`:""}\n  - 依据：${x.rationale||"未填写"}\n  - 不确定性：${x.uncertainty||"未填写"}`).join("\n")||"- 暂无"}`,
        `\n## 证据引用\n${(attachments??[]).map((x)=>`- ${x.filename}：${x.storageKey}（${x.mediaType}，${x.byteSize} bytes${x.checksum?`，校验 ${x.checksum}`:""}）`).join("\n")||"- 暂无"}`,
        `\n## 冷酷复盘与校准\n${(reviews??[]).map((x)=>`- ${x.outcome}\n  - 改变的事实：${x.facts}\n  - 下一调整：${x.nextAdjustment}\n  - 诊断：${json(x.diagnosis)}`).join("\n")||"- 尚未复盘"}`,
      ].join("\n");
      return new NextResponse(text,{headers:{"Content-Type":"text/markdown; charset=utf-8","Content-Disposition":`attachment; filename="battle-${id}.md"`}});
    }
    return NextResponse.json(report);
  }catch(error){return error instanceof AccountSubjectError?NextResponse.json({error:error.message},{status:error.status}):NextResponse.json({error:"导出战局报告失败。"},{status:500});}
}
