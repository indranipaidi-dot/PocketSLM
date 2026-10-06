import { NextRequest, NextResponse } from "next/server";
import { getKnowledge } from "@/lib/knowledge-store";
import { answerQuestion } from "@/lib/pocket-model";

export const dynamic = "force-dynamic";

async function respond(message: string) {
  const cleanMessage = message.trim();
  if (!cleanMessage) return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  if (cleanMessage.length > 1200) return NextResponse.json({ error: "Message must be 1,200 characters or fewer." }, { status: 400 });
  const entries = await getKnowledge();
  return NextResponse.json({ id: crypto.randomUUID(), model: "pocketslm-1-retrieval", message: cleanMessage, ...answerQuestion(cleanMessage, entries), trainingExamples: entries.length });
}

export async function GET(request: NextRequest) { return respond(request.nextUrl.searchParams.get("q") ?? ""); }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: unknown };
    return respond(typeof body.message === "string" ? body.message : "");
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
}
