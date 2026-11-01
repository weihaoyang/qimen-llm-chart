import { fetchPlatformAccount, readBearerToken, readCookieValue } from "@/lib/platform/server";

export class AccountSubjectError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AccountSubject = { subjectType: string; subjectId: string };

export const requireAccountSubject = async (request: Request): Promise<AccountSubject> => {
  const accessToken = readBearerToken(request.headers.get("authorization"))
    ?? readCookieValue(request.headers.get("cookie"), "qmdj_platform_access");
  if (!accessToken) throw new AccountSubjectError(401, "请先登录平台账户。");

  const account = await fetchPlatformAccount(accessToken);
  if (!account.subject_id) throw new AccountSubjectError(401, "平台账户身份无效，请重新登录。");
  return { subjectType: "user", subjectId: account.subject_id };
};
