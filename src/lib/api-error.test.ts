import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSubjectError } from "@/lib/agent/account-subject";
import { errorResponse, internalErrorReason, UserFacingError } from "@/lib/api-error";

const read = async (response: Response) => ({ status: response.status, body: await response.json() });

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // The unmapped branch reports on purpose. These tests assert on that report
  // rather than letting it spill into the runner's output.
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("errorResponse", () => {
  it("forwards an account error with its own status", async () => {
    expect(await read(errorResponse(new AccountSubjectError(401, "请先登录。"), "读取失败。"))).toEqual({
      status: 401,
      body: { error: "请先登录。" },
    });
  });

  it("forwards a user-facing message with the caller's fallback status", async () => {
    expect(await read(errorResponse(new UserFacingError("天时记录写入冲突，请重试。"), "生成失败。", 502))).toEqual({
      status: 502,
      body: { error: "天时记录写入冲突，请重试。" },
    });
  });

  // A request-shape failure is the same status from every route, so the error
  // itself asserts it. Without this the route's 500 fallback would win and the
  // three routes that hit it had to re-derive the mapping by hand.
  it("lets a user-facing error override the caller's fallback status", async () => {
    expect(await read(errorResponse(new UserFacingError("机会标识不属于当前战局。", { status: 400 }), "保存失败。"))).toEqual({
      status: 400,
      body: { error: "机会标识不属于当前战局。" },
    });
  });

  it("forwards a user-facing error's reason code when it has one", async () => {
    const error = new UserFacingError("底牌不属于当前战局。", { status: 409, reasonCode: "inventory_scope_mismatch" });

    expect(await read(errorResponse(error, "保存底牌失败。"))).toEqual({
      status: 409,
      body: { error: "底牌不属于当前战局。", reasonCode: "inventory_scope_mismatch" },
    });
  });

  // The reason code is optional on purpose: adding an empty one would tell a
  // client "branch on this" while giving it nothing to branch on.
  it("omits the reason code when a user-facing error does not carry one", async () => {
    const { body } = await read(errorResponse(new UserFacingError("无效。", { status: 400 }), "失败。"));

    expect(body).not.toHaveProperty("reasonCode");
  });

  it("forwards a platform failure's explanation and reason code", async () => {
    const platformError = Object.assign(new Error("平台响应超时，请稍后重试。"), {
      status: 504,
      reasonCode: "platform_request_timeout",
    });

    expect(await read(errorResponse(platformError, "AI 分析请求失败。"))).toEqual({
      status: 504,
      body: { error: "平台响应超时，请稍后重试。", reasonCode: "platform_request_timeout" },
    });
  });

  it("defaults a platform reason code so clients always get one", async () => {
    const platformError = Object.assign(new Error("平台 gate 请求失败。"), { status: 502 });

    expect(await read(errorResponse(platformError, "读取平台权益失败。"))).toEqual({
      status: 502,
      body: { error: "平台 gate 请求失败。", reasonCode: "platform_request_failed" },
    });
  });

  it("collapses a database failure to the fallback", async () => {
    const dbError = new Error('relation "battle_reviews" does not exist (SQLSTATE 42P01)');

    expect(await read(errorResponse(dbError, "保存复盘失败。"))).toEqual({
      status: 500,
      body: { error: "保存复盘失败。" },
    });
  });

  it("collapses a non-Error throw to the fallback", async () => {
    expect(await read(errorResponse("boom", "保存失败。", 400))).toEqual({
      status: 400,
      body: { error: "保存失败。" },
    });
  });

  it("never sets a cacheable response", async () => {
    const response = errorResponse(new Error("x"), "保存失败。");

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the raw reason available for audit rows", () => {
    expect(internalErrorReason(new Error("SQLSTATE 23505"), "失败。")).toBe("SQLSTATE 23505");
    expect(internalErrorReason(null, "失败。")).toBe("失败。");
  });

  it("reports an unmapped internal failure, which is otherwise unobservable", () => {
    // This branch hides the cause from the caller on purpose, so the report is
    // the only surviving record of it. The original error is passed through
    // intact rather than stringified, to keep the stack.
    const dbError = new Error("connection terminated unexpectedly");

    errorResponse(dbError, "保存复盘失败。");

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[api]"), dbError);
  });

  it("stays quiet for the branches that already explain themselves", () => {
    // These three carry a deliberate message and a deliberate status, so nothing
    // is hidden and there is nothing to escalate.
    errorResponse(new AccountSubjectError(401, "请先登录。"), "读取失败。");
    errorResponse(new UserFacingError("天时记录写入冲突，请重试。"), "生成失败。", 502);
    errorResponse(
      Object.assign(new Error("平台响应超时，请稍后重试。"), { status: 504, reasonCode: "platform_request_timeout" }),
      "AI 分析请求失败。",
    );

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
