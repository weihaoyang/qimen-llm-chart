import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET(request: Request) {
  try {
    await requireAccountSubject(request);
    const personas = await listOfficialCatalog(OFFICIAL_CATALOG_TYPES.persona);
    return noStore({ catalogVersion: catalogVersions.personas, personas: personas.map((entry) => entry.payload) });
  } catch (error) {
    return errorResponse(error, "读取顾问人格目录失败。");
  }
}
