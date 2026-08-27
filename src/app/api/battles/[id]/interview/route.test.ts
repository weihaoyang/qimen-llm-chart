import { describe, expect, it, vi } from "vitest";

const handleAiPost = vi.hoisted(() => vi.fn(async (_request: Request, _context: unknown, kind?: string) => Response.json({ kind })));
vi.mock("../ai/[kind]/route", () => ({ handleAiPost }));

import { POST } from "./route";

describe("battle interview compatibility route", () => {
  it("uses the audited structured interview job pipeline", async () => {
    const response = await POST(new Request("http://local"), { params: Promise.resolve({ id:"battle" }) });
    expect(response.status).toBe(200);
    expect(handleAiPost).toHaveBeenCalledWith(expect.any(Request), expect.anything(), "interview");
    await expect(response.json()).resolves.toEqual({ kind:"interview" });
  });
});
