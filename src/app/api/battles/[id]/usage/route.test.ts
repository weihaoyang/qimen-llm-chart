import { beforeEach,describe,expect,it,vi } from "vitest";

const mocks = vi.hoisted(() => ({
  begin:vi.fn(), finish:vi.fn(), fail:vi.fn(), markCharged:vi.fn(), saveModule:vi.fn(), setReservation:vi.fn(),
  gate:vi.fn(), reserve:vi.fn(), commit:vi.fn(), release:vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({ AccountSubjectError:class extends Error { constructor(public status:number,message:string){ super(message); } },requireAccountSubject:vi.fn(async()=>({ subjectType:"user",subjectId:"u1" })) }));
vi.mock("@/lib/battle/repository", () => ({ getBattle:vi.fn(async()=>({ id:"battle" })) }));
vi.mock("@/lib/battle/extended-repository", () => ({ getArchonProgress:vi.fn() }));
vi.mock("@/lib/battle/product-state", () => ({ beginUsageOperation:mocks.begin,finishUsageOperation:mocks.finish,failUsageOperation:mocks.fail,markUsageOperationCharged:mocks.markCharged,saveModuleState:mocks.saveModule,setUsageOperationReservation:mocks.setReservation,hashSnapshot:vi.fn(()=>"payload-hash") }));
vi.mock("@/lib/platform/server", () => ({ AGENT_PLAN_CODE:"agent",readBearerToken:vi.fn(()=>"token"),readCookieValue:vi.fn(()=>""),readPlatformCookieHeader:vi.fn(()=>""),fetchPlatformGate:mocks.gate,reservePlatformUsage:mocks.reserve,commitPlatformUsage:mocks.commit,releasePlatformUsage:mocks.release }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const request = () => new Request(`http://local/api/battles/${battleId}/usage`,{ method:"POST",headers:{ "content-type":"application/json" },body:JSON.stringify({ operation:"world_pulse_intervention",idempotencyKey:"world-pulse-operation-key-00000001",moduleUpdate:{ moduleId:"world-pulse",state:{ intervenedEventIds:["event-1"] } } }) });
const context = { params:Promise.resolve({ id:battleId }) };

describe("paid battle module operation recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gate.mockResolvedValue({ allowed:true });
    mocks.reserve.mockResolvedValue({ reservation_id:"reservation-1" });
    mocks.commit.mockResolvedValue({ consumed:1 });
    mocks.setReservation.mockResolvedValue(true);
    mocks.markCharged.mockResolvedValue(true);
    mocks.saveModule.mockResolvedValue({ version:1 });
    mocks.finish.mockResolvedValue(true);
  });

  it("commits usage and module state under one recoverable operation", async () => {
    mocks.begin.mockResolvedValue({ operationId:"op-1",status:"pending",usage:null,reservationId:null,errorMessage:null,reused:false });
    const response = await POST(request(),context);
    expect(response.status).toBe(200);
    expect(mocks.setReservation).toHaveBeenCalledWith(expect.anything(),battleId,"op-1","reservation-1");
    expect(mocks.markCharged).toHaveBeenCalledOnce();
    expect(mocks.saveModule).toHaveBeenCalledOnce();
    expect(mocks.finish).toHaveBeenCalledOnce();
  });

  it("recovers a charged operation without charging again", async () => {
    mocks.begin.mockResolvedValue({ operationId:"op-1",status:"charged",usage:{ consumed:1 },reservationId:"reservation-1",errorMessage:null,reused:true });
    const response = await POST(request(),context);
    expect(response.status).toBe(200);
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.saveModule).toHaveBeenCalledOnce();
  });

  it("keeps an ambiguous commit recoverable and never releases it", async () => {
    mocks.begin.mockResolvedValue({ operationId:"op-1",status:"pending",usage:null,reservationId:"reservation-1",errorMessage:null,reused:true });
    mocks.commit.mockRejectedValue(new Error("network lost after commit"));
    const response = await POST(request(),context);
    expect(response.status).toBe(500);
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.fail).not.toHaveBeenCalled();
  });
});
