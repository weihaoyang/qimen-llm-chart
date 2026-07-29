import { describe, expect, it } from "vitest";
import { parsePlatformCallbackFragment, toPlatformSession } from "./browser";

describe("platform browser helpers", () => {
  it("parses the social login callback hash fragment", () => {
    const result = parsePlatformCallbackFragment(
      "#access_token=access-1&refresh_token=refresh-1&expires_at=2026-07-07T00%3A00%3A00.000Z&refresh_expires_at=2026-08-07T00%3A00%3A00.000Z&user_id=user-1&phone_number=13900139000",
    );

    expect(result).toEqual({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_at_iso: "2026-07-07T00:00:00.000Z",
      refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
      user_id: "user-1",
      phone_number: "13900139000",
    });
  });

  it("returns null when the callback fragment is incomplete", () => {
    expect(parsePlatformCallbackFragment("#access_token=only-token")).toBeNull();
  });

  it("converts callback payload into a platform session", () => {
    expect(
      toPlatformSession({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_at_iso: "2026-07-07T00:00:00.000Z",
        refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
        user_id: "user-1",
        phone_number: "13900139000",
      }),
    ).toEqual({
      access_token: "access-1",
      refresh_token: "refresh-1",
      csrf_token: "",
      expires_at_iso: "2026-07-07T00:00:00.000Z",
      refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
      user_id: "user-1",
      phone_number: "13900139000",
      current_subject_type: "user",
      current_subject_id: "user-1",
    });
  });
});
