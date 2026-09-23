import { describe, expect, it } from "vitest";
import { noStore, publicCatalog } from "@/lib/http";

describe("noStore", () => {
  it("sets no-store on an account-scoped response", async () => {
    const response = noStore({ inventory: [] });

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ inventory: [] });
  });

  it("keeps the caller's status", () => {
    expect(noStore({ error: "战局不存在。" }, { status: 404 }).status).toBe(404);
  });
});

describe("publicCatalog", () => {
  it("declares the catalog's own staleness bound", async () => {
    const response = publicCatalog({ scenarios: [] }, 300);

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual({ scenarios: [] });
  });

  // The two helpers must not converge by accident: a public catalog that picked up
  // `no-store` would silently stop caching, and an account response that picked up
  // `public` would be replayable to another account.
  it("never produces a response a shared cache could replay across accounts", () => {
    expect(publicCatalog({}, 60).headers.get("Cache-Control")).not.toContain("no-store");
    expect(noStore({}).headers.get("Cache-Control")).not.toContain("public");
  });
});
