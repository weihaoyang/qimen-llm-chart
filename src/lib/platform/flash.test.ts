// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  popPlatformFlashMessage,
  savePlatformFlashMessage,
} from "./flash";

describe("platform flash helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores and pops one flash message", () => {
    savePlatformFlashMessage({
      type: "success",
      text: "支付结果已恢复。",
    });

    expect(popPlatformFlashMessage()).toEqual({
      type: "success",
      text: "支付结果已恢复。",
    });
    expect(popPlatformFlashMessage()).toBeNull();
  });

  it("returns null for malformed stored payload", () => {
    window.sessionStorage.setItem("qmdj.platform.flash.v1", "{bad json");

    expect(popPlatformFlashMessage()).toBeNull();
  });
});
