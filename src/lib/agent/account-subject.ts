import { fetchPlatformGate, readBearerToken, readCookieValue, readPlatformCookieHeader } from "@/lib/platform/server";

export class AccountSubjectError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AccountSubject = { subjectType: string; subjectId: string };

export const requireAccountSubject = async (request: Request): Promise<AccountSubject> => {
  const accessToken = readBearerToken(request.headers.get("authorization"));
  const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
  const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
  if (!accessToken && !cookieHeader) throw new AccountSubjectError(401, "请先登录平台账户。");

  const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
  if (!gate.subject_id) throw new AccountSubjectError(401, "平台账户身份无效，请重新登录。");
  return { subjectType: gate.subject_type || "user", subjectId: gate.subject_id };
};
