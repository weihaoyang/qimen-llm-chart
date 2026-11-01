// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChartWorkbenchEntry } from "./app-shell-entry";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ platformConfig }: { platformConfig: Record<string, string | undefined> }) => (
    <output data-testid="platform-config">{JSON.stringify(platformConfig)}</output>
  ),
}));

describe("ChartWorkbenchEntry", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("passes the registered OAuth client id into the browser workbench", () => {
    vi.stubEnv("PLATFORM_BASE_URL", "https://platform.singseq.com");
    vi.stubEnv("PLATFORM_PRODUCT_CODE", "qimen");
    vi.stubEnv("PLATFORM_ACCESS_SCOPE", "qimen-core");
    vi.stubEnv("PLATFORM_OAUTH_CLIENT_ID", "registered-qimen-client");

    render(<ChartWorkbenchEntry />);

    expect(JSON.parse(screen.getByTestId("platform-config").textContent ?? "{}")).toEqual({
      baseUrl: "https://platform.singseq.com",
      productCode: "qimen",
      accessScope: "qimen-core",
      clientId: "registered-qimen-client",
    });
  });
});
