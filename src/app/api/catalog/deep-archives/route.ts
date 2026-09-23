import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { listUnlockedArchiveIds } from "@/lib/battle/extended-repository";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

type DeepArchivePayload = {
  isUnlocked?: boolean;
  finalRippleSequence?: unknown;
  [key: string]: unknown;
};

/**
 * `finalRippleSequence` is the paid deliverable of an archive — the UI charges
 * `deep_archive_unlock` equity before revealing it. The catalog must therefore
 * never hand it to a caller who has not unlocked that archive, otherwise the
 * paywall is decorative and the content is free to anyone who reads the JSON.
 */
const withheldUnlessUnlocked = (payload: DeepArchivePayload, unlocked: Set<string>, entryId: string) => {
  if (payload.isUnlocked || unlocked.has(entryId)) return payload;
  const rest: DeepArchivePayload = { ...payload };
  delete rest.finalRippleSequence;
  return rest;
};

export async function GET(request: Request) {
  try {
    const subject = await requireAccountSubject(request);
    const [archives, unlocked] = await Promise.all([
      listOfficialCatalog<DeepArchivePayload>(OFFICIAL_CATALOG_TYPES.deepArchive),
      listUnlockedArchiveIds(subject),
    ]);
    return noStore({
      catalogVersion: catalogVersions.deepArchives,
      archives: archives.map((entry) => withheldUnlessUnlocked(entry.payload, unlocked, entry.id)),
    });
  } catch (error) {
    return errorResponse(error, "读取深网档案目录失败。");
  }
}
