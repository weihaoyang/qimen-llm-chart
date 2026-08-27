// Compatibility surface for clients that use the explicit interview route.
// Keep it on the same audited AI-job pipeline as /ai/interview so every caller
// receives the structured contract and identical gate/retry semantics.
import { handleAiPost } from "../ai/[kind]/route";

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  return handleAiPost(request, context, "interview");
}
