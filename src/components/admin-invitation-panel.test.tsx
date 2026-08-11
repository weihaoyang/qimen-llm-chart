// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminInvitationPanel } from "./admin-invitation-panel";
import { createPlatformClient } from "@/lib/platform/client";
import { PlatformHttpError } from "@singularity-sequence/web-sdk";

vi.mock("@/lib/platform/client", () => ({
  createPlatformClient: vi.fn(),
}));

describe("AdminInvitationPanel", () => {
  const client = {
    getAdminSession: vi.fn(),
    listAdminInvitationCodes: vi.fn(),
    createAdminInvitationCode: vi.fn(),
    revokeAdminInvitationCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client.getAdminSession.mockResolvedValue({ authorized: true, role: "owner" });
    client.listAdminInvitationCodes.mockResolvedValue({ items: [], total: 0 });
    client.createAdminInvitationCode.mockResolvedValue({
      invitation: { id: "inv-1", code_hint: "SSAR…DDDD", status: "active" },
      code: "SSAR-AAAA-BBBB-CCCC-DDDD",
      plaintext_shown_once: true,
    });
    vi.mocked(createPlatformClient).mockReturnValue(client as never);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the admin action only after platform admin authorization", async () => {
    render(<AdminInvitationPanel accessToken="token" productCode="shengtian-banzi" planCode="shengtian-banzi-analysis-10" />);
    expect(await screen.findByRole("button", { name: /管理员 · 邀请码/ })).toBeInTheDocument();
    expect(client.getAdminSession).toHaveBeenCalledWith();
    expect(client.listAdminInvitationCodes).toHaveBeenCalledWith(100, 0, "shengtian-banzi", "shengtian-banzi-analysis-10");
  });

  it("does not expose management controls when the platform denies admin access", async () => {
    client.getAdminSession.mockRejectedValue(new PlatformHttpError(403, "admin_access_denied", "当前账户没有管理员权限。"));
    render(<AdminInvitationPanel accessToken="member-token" productCode="shengtian-banzi" planCode="shengtian-banzi-analysis-10" />);
    await waitFor(() => expect(client.getAdminSession).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button", { name: /管理员 · 邀请码/ })).not.toBeInTheDocument());
    expect(client.listAdminInvitationCodes).not.toHaveBeenCalled();
  });

  it("creates a product-scoped code and displays plaintext only in the current view", async () => {
    render(<AdminInvitationPanel accessToken="token" productCode="shengtian-banzi" planCode="shengtian-banzi-analysis-10" />);
    fireEvent.click(await screen.findByRole("button", { name: /管理员 · 邀请码/ }));
    fireEvent.click(screen.getByRole("button", { name: "创建邀请码" }));

    await waitFor(() => expect(client.createAdminInvitationCode).toHaveBeenCalledWith({
      product_code: "shengtian-banzi",
      plan_code: "shengtian-banzi-analysis-10",
      usage_quantity: 10,
      max_redemptions: 1,
      expires_in_days: 30,
    }));
    expect(await screen.findByText("SSAR-AAAA-BBBB-CCCC-DDDD")).toBeInTheDocument();
  });
});
