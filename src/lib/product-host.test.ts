import { describe, expect, it } from "vitest";
import { isPaipanHost } from "@/lib/product-host";

describe("isPaipanHost", () => {
  it("routes only the dedicated paipan hostname to the chart product", () => {
    expect(isPaipanHost("stbz.singseq.com")).toBe(false);
    expect(isPaipanHost("STBZ.SINGSEQ.COM:443")).toBe(false);
    expect(isPaipanHost("paipan.singseq.com")).toBe(true);
    expect(isPaipanHost("PAIPAN.SINGSEQ.COM:443")).toBe(true);
    expect(isPaipanHost("shengtian.singseq.com")).toBe(false);
    expect(isPaipanHost("qmdj.singseq.com")).toBe(true);
    expect(isPaipanHost(undefined)).toBe(false);
  });
});
