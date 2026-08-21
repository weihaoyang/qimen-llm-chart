import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { adoptAdvice, createAdvice, listAdvice, updateAdviceStatus } from "@/lib/battle/extended-repository";
import { ADVICE_ADOPTIONS, ADVICE_STATUSES } from "@/lib/battle/types";

type Context = { params: Promise<{ id:string }> };
const targetTypes = ["battle","fact","junction","move","commitment","review"] as const;

const fail = (error: unknown, fallback: string) => error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:fallback},{status:500});

export async function GET(request:Request, context:Context) {
  try { const id=(await context.params).id; if(!isUuid(id)) return NextResponse.json({error:"战局标识无效。"},{status:400}); const advice=await listAdvice(await requireAccountSubject(request),id); return advice===null?NextResponse.json({error:"战局不存在。"},{status:404}):NextResponse.json({advice}); }
  catch(error){ return fail(error,"读取顾问意见失败。"); }
}

export async function POST(request:Request, context:Context) {
  try {
    const id=(await context.params).id; if(!isUuid(id)) return NextResponse.json({error:"战局标识无效。"},{status:400});
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    const targetType=body?.targetType; const opinion=asText(body?.opinion,12000); const rationale=asText(body?.rationale,12000,false); const uncertainty=asText(body?.uncertainty,6000,false);
    if(typeof targetType!=="string"||!targetTypes.includes(targetType as never)||!opinion||rationale===null||uncertainty===null||((body?.targetId!==undefined&&body?.targetId!==null)&&!isUuid(body.targetId))||(targetType!=="battle"&&!isUuid(body?.targetId))) return NextResponse.json({error:"顾问意见字段无效。"},{status:400});
    const value=await createAdvice(await requireAccountSubject(request),id,{targetType:targetType as never,targetId:(body?.targetId as string|null|undefined)??null,opinion,rationale,uncertainty,source:asRecord(body?.source)??{}});
    return value===null?NextResponse.json({error:"当前账户没有该战局的意见权限。"},{status:403}):NextResponse.json({advice:value},{status:201});
  } catch(error){ return fail(error,"写入顾问意见失败。"); }
}

export async function PATCH(request:Request, context:Context) {
  try {
    const id=(await context.params).id; if(!isUuid(id)) return NextResponse.json({error:"战局标识无效。"},{status:400});
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null; if(!isUuid(body?.adviceId)) return NextResponse.json({error:"意见标识无效。"},{status:400});
    const subject=await requireAccountSubject(request);
    if(body?.action==="adopt") { const adoptedAs=body.adoptedAs; if(typeof adoptedAs!=="string"||!ADVICE_ADOPTIONS.includes(adoptedAs as never)) return NextResponse.json({error:"采纳层级无效。"},{status:400}); const value=await adoptAdvice(subject,id,body.adviceId,adoptedAs as never); return value===null?NextResponse.json({error:"只有战局所有者可采纳意见。"},{status:403}):value===undefined?NextResponse.json({error:"意见不存在或已处理。"},{status:404}):NextResponse.json(value); }
    const status=body?.status; if(typeof status!=="string"||!ADVICE_STATUSES.includes(status as never)||status==="accepted") return NextResponse.json({error:"意见状态无效。"},{status:400}); const value=await updateAdviceStatus(subject,id,body.adviceId,status as never); return value===null?NextResponse.json({error:"意见不存在。"},{status:404}):value===undefined?NextResponse.json({error:"只有意见作者可撤回，或战局所有者可处理意见。"},{status:403}):NextResponse.json({advice:value});
  } catch(error){ return fail(error,"更新顾问意见失败。"); }
}
