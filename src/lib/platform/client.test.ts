import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProductPlatformClient } from "./client";

describe("platform client surfaces", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_BASE_URL", "https://platform.example.com");
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PRODUCT_CODE", "shengtian-banzi");
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE", "shengtian-banzi-core");
  });

  it("keeps admin methods off the product client", () => {
    const product = createProductPlatformClient();
    expect("getAdminSession" in product).toBe(false);
    expect("createAdminInvitationCode" in product).toBe(false);
  });
});
