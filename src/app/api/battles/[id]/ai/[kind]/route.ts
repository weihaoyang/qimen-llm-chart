import { handleAiPost } from "./handler";

export async function POST(request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  return handleAiPost(request, context);
}
