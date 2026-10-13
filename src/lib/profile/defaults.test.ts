import { describe, expect, it } from "vitest";
import { HYDRATION_SAFE_DATE, HYDRATION_SAFE_TIME_ZONE } from "@/lib/hydration-clock";
import { getDefaultProfileInput } from "./defaults";

/**
 * 默认盘面的时间必须按**传入的时区**落值。
 *
 * 这里刻意只用"与时区无关"的断言：在任何机器上（本地 Asia/Shanghai、CI 常用 UTC、
 * 生产容器 UTC）结果都必须一样。历史上本函数用 `Date#getHours()` 这类进程本地读法，
 * 于是生产 SSR（UTC）渲染 `2000-01-01 12:00`、浏览器（+08）渲染 `20:00`，
 * 触发 React #418 水合不一致。
 */
describe("getDefaultProfileInput 的默认时间", () => {
  const instant = new Date("2000-01-01T12:00:00.000Z");

  it("按传入时区换算，不读进程本地时区", () => {
    expect(getDefaultProfileInput(instant, "Asia/Shanghai").datetime).toBe("2000-01-01T20:00");
    expect(getDefaultProfileInput(instant, "UTC").datetime).toBe("2000-01-01T12:00");
    expect(getDefaultProfileInput(instant, "America/New_York").datetime).toBe("2000-01-01T07:00");
  });

  it("solar 字段与 datetime 取自同一时区", () => {
    const input = getDefaultProfileInput(instant, "Asia/Shanghai");

    expect(input.solar).toMatchObject({ year: 2000, month: 1, day: 1, hour: 20, minute: 0 });
    expect(input.timeZone).toBe("Asia/Shanghai");
  });

  it("水合安全占位与配套时区一起给出确定值", () => {
    const input = getDefaultProfileInput(HYDRATION_SAFE_DATE, HYDRATION_SAFE_TIME_ZONE);

    expect(input.datetime).toBe("2000-01-01T20:00");
    expect(input.timeZone).toBe(HYDRATION_SAFE_TIME_ZONE);
  });
});
