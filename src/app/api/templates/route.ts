import { publicCatalog } from "@/lib/http";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";
import { OFFICIAL_TEMPLATE_CATALOG } from "@/lib/scenarios/marketplace";
import { reportSwallowedError } from "@/lib/internal-log";

/**
 * The template marketplace is a public reference catalog, so a database outage
 * must degrade to the bundled seed rather than surface an unhandled 500. The
 * bundled catalog is what `ensureOfficialCatalogSeeded` publishes, so the
 * fallback is the same content minus any operator edits.
 */
export async function GET() {
  let templates: readonly unknown[] = OFFICIAL_TEMPLATE_CATALOG;
  try {
    templates = (await listOfficialCatalog(OFFICIAL_CATALOG_TYPES.skillTemplate)).map((entry) => entry.payload);
  } catch (error) {
    // Swallow, but never silently: a persistent failure here means the database
    // is down and the marketplace is frozen at the bundled version.
    reportSwallowedError("templates", "目录读取失败，已回退到内置模板目录。", error);
  }
  return publicCatalog({ catalogVersion: catalogVersions.skillTemplates, templates }, 60);
}
