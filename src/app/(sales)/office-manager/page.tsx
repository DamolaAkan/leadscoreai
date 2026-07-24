"use client";

import { useState, useRef, useEffect } from "react";
import { authHeaders } from "@/lib/sl-client";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Give me 5 scorecard title ideas for a gym.",
  "What questions best determine willingness to pay?",
  "Explain WTP and super leads in simple terms.",
  "A prospect says the scorecard is a gimmick. How do I respond?",
];

export default function OfficeManagerPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/office-manager", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not respond");
      setMessages((m) => [...m, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not respond");
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100dvh-96px)] max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">AI Office Manager</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask anything about LeadScoreAI, scorecard titles, WTP, positioning. It answers in text; it never changes anything.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto mt-5 space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="bg-white rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-[#475569] mb-3">Not sure where to start? Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#7C3AED] hover:text-[#1e293b]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "bg-[#7C3AED] text-white rounded-lg rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap"
                  : "bg-white text-[#1e293b] rounded-lg rounded-bl-sm px-4 py-3 max-w-[90%] text-sm leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask the Office Manager..."
          className="flex-1 border border-[#cbd5e1] rounded-md px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 max-h-40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="text-sm font-medium px-5 py-2.5 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50 shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}
