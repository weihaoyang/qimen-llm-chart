import { beforeEach,describe,expect,it,vi } from "vitest";

const mocks = vi.hoisted(() => ({
  begin:vi.fn(), finish:vi.fn(), fail:vi.fn(), markCharged:vi.fn(), saveModule:vi.fn(), setReservation:vi.fn(),
  gate:vi.fn(), reserve:vi.fn(), commit:vi.fn(), release:vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({ AccountSubjectError:class extends Error { constructor(public status:number,message:string){ super(message); } },requireAccountSubject:vi.fn(async()=>({ subjectType:"user",subjectId:"u1" })) }));
vi.mock("@/lib/battle/repository", () => ({ getBattle:vi.fn(async()=>({ id:"battle" })) }));
vi.mock("@/lib/battle/extended-repository", () => ({ getArchonProgress:vi.fn() }));
vi.mock("@/lib/battle/product-state", () => ({ beginUsageOperation:mocks.begin,finishUsageOperation:mocks.finish,failUsageOperation:mocks.fail,markUsageOperationCharged:mocks.markCharged,saveModuleState:mocks.saveModule,setUsageOperationReservation:mocks.setReservation,hashSnapshot:vi.fn(()=>"payload-hash") }));
// The real error class is passed through: `commitUsageSettling` distinguishes a
// settled reservation from a transient failure with `instanceof`, so a stub class
// would make the settled branch unreachable and the test below would pass for the
// wrong reason.
vi.mock("@/lib/platform/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/platform/server")>("@/lib/platform/server");
  return { AGENT_PLAN_CODE:"agent",PlatformServerRequestError:actual.PlatformServerRequestError,readBearerToken:vi.fn(()=>"token"),readCookieValue:vi.fn(()=>""),readPlatformCookieHeader:vi.fn(()=>""),fetchPlatformGate:mocks.gate,reservePlatformUsage:mocks.reserve,commitPlatformUsage:mocks.commit,releasePlatformUsage:mocks.release };
});

import { PlatformServerRequestError } from "@/lib/platform/server";
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

  // The same defect as W in the AI handler, reached through a different route: the
  // stored reservation is resumed, the platform answers its one terminal 409
  // because the earlier attempt's commit already landed, and the operation is
  // stuck — charged, with the module state already saved, and unreachable forever
  // because every retry re-commits the same reservation.
  it("completes the operation when the platform reports the reservation already settled", async () => {
    mocks.begin.mockResolvedValue({ operationId:"op-1",status:"pending",usage:null,reservationId:"reservation-1",errorMessage:null,reused:true });
    mocks.commit.mockRejectedValue(new PlatformServerRequestError(409,"usage_reservation_expired","本次分析预留已过期，请重新发起。"));
    const errorSpy = vi.spyOn(console,"error").mockImplementation(()=>{});
    try {
      const response = await POST(request(),context);
      expect(response.status).toBe(200);
      expect(mocks.commit).toHaveBeenCalledOnce();
      expect(mocks.markCharged).toHaveBeenCalledOnce();
      expect(mocks.finish).toHaveBeenCalledOnce();
      // The reservation is settled: it must not be refunded, and the operation must
      // not be marked failed.
      expect(mocks.release).not.toHaveBeenCalled();
      expect(mocks.fail).not.toHaveBeenCalled();
      expect(errorSpy.mock.calls.map((call)=>String(call[0])).some((line)=>line.startsWith("[battle-usage]"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
