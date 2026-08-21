import type { ReferenceEngineProvenance } from "./types";

/**
 * The installed taibu-core version is pinned in package.json. Keeping this
 * manifest explicit makes research exports auditable without bundling the
 * entire package manifest into the client.
 */
export const TAIBU_CORE_REFERENCE: ReferenceEngineProvenance = {
  package: "taibu-core",
  version: "3.5.0",
  license: "MIT",
  source: "https://github.com/hhszzzz/taibu",
  role: "reference_only",
};
