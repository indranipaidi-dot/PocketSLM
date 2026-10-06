export type KnowledgeEntry = {
  id: string;
  question: string;
  answer: string;
  createdAt?: Date;
  builtIn?: boolean;
};

export const builtInKnowledge: KnowledgeEntry[] = [
  { id: "seed-1", question: "What is PocketSLM?", answer: "PocketSLM is a compact, retrieval-first chatbot. It compares a question with your training examples, reranks the closest matches, and returns the best grounded answer with a confidence score.", builtIn: true },
  { id: "seed-2", question: "How do I train the chatbot?", answer: "Open the Train view, add a sample question and its ideal answer, then select Add to model. The example becomes available to both the chat interface and the API.", builtIn: true },
  { id: "seed-3", question: "Can I use the chatbot through an API?", answer: "Yes. Send a GET request to /api/chat?q=your%20question or POST JSON to /api/chat with a message field. Both return the answer, confidence, and matched training example.", builtIn: true },
  { id: "seed-4", question: "What does SLM mean?", answer: "SLM means small language model. This demo uses a small, explainable retrieval and reranking pipeline designed for focused knowledge bases and fast responses.", builtIn: true },
  { id: "seed-5", question: "Where is training data stored?", answer: "Training examples are stored in a durable database attached to this site. Built-in starter examples remain available alongside the examples you add.", builtIn: true },
  { id: "seed-6", question: "What happens when the model is unsure?", answer: "When confidence is low, PocketSLM says it does not have a strong match and suggests adding a training example instead of inventing an answer.", builtIn: true },
];

const stopWords = new Set(["a", "an", "and", "are", "can", "do", "does", "for", "how", "i", "in", "is", "it", "of", "on", "the", "to", "what", "where", "with"]);

function stem(token: string) {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenize(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).filter((token) => !stopWords.has(token)).map(stem);
}

function bigrams(tokens: string[]) {
  return tokens.slice(0, -1).map((token, index) => `${token}:${tokens[index + 1]}`);
}

function overlapScore(query: string[], candidate: string[]) {
  const querySet = new Set(query);
  const candidateSet = new Set(candidate);
  let overlap = 0;
  for (const token of querySet) if (candidateSet.has(token)) overlap += 1;
  return overlap / Math.sqrt(Math.max(1, querySet.size * candidateSet.size));
}

export function answerQuestion(message: string, entries: KnowledgeEntry[]) {
  const queryTokens = tokenize(message);
  const queryBigrams = bigrams(queryTokens);
  const ranked = entries.map((entry) => {
    const candidateTokens = tokenize(entry.question);
    const tokenScore = overlapScore(queryTokens, candidateTokens);
    const phraseScore = overlapScore(queryBigrams, bigrams(candidateTokens));
    const exactBoost = message.trim().toLowerCase() === entry.question.trim().toLowerCase() ? 0.2 : 0;
    return { entry, score: Math.min(1, tokenScore * 0.78 + phraseScore * 0.22 + exactBoost) };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const confidence = best ? Math.round(best.score * 100) : 0;
  if (!best || best.score < 0.18 || queryTokens.length === 0) {
    return { answer: "I don’t have a strong answer for that yet. Add a matching question and answer in the Train view, then try again.", confidence, matchedQuestion: best?.entry.question ?? null, grounded: false };
  }
  return { answer: best.entry.answer, confidence, matchedQuestion: best.entry.question, grounded: true };
}
