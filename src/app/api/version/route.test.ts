import { afterEach, describe, expect, it } from "vitest";

describe("GET /api/version", () => {
  const previousId = process.env.QMDJ_RELEASE_ID;
  const previousCommit = process.env.QMDJ_RELEASE_COMMIT;

  afterEach(() => {
    if (previousId === undefined) delete process.env.QMDJ_RELEASE_ID;
    else process.env.QMDJ_RELEASE_ID = previousId;
    if (previousCommit === undefined) delete process.env.QMDJ_RELEASE_COMMIT;
    else process.env.QMDJ_RELEASE_COMMIT = previousCommit;
  });

  it("returns only public release identifiers", async () => {
    process.env.QMDJ_RELEASE_ID = "20260812-demo";
    process.env.QMDJ_RELEASE_COMMIT = "abc1234";
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      service: "shengtian-banzi",
      releaseId: "20260812-demo",
      commit: "abc1234",
    });
  });
});
