// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductAccountCenter } from "./product-account-center";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function () { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function () { this.open = false; } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const base = { open: true, onClose: vi.fn(), onLogin: vi.fn(), accessToken: "product-token", baseUrl: "https://platform.example.com", productCode: "qimen", productName: "奇门遁甲", subjectId: "subject-one" };
const plan = (product: string) => ({ name: product + "-plan", prettyName: product + "会员", product, productPrettyName: product, billingPeriod: "MONTHLY", kind: "subscription", phases: [{ type: "EVERGREEN", prices: [{ currency: "CNY", value: 10 }], fixedPrices: [], duration: { unit: "UNLIMITED", number: -1 }, usages: [] }], benefits: [{ plan_name: product + "-plan", product_code: product, metric: "analysis_turn", quantity: 20, billing_unit: null }] });

describe("product account center boundaries", () => {
  it("shows only this product and carries its account to checkout", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      return new Response(JSON.stringify(url.includes("usage/balance") ? [
        { id: "own", product_code: "qimen", metric: "analysis_turn", remaining: 7, starts_at: "2026-01-01", ends_at: null },
        { id: "other", product_code: "other", metric: "analysis_turn", remaining: 99, starts_at: "2026-01-01", ends_at: null },
      ] : [plan("qimen"), plan("other")]), { status: 200 });
    }));
    render(<ProductAccountCenter {...base} />);
    await screen.findByText("qimen会员");
    expect(screen.queryByText("other会员")).toBeNull();
    expect(screen.queryByText("99")).toBeNull();
    const link = screen.getByRole("link", { name: /查看与购买/ });
    const url = new URL(link.getAttribute("href")!);
    expect(url.searchParams.get("product")).toBe("qimen");
    expect(url.searchParams.get("subject")).toBe("subject-one");
  });
  it("does not represent a failed balance request as zero entitlement", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      return new Response(JSON.stringify(url.includes("usage/balance") ? { code: "unavailable" } : []), { status: url.includes("usage/balance") ? 503 : 200 });
    }));
    render(<ProductAccountCenter {...base} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("无法读取权益"));
    expect(screen.queryByText(/当前暂无本产品可用权益/)).toBeNull();
  });
});
