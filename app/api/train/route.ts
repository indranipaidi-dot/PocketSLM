import { NextRequest, NextResponse } from "next/server";
import { addKnowledge, getKnowledge } from "@/lib/knowledge-store";

export const dynamic = "force-dynamic";

function isSignedIn(request: NextRequest) {
  return Boolean(request.headers.get("oai-authenticated-user-id"));
}

export async function GET(request: NextRequest) {
  if (!isSignedIn(request)) return NextResponse.json({ error: "Sign in to view training data." }, { status: 401 });
  const entries = await getKnowledge();
  return NextResponse.json({ model: "pocketslm-1-retrieval", count: entries.length, examples: entries.map(({ id, question, answer, builtIn, createdAt }) => ({ id, question, answer, builtIn: Boolean(builtIn), createdAt: createdAt?.toISOString() ?? null })) });
}

export async function POST(request: NextRequest) {
  if (!isSignedIn(request)) return NextResponse.json({ error: "Sign in to add training data." }, { status: 401 });
  try {
    const body = (await request.json()) as { question?: unknown; answer?: unknown; examples?: Array<{ question?: unknown; answer?: unknown }> };
    const incoming = Array.isArray(body.examples) ? body.examples : [{ question: body.question, answer: body.answer }];
    const examples = incoming.filter((example) => typeof example.question === "string" && typeof example.answer === "string").map((example) => ({ question: String(example.question).trim(), answer: String(example.answer).trim() })).filter((example) => example.question && example.answer);
    if (!examples.length || examples.length > 50) return NextResponse.json({ error: "Provide 1–50 examples with non-empty question and answer fields." }, { status: 400 });
    if (examples.some((example) => example.question.length > 500 || example.answer.length > 4000)) return NextResponse.json({ error: "Questions can be up to 500 characters and answers up to 4,000." }, { status: 400 });
    const created = await addKnowledge(examples);
    const entries = await getKnowledge();
    return NextResponse.json({ created: created.length, count: entries.length, examples: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
}
