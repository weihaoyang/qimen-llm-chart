import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { catalogVersions, getOfficialCatalogEntry, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET(request: Request) {
  try {
    await requireAccountSubject(request);
    const [events, ticker] = await Promise.all([
      listOfficialCatalog(OFFICIAL_CATALOG_TYPES.worldPulse),
      getOfficialCatalogEntry<unknown[]>(OFFICIAL_CATALOG_TYPES.worldPulseTicker, "default"),
    ]);
    return noStore({ catalogVersion: catalogVersions.worldPulse, events: events.map((entry) => entry.payload), ticker: ticker?.payload ?? [] });
  } catch (error) {
    return errorResponse(error, "读取世界脉冲目录失败。");
  }
}
