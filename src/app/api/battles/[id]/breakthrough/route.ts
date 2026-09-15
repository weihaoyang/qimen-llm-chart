import { handleAiPost } from "../ai/[kind]/handler";
export async function POST(request: Request, context: { params: Promise<{ id:string }> }) { return handleAiPost(request, context, "breakthrough"); }
