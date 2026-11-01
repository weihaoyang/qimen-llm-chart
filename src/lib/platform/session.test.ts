// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { isPlatformRefreshExpired, loadPlatformSession, savePlatformSession } from "./session";
import type { PlatformSession } from "./types";

afterEach(() => localStorage.clear());
it("restores native OAuth identity without an unpublished refresh expiry", () => {
  const session = { access_token: "secret-access", refresh_token: "secret-refresh", csrf_token: "", expires_at_iso: new Date(Date.now() + 3600000).toISOString(), user_id: "subject-1", current_subject_id: "subject-1", current_subject_type: "user", phone_number: "" } as PlatformSession;
  savePlatformSession(session);
  const restored = loadPlatformSession();
  expect(restored?.user_id).toBe("subject-1");
  expect(restored?.access_token).toBe("");
  expect(restored?.refresh_token).toBe("");
  expect(isPlatformRefreshExpired(restored!)).toBe(false);
  expect(isPlatformRefreshExpired({ ...restored!, refresh_expires_at_iso: "2000-01-01T00:00:00Z" })).toBe(true);
});
