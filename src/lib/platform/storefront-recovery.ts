const STOREFRONT_KEY = "qmdj.pending-storefront-checkout.v1";

export type StorefrontCheckoutRecovery = {
  orderId: string;
  productCode: string;
  checkoutMode: "account" | "guest";
  /** Guest checkout tokens are scoped credentials and must stay in sessionStorage. */
  checkoutToken: string;
  planCode: string;
  createdAt: number;
};

const storageFor = (mode: StorefrontCheckoutRecovery["checkoutMode"]) => {
  if (typeof window === "undefined") return null;
  return mode === "guest" ? window.sessionStorage : window.localStorage;
};

const write = (value: StorefrontCheckoutRecovery) => {
  try {
    storageFor(value.checkoutMode)?.setItem(STOREFRONT_KEY, JSON.stringify(value));
  } catch {
    // A guest token has no safe durable fallback. Account recovery can fall back
    // to the current tab when localStorage is unavailable.
    if (value.checkoutMode === "account") {
      try { window.sessionStorage.setItem(STOREFRONT_KEY, JSON.stringify(value)); } catch { /* best effort */ }
    }
  }
};

const read = (mode: StorefrontCheckoutRecovery["checkoutMode"]) => {
  try {
    const raw = storageFor(mode)?.getItem(STOREFRONT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StorefrontCheckoutRecovery>;
    if (
      typeof value.orderId !== "string" || !value.orderId ||
      typeof value.productCode !== "string" || !value.productCode ||
      (value.checkoutMode !== "account" && value.checkoutMode !== "guest") ||
      typeof value.checkoutToken !== "string" ||
      typeof value.planCode !== "string" || !value.planCode ||
      typeof value.createdAt !== "number"
    ) return null;
    return value as StorefrontCheckoutRecovery;
  } catch {
    return null;
  }
};

export const saveStorefrontCheckout = (value: Omit<StorefrontCheckoutRecovery, "createdAt"> & { createdAt?: number }) =>
  write({ ...value, createdAt: value.createdAt ?? Date.now() });

export const loadStorefrontCheckout = () => read("guest") ?? read("account");

export const clearStorefrontCheckout = () => {
  try { window.sessionStorage.removeItem(STOREFRONT_KEY); } catch { /* best effort */ }
  try { window.localStorage.removeItem(STOREFRONT_KEY); } catch { /* best effort */ }
};
