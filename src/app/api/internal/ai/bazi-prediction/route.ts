// Versioned internal AI capability endpoint.
//
// The platform's internal AI gateway (see
// `docs/rfc/2026-10-09-internal-ai-gateway-contract.md`) calls capabilities at
// `/internal/ai/{capability}`; within this Next app that is
// `/api/internal/ai/{capability}`. `bazi-prediction` is the single versioned
// capability endpoint and delegates to the shared handler.
export { POST } from "@/app/api/agent/bazi-personality/route";
