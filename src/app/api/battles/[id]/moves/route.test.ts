import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveMoveSet: vi.fn(),
  listMoves: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType: "user", subjectId: "u1" })),
}));
vi.mock("@/lib/battle/repository", () => ({
  saveMoveSet: mocks.saveMoveSet,
  listMoves: mocks.listMoves,
  deleteDraftMove: vi.fn(),
}));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const junctionId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ id: battleId }) };
const post = (moves: unknown[]) => POST(
  new Request(`http://local/api/battles/${battleId}/moves`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ junctionId, moves }),
  }),
  context,
);

describe("moves route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveMoveSet.mockResolvedValue([]);
  });

  it("accepts one strategy per type", async () => {
    const response = await post([
      { kind: "strong_attack", title: "强攻" },
      { kind: "probe", title: "试局" },
      { kind: "hedge", title: "对冲" },
    ]);

    expect(response.status).toBe(201);
    expect(mocks.saveMoveSet).toHaveBeenCalledOnce();
  });

  // `battle_moves` is UNIQUE(battle_id, version, kind) and a request writes one
  // version, so a fourth strategy cannot be stored however it is typed. It used
  // to reach the unique index and come back as an opaque 500.
  it("rejects more strategies than there are types", async () => {
    const response = await post([
      { kind: "strong_attack", title: "一" },
      { kind: "probe", title: "二" },
      { kind: "hedge", title: "三" },
      { kind: "probe", title: "四" },
    ]);

    expect(response.status).toBe(400);
    expect(mocks.saveMoveSet).not.toHaveBeenCalled();
  });

  // An unrecognised or missing `kind` becomes "probe", so three bare strategies
  // collide on the unique index even though there are only three of them.
  it("rejects a set that collapses onto one type", async () => {
    const response = await post([{ title: "一" }, { title: "二" }, { title: "三" }]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "同一批策略不能重复类型。" });
    expect(mocks.saveMoveSet).not.toHaveBeenCalled();
  });
});
