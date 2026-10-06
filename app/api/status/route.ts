import { NextResponse } from "next/server";
import { getKnowledge } from "@/lib/knowledge-store";

export const dynamic = "force-dynamic";
export async function GET() {
  const entries = await getKnowledge();
  return NextResponse.json({ status: "ready", model: "pocketslm-1-retrieval", engine: "token retrieval + phrase reranking", trainingExamples: entries.length, endpoints: ["GET /api/chat?q=", "POST /api/chat", "GET /api/train", "POST /api/train"] });
}
