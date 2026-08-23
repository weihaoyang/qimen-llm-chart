import { handleAiPost } from "../ai/[kind]/route";
export async function POST(request: Request, context: { params: Promise<{ id:string }> }) { return handleAiPost(request, context, "red-team"); }
