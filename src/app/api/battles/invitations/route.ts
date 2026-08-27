import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { listPendingInvitations, respondToInvitation } from "@/lib/battle/extended-repository";

export async function GET(request: Request) {
  try { return NextResponse.json({ invitations: await listPendingInvitations(await requireAccountSubject(request)) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"读取协作邀请失败。" }, { status:500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { invitationId?:unknown; action?:unknown } | null;
    if (!isUuid(body?.invitationId) || (body?.action !== "accept" && body?.action !== "decline")) return NextResponse.json({ error:"邀请响应参数无效。" }, { status:400 });
    const invitation = await respondToInvitation(await requireAccountSubject(request), body.invitationId, body.action);
    return invitation ? NextResponse.json({ invitation }) : NextResponse.json({ error:"邀请不存在、已处理或不属于当前账户。" }, { status:404 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"处理协作邀请失败。" }, { status:500 }); }
}
