"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowUp, BookOpen, Bot, Braces, Check, ChevronDown,
  CircleHelp, Clipboard, Code2, Database, Gauge, Menu,
  MessageSquareText, Plus, Search, Settings2, Sparkles,
  TerminalSquare, X, Zap,
} from "lucide-react";

type View = "chat" | "train" | "api";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  matchedQuestion?: string | null;
  grounded?: boolean;
};

const quickPrompts = ["What is PocketSLM?", "How do I train the chatbot?", "Can I use it through an API?"];
const getExample = `curl "https://pocketslm-console.kesineni-yugi.chatgpt.site/api/chat?q=What%20is%20PocketSLM%3F"`;
const postExample = `curl -X POST "https://pocketslm-console.kesineni-yugi.chatgpt.site/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"How do I train the chatbot?"}'`;
const trainExample = `curl -X POST "https://pocketslm-console.kesineni-yugi.chatgpt.site/api/train" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-signed-in-session" \\
  -d '{
    "question":"What are your support hours?",
    "answer":"Support is available Monday–Friday, 9am–6pm."
  }'`;

export default function Home() {
  const [view, setView] = useState<View>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [trainingCount, setTrainingCount] = useState(6);
  const [copied, setCopied] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "PocketSLM is online. Ask about the model, training workflow, or API—or add your own knowledge in the Train view.", confidence: 100, grounded: true, matchedQuestion: "System greeting" },
  ]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [trainState, setTrainState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/status").then((response) => response.json() as Promise<{ trainingExamples?: number }>).then((data) => setTrainingCount(data.trainingExamples ?? 6)).catch(() => undefined);
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const lastAssistant = useMemo(() => [...messages].reverse().find((item) => item.role === "assistant"), [messages]);

  async function sendMessage(text = message) {
    const clean = text.trim();
    if (!clean || busy) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: clean }]);
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: clean }) });
      const data = await response.json() as { error?: string; id: string; answer: string; confidence: number; matchedQuestion: string | null; grounded: boolean; trainingExamples?: number };
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setTrainingCount(data.trainingExamples ?? trainingCount);
      setMessages((current) => [...current, { id: data.id, role: "assistant", content: data.answer, confidence: data.confidence, matchedQuestion: data.matchedQuestion, grounded: data.grounded }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : "The model could not answer just now.", grounded: false }]);
    } finally {
      setBusy(false);
    }
  }

  async function train(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || !answer.trim() || trainState === "saving") return;
    setTrainState("saving");
    try {
      const response = await fetch("/api/train", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, answer }) });
      const data = await response.json() as { error?: string; count: number };
      if (!response.ok) throw new Error(data.error ?? "Training failed");
      setTrainingCount(data.count);
      setQuestion("");
      setAnswer("");
      setTrainState("saved");
      window.setTimeout(() => setTrainState("idle"), 2200);
    } catch {
      setTrainState("error");
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const navItems = [
    { id: "chat" as const, label: "Playground", icon: MessageSquareText },
    { id: "train" as const, label: "Train model", icon: Database },
    { id: "api" as const, label: "API access", icon: Braces },
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Bot size={19} strokeWidth={2.2} /></div>
          <div><div className="brand-name">Pocket<span>SLM</span></div><div className="brand-kicker">MODEL CONSOLE</div></div>
          <button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setView(item.id); setMobileNavOpen(false); }} className={view === item.id ? "active" : ""}>
              <item.icon size={17} /><span>{item.label}</span>{item.id === "chat" && <span className="nav-live" />}
            </button>
          ))}
        </nav>
        <div className="model-card">
          <div className="model-card-top"><span className="model-cube"><Sparkles size={15} /></span><span>Active model</span><ChevronDown size={14} /></div>
          <strong>PocketSLM 1.0</strong>
          <div className="model-meta"><span><i /> Ready</span><span>{trainingCount} examples</span></div>
        </div>
        <div className="sidebar-bottom">
          <button><BookOpen size={16} /> Documentation</button><button><CircleHelp size={16} /> Help & feedback</button>
          <div className="profile-row"><div className="avatar">YS</div><div><strong>My workspace</strong><span>Owner access</span></div><Settings2 size={15} /></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span>POCKETSLM</span><b>/</b><strong>{view === "chat" ? "PLAYGROUND" : view === "train" ? "TRAIN MODEL" : "API ACCESS"}</strong></div>
          <div className="top-actions"><span className="status-pill"><i /> API ONLINE</span><button className="search-button"><Search size={15} /><span>Search</span><kbd>⌘ K</kbd></button></div>
        </header>

        {view === "chat" && (
          <div className="content-grid">
            <section className="chat-panel">
              <div className="panel-heading"><div><span className="eyebrow">LIVE INFERENCE</span><h1>Chat playground</h1><p>Test the model against your trained knowledge.</p></div><button className="clear-button" onClick={() => setMessages((items) => items.slice(0, 1))}>Clear chat</button></div>
              <div className="chat-window" ref={scrollerRef}>
                <div className="date-divider"><span>SESSION STARTED</span></div>
                {messages.map((item) => (
                  <article className={`message-row ${item.role}`} key={item.id}>
                    <div className="message-avatar">{item.role === "assistant" ? <Bot size={17} /> : "YS"}</div>
                    <div className="message-content">
                      <div className="message-head"><strong>{item.role === "assistant" ? "PocketSLM" : "You"}</strong><span>just now</span></div>
                      <div className="message-bubble"><p>{item.content}</p></div>
                      {item.role === "assistant" && typeof item.confidence === "number" && <div className="answer-meta"><span className={item.grounded ? "grounded" : "uncertain"}><i /> {item.grounded ? "Grounded answer" : "Needs training"}</span><span><Gauge size={13} /> {item.confidence}% confidence</span></div>}
                    </div>
                  </article>
                ))}
                {busy && <article className="message-row assistant"><div className="message-avatar"><Bot size={17} /></div><div className="message-content"><div className="message-head"><strong>PocketSLM</strong></div><div className="typing"><i /><i /><i /></div></div></article>}
              </div>
              <div className="composer-area">
                <div className="prompt-chips">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>)}</div>
                <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Ask your trained model anything…" rows={2} maxLength={1200} />
                  <div className="composer-footer"><span><TerminalSquare size={14} /> POST /api/chat</span><div><span>{message.length}/1200</span><button disabled={!message.trim() || busy} aria-label="Send message"><ArrowUp size={17} /></button></div></div>
                </form>
              </div>
            </section>
            <aside className="inspector">
              <div className="inspector-header"><span>RUN INSPECTOR</span><Activity size={15} /></div>
              <div className="metric-block"><label>Model</label><strong>PocketSLM 1.0</strong><p>retrieval + phrase reranking</p></div>
              <div className="metric-pair"><div><label>Knowledge</label><strong>{trainingCount}</strong><span>examples</span></div><div><label>State</label><strong className="ready-text">READY</strong><span>healthy</span></div></div>
              <div className="confidence-card"><div><label>Last confidence</label><strong>{lastAssistant?.confidence ?? 0}%</strong></div><div className="confidence-track"><span style={{ width: `${lastAssistant?.confidence ?? 0}%` }} /></div></div>
              <div className="match-block"><label>Matched source</label><p>{lastAssistant?.matchedQuestion ?? "No source match"}</p></div>
              <div className="pipeline-block"><label>INFERENCE PIPELINE</label>{["Tokenize prompt", "Retrieve examples", "Rerank matches", "Return grounded answer"].map((step, index) => <div className="pipeline-step" key={step}><span>{index + 1}</span><p>{step}</p><Check size={14} /></div>)}</div>
            </aside>
          </div>
        )}

        {view === "train" && (
          <div className="single-view">
            <div className="page-intro"><span className="eyebrow">KNOWLEDGE BUILDER</span><h1>Train with examples</h1><p>Add focused question-and-answer pairs. PocketSLM stores them and uses them on the next request.</p></div>
            <div className="train-layout">
              <form className="train-form" onSubmit={train}>
                <div className="form-title"><div className="icon-tile"><Plus size={18} /></div><div><strong>New training example</strong><span>Teach the model one reliable answer</span></div></div>
                <label>Sample question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What are our support hours?" rows={3} maxLength={500} /></label>
                <label>Ideal answer<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write the exact grounded answer the bot should return." rows={7} maxLength={4000} /></label>
                <div className="form-footer"><span>{trainState === "saved" ? "Example added to the model." : trainState === "error" ? "Could not save the example." : "Changes are available immediately."}</span><button disabled={!question.trim() || !answer.trim() || trainState === "saving"}>{trainState === "saving" ? "Adding…" : trainState === "saved" ? <><Check size={16} /> Added</> : <><Zap size={16} /> Add to model</>}</button></div>
              </form>
              <aside className="training-summary"><div className="summary-number"><Database size={18} /><strong>{trainingCount}</strong><span>training examples</span></div><h3>How training works</h3><p>This small model learns by example retrieval, not by changing billions of neural weights.</p><ol><li><b>1</b><span>Your examples are normalized and indexed.</span></li><li><b>2</b><span>Questions are matched by tokens and phrases.</span></li><li><b>3</b><span>The top answer returns with a confidence score.</span></li></ol><button onClick={() => setView("chat")}>Test in playground <ArrowUp size={15} /></button></aside>
            </div>
          </div>
        )}

        {view === "api" && (
          <div className="single-view api-view">
            <div className="page-intro"><span className="eyebrow">DEVELOPER API</span><h1>Connect with GET or POST</h1><p>Use the same trained model from your application. Responses include grounding and confidence metadata.</p></div>
            <div className="private-note"><Check size={14} /><span>This site is private. API requests use your signed-in site session; training writes are owner-protected.</span></div>
            <div className="api-grid">
              <ApiCard method="GET" endpoint="/api/chat?q={question}" description="Ask a question from a URL or quick integration." code={getExample} copyKey="get" copied={copied} onCopy={copy} />
              <ApiCard method="POST" endpoint="/api/chat" description="Send a JSON message for production chat flows." code={postExample} copyKey="post" copied={copied} onCopy={copy} />
              <ApiCard method="POST" endpoint="/api/train" description="Add one or many owner-authenticated question-and-answer examples." code={trainExample} copyKey="train" copied={copied} onCopy={copy} wide />
            </div>
            <div className="response-preview"><div className="response-title"><span><Code2 size={16} /> Example response</span><b>200 OK</b></div><pre>{`{
  "model": "pocketslm-1-retrieval",
  "answer": "PocketSLM is a compact, retrieval-first chatbot...",
  "confidence": 100,
  "matchedQuestion": "What is PocketSLM?",
  "grounded": true,
  "trainingExamples": ${trainingCount}
}`}</pre></div>
          </div>
        )}
      </section>
    </main>
  );
}

function ApiCard({ method, endpoint, description, code, copyKey, copied, onCopy, wide = false }: { method: string; endpoint: string; description: string; code: string; copyKey: string; copied: string | null; onCopy: (text: string, key: string) => void; wide?: boolean }) {
  return <article className={`api-card ${wide ? "wide" : ""}`}><div className="api-card-head"><span className={method === "GET" ? "get" : "post"}>{method}</span><code>{endpoint}</code></div><p>{description}</p><div className="code-block"><div><span>cURL</span><button onClick={() => onCopy(code, copyKey)}>{copied === copyKey ? <Check size={14} /> : <Clipboard size={14} />} {copied === copyKey ? "Copied" : "Copy"}</button></div><pre>{code}</pre></div></article>;
}
