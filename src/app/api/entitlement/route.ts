import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { fetchPlatformUsage, readBearerToken, readCookieValue, readPlatformCookieHeader, AGENT_PLAN_CODE } from "@/lib/platform/server";

export async function GET(request: Request) {
  try {
    await requireAccountSubject(request);
    const accessToken = readBearerToken(request.headers.get("authorization"));
    const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const usage = accessToken
      ? await fetchPlatformUsage(accessToken, { planCode: AGENT_PLAN_CODE })
      : await fetchPlatformUsage(null, { planCode: AGENT_PLAN_CODE, cookieHeader, csrfToken });
    return NextResponse.json({ usage });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: error instanceof Error ? error.message : "读取平台权益失败。" }, { status: 502 });
  }
}
