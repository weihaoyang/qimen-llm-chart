// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearStorefrontCheckout,
  loadStorefrontCheckout,
  saveStorefrontCheckout,
} from "./storefront-recovery";

const base = {
  orderId: "order-1",
  productCode: "shengtian-banzi",
  checkoutMode: "account" as const,
  checkoutToken: "",
  planCode: "plan-1",
  createdAt: Date.now(),
};

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("storefront checkout recovery", () => {
  it("persists account recovery without a credential", () => {
    saveStorefrontCheckout(base);
    expect(loadStorefrontCheckout()).toMatchObject(base);
    expect(window.localStorage.getItem("qmdj.pending-storefront-checkout.v1")).toContain("order-1");
  });

  it("keeps guest tokens in session storage only", () => {
    saveStorefrontCheckout({ ...base, checkoutMode: "guest", checkoutToken: "guest-secret" });
    expect(loadStorefrontCheckout()).toMatchObject({ checkoutMode: "guest", checkoutToken: "guest-secret" });
    expect(window.localStorage.getItem("qmdj.pending-storefront-checkout.v1")).toBeNull();
    expect(window.sessionStorage.getItem("qmdj.pending-storefront-checkout.v1")).toContain("guest-secret");
  });

  it("clears both possible recovery stores", () => {
    saveStorefrontCheckout(base);
    saveStorefrontCheckout({ ...base, checkoutMode: "guest", checkoutToken: "guest-secret" });
    clearStorefrontCheckout();
    expect(loadStorefrontCheckout()).toBeNull();
  });

  it("selects the matching order when an older checkout is still present", () => {
    saveStorefrontCheckout({ ...base, checkoutMode: "guest", checkoutToken: "old-token", orderId: "old-order" });
    saveStorefrontCheckout({ ...base, orderId: "new-order" });
    expect(loadStorefrontCheckout({ orderId: "new-order", productCode: base.productCode })?.orderId).toBe("new-order");
  });
});
