"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Org {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  primary_color: string | null;
  self_serve?: boolean;
}

interface QuizSummary {
  id: string;
  name: string;
  slug: string;
  headline: string | null;
  is_active: boolean;
  kind: "qualify" | "match" | null;
  builder: boolean;
  leads: number;
}

interface TapQuestion {
  question: string;
  options: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  questions?: TapQuestion[];
  answered?: boolean;
}

// What the API sees: tap questions become text so Claude remembers asking them.
function toApiMessage(m: ChatMessage): { role: "user" | "assistant"; content: string } {
  if (m.role === "assistant" && m.questions?.length) {
    const asked = m.questions.map((q) => `${q.question} [${q.options.join(" / ")}]`).join("\n");
    return { role: m.role, content: `${m.content}\n\n(Tap questions I asked:\n${asked})` };
  }
  return { role: m.role, content: m.content };
}

type Tab = "chat" | "preview" | "share";

const STARTERS = [
  { emoji: "🎓", text: "I run a study-abroad agency in Lagos. I want a quiz that tells students if they're eligible to study in the UK." },
  { emoji: "✨", text: "I sell skincare online. I want a quiz that recommends the right routine for each customer's skin." },
  { emoji: "🌍", text: "I'm a travel consultant. I want a fun quiz that matches people to the right holiday package." },
  { emoji: "☀️", text: "I install solar in Abuja. I want to find out which homes can actually afford it before I visit." },
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi! Tell me about your business: what you sell, who your customers are, and what the quiz should do (find out who's ready to buy, or recommend the right product). I'll draft the whole quiz for you.",
};

const chatKey = (quizId: string | null) => `lsai-builder-chat-${quizId || "new"}`;

function loadChat(quizId: string | null): ChatMessage[] {
  try {
    const raw = localStorage.getItem(chatKey(quizId));
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : null;
    return parsed && parsed.length ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function saveChat(quizId: string | null, messages: ChatMessage[]) {
  try {
    localStorage.setItem(chatKey(quizId), JSON.stringify(messages.slice(-30)));
  } catch {
    /* storage blocked: chat just won't persist */
  }
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.2Z" />
    </svg>
  );
}

// The chat → quiz studio. Standalone at /build/studio, or `embedded` as the
// Builder tab of a self-serve dashboard (which owns logout and the tab bar).
export default function BuilderStudio({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"" | "link" | "embed">("");
  const [color, setColor] = useState("#7C3AED");
  const [publishing, setPublishing] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [deskTab, setDeskTab] = useState<"preview" | "share">("preview");
  const [shareMsg, setShareMsg] = useState("");
  const [taps, setTaps] = useState<Record<number, string>>({});
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [freshDraft, setFreshDraft] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameWithStarter = useRef(false);
  const starterRef = useRef<string | null>(null);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session}`, ...(init?.headers || {}) },
      });
      if (res.status === 401) {
        localStorage.removeItem("lsai-session");
        router.replace("/build");
        throw new Error("Please sign in again.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      return data;
    },
    [session, router]
  );

  const refresh = useCallback(async () => {
    const data = await api("/api/builder/state");
    setOrg(data.org);
    setColor(data.org?.primary_color || "#7C3AED");
    setQuizzes(data.quizzes.filter((q: QuizSummary) => q.builder));
    return data;
  }, [api]);

  useEffect(() => {
    setOrigin(window.location.origin);
    const sid = localStorage.getItem("lsai-session");
    if (!sid) {
      router.replace("/build");
      return;
    }
    setSession(sid);
    // Industry landing pages hand over a starter idea for the first message.
    try {
      const starter = localStorage.getItem("lsai-builder-starter");
      if (starter) {
        setDraft(starter);
        cameWithStarter.current = true;
        starterRef.current = starter;
        localStorage.removeItem("lsai-builder-starter");
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    if (!session) return;
    refresh()
      .then((data) => {
        // Self-serve accounts build inside their dashboard's Builder tab, so the
        // standalone studio hands them over (keeping any industry-page idea).
        if (!embedded && data.org?.self_serve) {
          if (starterRef.current) localStorage.setItem("lsai-builder-starter", starterRef.current);
          router.replace(`/dashboard/${data.org.slug}?tab=builder`);
          return;
        }
        // Reopen the most recent quiz so owners land back where they left off,
        // unless they arrived with a new idea from an industry page.
        const latest = (data.quizzes as QuizSummary[]).find((q) => q.builder);
        if (latest && !cameWithStarter.current) {
          setQuizId(latest.id);
          setMessages(loadChat(latest.id));
        }
      })
      .catch(() => {});
  }, [session, refresh, embedded, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, tab]);

  const openQuiz = (id: string | null) => {
    setQuizId(id);
    setMessages(loadChat(id));
    setError("");
    setFreshDraft(false);
    setPreviewVersion((v) => v + 1);
    setMenuOpen(false);
    setTab("chat");
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    // Any open tap card is settled once the owner sends something.
    const settled = messages.map((m) => (m.questions?.length ? { ...m, answered: true } : m));
    const next: ChatMessage[] = [...settled, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setTaps({});
    setError("");
    setThinking(true);
    setFreshDraft(false);
    try {
      const convo = next.filter((m) => m.content !== WELCOME.content).map(toApiMessage);
      const data = await api("/api/builder/chat", {
        method: "POST",
        body: JSON.stringify({ quizId, messages: convo }),
      });
      const withReply: ChatMessage[] = [
        ...next,
        {
          role: "assistant",
          content: data.reply,
          ...(Array.isArray(data.questions) && data.questions.length ? { questions: data.questions } : {}),
        },
      ];
      setMessages(withReply);
      const newId: string | null = data.quizId || null;
      if (newId && newId !== quizId) {
        saveChat(newId, withReply);
        if (!quizId) localStorage.removeItem(chatKey(null));
        setQuizId(newId);
      } else {
        saveChat(quizId, withReply);
      }
      if (newId) {
        setPreviewVersion((v) => v + 1);
        setFreshDraft(true);
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setThinking(false);
    }
  };

  const current = quizzes.find((q) => q.id === quizId) || null;
  const publicUrl = org && current ? `${origin}/${org.slug}/${current.slug}` : "";
  const waText = current
    ? `${current.headline || current.name}\n\nTake this free 2-minute quiz 👉 ${publicUrl}`
    : "";
  const embedCode = current
    ? `<iframe src="${publicUrl}?embed=1" id="lsai-quiz-${current.id}" title="${current.name.replace(/"/g, "&quot;")}" style="width:100%;border:0;min-height:600px" loading="lazy"></iframe>
<script>window.addEventListener("message",function(e){if(e.origin!=="${origin}")return;var d=e.data;if(d&&d.type==="lsai-quiz-height"&&d.quiz==="${current.id}"){var f=document.getElementById("lsai-quiz-${current.id}");if(f)f.style.height=d.height+"px";}});</script>`
    : "";

  // Clipboard API first; older phones and in-app browsers need the textarea trick.
  const copy = async (what: "link" | "embed") => {
    const text = what === "link" ? publicUrl : embedCode;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setShareMsg("");
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } else {
      setShareMsg("Couldn't copy automatically. Press and hold the link below to copy it.");
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: current?.headline || current?.name, url: publicUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy("link");
  };

  const togglePublish = async () => {
    if (!current) return;
    setPublishing(true);
    setError("");
    try {
      await api("/api/builder/publish", {
        method: "POST",
        body: JSON.stringify({ quizId: current.id, publish: !current.is_active }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the quiz.");
    } finally {
      setPublishing(false);
    }
  };

  const saveColor = async (value: string) => {
    setColor(value);
    try {
      await api("/api/builder/org", { method: "PATCH", body: JSON.stringify({ primary_color: value }) });
      setPreviewVersion((v) => v + 1);
    } catch {
      /* colour just won't persist */
    }
  };

  const signOut = () => {
    localStorage.removeItem("lsai-session");
    router.replace("/build");
  };

  if (!org) {
    return (
      <div
        className={`${embedded ? "h-full" : "h-[100dvh]"} flex items-center justify-center bg-[#0E1525] text-[#9DA2A6] text-sm`}
      >
        <span className="animate-pulse">Loading your studio…</span>
      </div>
    );
  }

  const userCount = messages.filter((m) => m.role === "user").length;

  // ── Panels (shared by phone tabs and the desktop layout) ──

  const chatPanel = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[88%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-[#1C2333] text-[#E4E8EB] border border-[#2B3245] rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.questions?.length ? (
                  <div
                    className={`mt-2 rounded-2xl border p-3.5 space-y-3.5 ${
                      isLast && !m.answered ? "border-violet-500/50 bg-violet-500/5" : "border-[#2B3245] opacity-60"
                    }`}
                  >
                    {m.questions.map((q, qi) => (
                      <div key={qi}>
                        <p className="text-[13px] font-semibold text-[#E4E8EB] mb-2">{q.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => {
                            const picked = isLast && !m.answered && taps[qi] === opt;
                            return (
                              <button
                                key={opt}
                                disabled={!isLast || m.answered || thinking}
                                onClick={() => {
                                  const nextTaps = { ...taps, [qi]: opt };
                                  setTaps(nextTaps);
                                  // One question: a single tap sends it straight away.
                                  if (m.questions!.length === 1) send(`${q.question} → ${opt}`);
                                }}
                                className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition active:scale-95 ${
                                  picked
                                    ? "bg-violet-600 border-violet-500 text-white"
                                    : "bg-[#1C2333] border-[#2B3245] text-[#C2C8CC] hover:border-violet-500/60"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {isLast && !m.answered && (
                      <div className="flex items-center gap-3 pt-1">
                        {m.questions.length > 1 && (
                          <button
                            disabled={thinking || Object.keys(taps).length < m.questions.length}
                            onClick={() =>
                              send(m.questions!.map((q, qi) => `${q.question} → ${taps[qi]}`).join("\n"))
                            }
                            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-[13px] font-semibold disabled:opacity-40"
                          >
                            Continue →
                          </button>
                        )}
                        <button
                          disabled={thinking}
                          onClick={() => send("Use your best judgement and build it.")}
                          className="text-[12.5px] text-[#9DA2A6] hover:text-[#F5F9FC]"
                        >
                          Skip, just build it
                        </button>
                        <button
                          disabled={thinking}
                          onClick={() => composerRef.current?.focus()}
                          className="text-[12.5px] text-[#9DA2A6] hover:text-[#F5F9FC]"
                        >
                          Type my own
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
                {isLast && m.role === "assistant" && freshDraft && current && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setTab("preview");
                        setDeskTab("preview");
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#2B3245] text-[#F5F9FC] text-xs font-semibold"
                    >
                      ▶ Try your quiz
                    </button>
                    <button
                      onClick={() => {
                        setTab("share");
                        setDeskTab("share");
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#25D366]/15 text-[#4ADE80] text-xs font-semibold"
                    >
                      Publish & share
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[#1C2333] border border-[#2B3245] px-4 py-3 text-[14px] text-[#9DA2A6] flex items-center gap-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              </span>
              Designing your quiz… up to a minute
            </div>
          </div>
        )}
        {userCount === 0 && !thinking && !current && (
          <div className="pt-1 space-y-2">
            <p className="text-xs text-[#9DA2A6] px-1">Or start from an example</p>
            {STARTERS.map((s) => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                className="flex gap-3 w-full text-left text-[13.5px] rounded-xl border border-[#2B3245] bg-[#1C2333] px-3.5 py-3 text-[#C2C8CC] active:scale-[0.99] hover:border-violet-500/60 transition"
              >
                <span className="text-lg leading-none mt-0.5">{s.emoji}</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-400">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="p-3 border-t border-[#2B3245] bg-[#0E1525]"
      >
        <div className="flex items-end gap-2 rounded-2xl bg-[#1C2333] border border-[#2B3245] focus-within:border-violet-500 px-3 py-2 transition">
          <textarea
            ref={composerRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 1024px)").matches) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={draft.length > 80 ? 3 : 1}
            placeholder={current ? "Ask for a change… e.g. make it shorter" : "Describe your business and quiz…"}
            className="flex-1 resize-none bg-transparent text-[16px] lg:text-[14.5px] text-[#F5F9FC] placeholder:text-[#5F6B7A] outline-none py-1.5 max-h-40"
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={thinking || !draft.trim()}
            aria-label="Send"
            className="shrink-0 w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );

  const previewPanel = current ? (
    <iframe
      key={`${current.id}-${previewVersion}`}
      src={`/build/preview/${current.id}?v=${previewVersion}`}
      title="Quiz preview"
      className="w-full h-full border-0 bg-white"
    />
  ) : (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div>
        <div className="text-4xl mb-3">🪄</div>
        <p className="font-semibold text-[#F5F9FC]">Your quiz appears here</p>
        <p className="text-sm text-[#9DA2A6] mt-1 max-w-xs">
          Describe your business in the chat. The AI drafts your quiz and you can try it right here.
        </p>
      </div>
    </div>
  );

  const sharePanel = (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {current ? (
        <>
          <div className="rounded-2xl bg-[#1C2333] border border-[#2B3245] p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#F5F9FC] truncate">{current.name}</p>
                <p className="text-xs mt-1 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${current.is_active ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="text-[#9DA2A6]">
                    {current.is_active ? `Live · ${current.leads} lead${current.leads === 1 ? "" : "s"}` : "Draft · only you can see it"}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`mt-4 w-full py-3.5 rounded-xl text-[15px] font-semibold disabled:opacity-60 active:scale-[0.99] transition ${
                current.is_active
                  ? "bg-[#2B3245] text-[#C2C8CC]"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              }`}
            >
              {publishing ? "Saving…" : current.is_active ? "Unpublish" : "Publish my quiz"}
            </button>
            {!current.is_active && (
              <p className="mt-2 text-[11.5px] text-[#9DA2A6] text-center">
                Free for your first 10 leads or 30 days
              </p>
            )}
          </div>

          {current.is_active && (
            <>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-[#25D366] text-[#07361E] text-[16px] font-bold active:scale-[0.99] transition shadow-[0_8px_24px_-8px_rgba(37,211,102,0.6)]"
              >
                <WhatsAppIcon size={22} />
                Share on WhatsApp
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareNative}
                  className="py-3 rounded-xl bg-[#1C2333] border border-[#2B3245] text-[14px] font-semibold text-[#F5F9FC]"
                >
                  {copied === "link" ? "Link copied!" : "Share / copy link"}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl bg-[#1C2333] border border-[#2B3245] text-[14px] font-semibold text-[#F5F9FC] text-center"
                >
                  Open quiz ↗
                </a>
              </div>

              {shareMsg && <p className="text-[12.5px] text-amber-300">{shareMsg}</p>}
              <div className="rounded-xl bg-[#1C2333] border border-[#2B3245] px-3 py-2.5 text-[12.5px] text-[#9DA2A6] break-all select-all">
                {publicUrl}
              </div>

              <details className="rounded-2xl bg-[#1C2333] border border-[#2B3245] p-4 group">
                <summary className="cursor-pointer list-none flex items-center justify-between text-[14px] font-semibold text-[#F5F9FC]">
                  Embed on your website
                  <span className="text-[#9DA2A6] group-open:rotate-180 transition">⌄</span>
                </summary>
                <p className="text-[12.5px] text-[#9DA2A6] mt-2">
                  Paste this into a &quot;Custom HTML&quot; block on WordPress, Wix or Squarespace. It resizes itself to fit.
                </p>
                <textarea
                  readOnly
                  value={embedCode}
                  rows={4}
                  className="mt-3 w-full rounded-lg bg-[#0E1525] border border-[#2B3245] p-2.5 font-mono text-[11px] text-[#C2C8CC]"
                />
                <button
                  onClick={() => copy("embed")}
                  className="mt-2 w-full py-2.5 rounded-lg bg-[#2B3245] text-[13px] font-semibold text-[#F5F9FC]"
                >
                  {copied === "embed" ? "Copied!" : "Copy embed code"}
                </button>
              </details>
            </>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-[#1C2333] border border-[#2B3245] p-5 text-center text-sm text-[#9DA2A6]">
          Build a quiz in the chat first, then publish and share it here.
        </div>
      )}

      <div className="rounded-2xl bg-[#1C2333] border border-[#2B3245] p-4 space-y-3">
        <label className="flex items-center justify-between text-[14px] text-[#F5F9FC]">
          Brand colour
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={(e) => saveColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#2B3245]"
          />
        </label>
        {!embedded && (
          <a
            href={`/dashboard/${org.slug}`}
            className="flex items-center justify-between text-[14px] text-[#F5F9FC] py-1"
          >
            View your leads
            <span className="text-[#9DA2A6]">→</span>
          </a>
        )}
      </div>

      <p className="text-center text-[12.5px] text-[#9DA2A6] pb-2">
        Need something custom?{" "}
        <a href="mailto:stella@leadscoreai.com" className="text-violet-300 hover:text-violet-200">
          stella@leadscoreai.com
        </a>
      </p>
    </div>
  );

  const phoneTabs: [Tab, string, string][] = [
    ["chat", "Chat", "💬"],
    ["preview", "Preview", "▶"],
    ["share", "Share", "↗"],
  ];

  const quizList = (
    <div className="space-y-1">
      <button
        onClick={() => openQuiz(null)}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold mb-2"
      >
        + New quiz
      </button>
      {quizzes.length === 0 && <p className="text-xs text-[#9DA2A6] px-1 py-2">No quizzes yet.</p>}
      {quizzes.map((q) => (
        <button
          key={q.id}
          onClick={() => openQuiz(q.id)}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
            q.id === quizId ? "bg-[#2B3245] text-[#F5F9FC]" : "text-[#C2C8CC] hover:bg-[#1C2333]"
          }`}
        >
          <span className="block truncate font-medium">{q.name}</span>
          <span className="text-[11px] text-[#9DA2A6] flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${q.is_active ? "bg-emerald-400" : "bg-amber-400"}`} />
            {q.is_active ? "Live" : "Draft"} · {q.kind === "match" ? "Match" : "Qualify"} · {q.leads} lead
            {q.leads === 1 ? "" : "s"}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`${embedded ? "h-full" : "h-[100dvh]"} relative flex flex-col bg-[#0E1525] text-[#F5F9FC] overflow-hidden`}
    >
      {/* Top bar */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-[#2B3245] bg-[#0E1525]/95 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/favicon-64.png" alt="" className="w-7 h-7 rounded-lg" />
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="lg:pointer-events-none min-w-0 flex items-center gap-1.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[11px] text-[#9DA2A6] leading-none">{org.name}</span>
            <span className="block text-[14px] font-semibold truncate max-w-[52vw] lg:max-w-none leading-tight mt-0.5">
              {current ? current.name : "New quiz"}
            </span>
          </span>
          <span className="lg:hidden text-[#9DA2A6] text-xs">▾</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          {current?.is_active && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on WhatsApp"
              className="w-9 h-9 rounded-xl bg-[#25D366] text-[#07361E] flex items-center justify-center"
            >
              <WhatsAppIcon size={18} />
            </a>
          )}
          {!embedded && (
            <button onClick={signOut} className="text-xs text-[#9DA2A6] hover:text-[#F5F9FC] px-2">
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Phone: quiz switcher sheet */}
      {menuOpen && (
        <div className="lg:hidden absolute inset-x-0 top-14 bottom-0 z-30 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="bg-[#0E1525] border-b border-[#2B3245] p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {quizList}
          </div>
        </div>
      )}

      {/* Desktop: quizzes | Chat | Preview / Share (same highlighted tabs as the phone) */}
      <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[240px_minmax(0,1fr)_minmax(0,1.05fr)]">
        <aside className="border-r border-[#2B3245] p-3 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9DA2A6] px-1 mb-2">Your quizzes</p>
          {quizList}
        </aside>
        <section className="min-h-0 border-r border-[#2B3245] flex flex-col">
          <div className="shrink-0 h-14 flex items-center px-3 border-b border-[#2B3245]">
            <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-[15px] font-semibold bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40">
              <span className="text-base">💬</span> Chat
            </span>
          </div>
          <div className="flex-1 min-h-0">{chatPanel}</div>
        </section>
        <section className="min-h-0 flex flex-col">
          <div className="shrink-0 h-14 flex items-center gap-2 px-3 border-b border-[#2B3245]">
            {(
              [
                ["preview", "Preview", "▶"],
                ["share", "Share", "↗"],
              ] as ["preview" | "share", string, string][]
            ).map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setDeskTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[15px] font-semibold transition ${
                  deskTab === key
                    ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                    : "text-[#9DA2A6] hover:text-[#F5F9FC] hover:bg-[#1C2333]"
                }`}
              >
                <span className="text-base">{icon}</span> {label}
                {key === "share" && current?.is_active && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 text-[10px] font-bold">
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 bg-[#1C2333]">{deskTab === "preview" ? previewPanel : sharePanel}</div>
        </section>
      </div>

      {/* Phone, embedded: Chat / Preview / Share as pills under the header */}
      {embedded && (
        <div className="lg:hidden shrink-0 flex gap-2 px-3 py-2 border-b border-[#2B3245]">
          {phoneTabs.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold transition ${
                tab === key
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                  : "text-[#9DA2A6] bg-[#1C2333]"
              }`}
            >
              <span className="text-sm leading-none">{icon}</span> {label}
              {key === "share" && current?.is_active && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-label="Live" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Phone: one panel at a time */}
      <main className="lg:hidden flex-1 min-h-0">
        {tab === "chat" && chatPanel}
        {tab === "preview" && previewPanel}
        {tab === "share" && sharePanel}
      </main>

      {/* Phone: bottom tab bar (standalone only; the dashboard owns the bottom when embedded) */}
      {!embedded && (
        <nav className="lg:hidden shrink-0 grid grid-cols-3 border-t border-[#2B3245] bg-[#0E1525] pb-[env(safe-area-inset-bottom)]">
          {phoneTabs.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-2.5 flex flex-col items-center gap-0.5 text-[11px] font-semibold transition ${
                tab === key ? "text-violet-300" : "text-[#9DA2A6]"
              }`}
            >
              <span className={`text-base leading-none ${tab === key ? "" : "opacity-70"}`}>{icon}</span>
              {label}
              <span className={`h-0.5 w-6 rounded-full mt-0.5 ${tab === key ? "bg-violet-400" : "bg-transparent"}`} />
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
