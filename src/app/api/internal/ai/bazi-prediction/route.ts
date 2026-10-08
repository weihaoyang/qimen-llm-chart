// Versioned internal AI capability endpoint.
//
// The platform's internal AI gateway (see
// `docs/rfc/2026-10-09-internal-ai-gateway-contract.md`) calls capabilities at
// `/internal/ai/{capability}`; within this Next app that is
// `/api/internal/ai/{capability}`. `bazi-prediction` is the versioned form of the
// existing `bazi-personality` endpoint: it delegates to the same handler, which
// accepts both the versioned `X-SS-*` signature and the legacy `x-ss-bazi-*`
// signature. Keeping one implementation avoids a second copy of the pipeline.
export { POST } from "@/app/api/agent/bazi-personality/route";
