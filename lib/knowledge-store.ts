import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { knowledgeEntries } from "@/db/schema";
import { builtInKnowledge, type KnowledgeEntry } from "@/lib/pocket-model";

export async function getKnowledge(): Promise<KnowledgeEntry[]> {
  const stored = await getDb().select().from(knowledgeEntries).orderBy(desc(knowledgeEntries.createdAt));
  return [...stored.map((entry) => ({ ...entry, builtIn: false })), ...builtInKnowledge];
}

export async function addKnowledge(examples: Array<{ question: string; answer: string }>) {
  const rows = examples.map((example) => ({ id: crypto.randomUUID(), question: example.question.trim(), answer: example.answer.trim(), createdAt: new Date() }));
  if (rows.length) await getDb().insert(knowledgeEntries).values(rows);
  return rows;
}
