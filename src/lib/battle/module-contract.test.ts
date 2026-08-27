import { describe,expect,it } from "vitest";
import { validateBattleModuleState } from "./module-contract";

describe("battle module state contract", () => {
  it("prevents clients from minting platform rewards", () => {
    expect(validateBattleModuleState("reality-echoes",{ items:[{ finalRewardUnlocked:true }] })).toContain("统一平台");
  });

  it("requires every event to be resolved before reward claim", () => {
    expect(validateBattleModuleState("reality-echoes",{ items:[{ rewardClaimStatus:"pending_platform",equilibriumStatus:"EQUILIBRIUM_REACHED",causalDustEvents:[{ status:"PENDING" }] }] })).toContain("全部因果尘埃");
    expect(validateBattleModuleState("reality-echoes",{ items:[{ rewardClaimStatus:"pending_platform",equilibriumStatus:"EQUILIBRIUM_REACHED",causalDustEvents:[{ status:"RESOLVED" }] }] })).toBeNull();
  });

  it("bounds all module snapshots", () => {
    expect(validateBattleModuleState("world-pulse",{ value:"x".repeat(513_000) })).toContain("过大");
  });
});
