"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAshraqStore } from "@/lib/store";
import { askAshraq, type AskResponse } from "@/lib/ai/client";
import { Button } from "@/components/ui/primitives";
import { formatAED, cn } from "@/lib/utils";
import { MessageSquareText, X, Send, Wrench, ShieldAlert, Bot, User } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCall?: AskResponse["toolCall"];
  verification?: AskResponse["verification"];
  notice?: string;
}

const SUGGESTIONS = [
  "What if the DEWA tariff stays flat instead of escalating?",
  "What happens if the system costs 15% more than budgeted?",
  "Why is the PPA discounted at a lower rate?",
  "How bad does generation have to get before this stops working?",
];

export function AskAshraq() {
  const { inputs } = useAshraqStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I can answer questions about this analysis — including what-if questions. When you ask one, I re-run the actual financial model rather than estimating an answer, and you'll see exactly what I changed.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  // Escape closes the drawer — expected behaviour for any overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);

    try {
      const response = await askAshraq(question, inputs);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: response.answer,
          toolCall: response.toolCall,
          verification: response.verification,
          notice: response.notice,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't reach the analysis service just then. Every figure I'd have quoted is on the dashboard tabs — try the Comparison or Sensitivity tab.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="no-print fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2.5 rounded-full bg-primary px-5 font-semibold text-primary-fg shadow-glow transition-all duration-200 hover:bg-primary-strong active:scale-95 sm:bottom-8 sm:right-8"
      >
        <MessageSquareText className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
        <span className="hidden sm:inline">Ask Ashraq</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              onClick={() => setOpen(false)}
              className="no-print fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Ask Ashraq assistant"
              initial={reduce ? undefined : { x: "100%" }}
              animate={reduce ? undefined : { x: 0 }}
              exit={reduce ? undefined : { x: "100%" }}
              transition={{ type: "spring", stiffness: 330, damping: 36 }}
              className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-raised"
            >
              {/* Visual containment: labelled distinctly from the dashboard, so even a
                  successful injection reads as "something the chatbot said". */}
              <header className="flex items-start justify-between gap-3 border-b border-border bg-bg-subtle/70 p-5">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg">
                    <Bot className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-step-1 font-bold tracking-tight">
                      Ashraq&rsquo;s assistant
                    </h2>
                    <p className="mt-0.5 text-step--2 leading-snug text-fg-muted">
                      Answers come from real model runs — but verify important figures on the
                      dashboard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                        message.role === "user"
                          ? "bg-accent-soft text-accent"
                          : "bg-primary-soft text-primary-strong"
                      )}
                      aria-hidden="true"
                    >
                      {message.role === "user" ? (
                        <User className="h-3.5 w-3.5" strokeWidth={2.4} />
                      ) : (
                        <Bot className="h-3.5 w-3.5" strokeWidth={2.4} />
                      )}
                    </span>

                    <div className={cn("min-w-0 max-w-[85%]", message.role === "user" && "text-right")}>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-step--1 leading-relaxed",
                          message.role === "user"
                            ? "bg-accent-soft text-fg"
                            : "border border-border bg-bg-subtle/60 text-fg-muted"
                        )}
                      >
                        {message.content.split("\n\n").map((p, j) => (
                          <p key={j} className={j > 0 ? "mt-2.5" : undefined}>
                            {p}
                          </p>
                        ))}
                      </div>

                      {/* The tool call, shown rather than claimed */}
                      {message.toolCall && (
                        <div className="mt-2 rounded-xl border border-primary/30 bg-primary-soft/40 p-3 text-left">
                          <p className="flex items-center gap-1.5 text-step--2 font-semibold text-primary-strong">
                            <Wrench className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                            Re-ran the engine
                          </p>
                          <ul className="mt-1.5 space-y-0.5 text-step--2 text-fg-muted">
                            {Object.entries(message.toolCall.overrides).map(([k, v]) => (
                              <li key={k} className="tabular">
                                {k}: <strong className="text-fg">{String(v)}</strong>
                              </li>
                            ))}
                          </ul>
                          <p className="tabular mt-2 border-t border-primary/20 pt-2 text-step--2">
                            NPV{" "}
                            <strong className="text-fg">
                              {formatAED(Number(message.toolCall.result.npv))}
                            </strong>{" "}
                            <span
                              className={cn(
                                "font-semibold",
                                Number(message.toolCall.result.npvDelta) >= 0
                                  ? "text-success"
                                  : "text-danger"
                              )}
                            >
                              ({Number(message.toolCall.result.npvDelta) >= 0 ? "+" : ""}
                              {formatAED(Number(message.toolCall.result.npvDelta))} vs base)
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Output-side verification failure — flagged, not hidden */}
                      {message.verification && !message.verification.verified && (
                        <div className="mt-2 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger-soft/60 p-3 text-left">
                          <ShieldAlert
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger"
                            strokeWidth={2.4}
                            aria-hidden="true"
                          />
                          <p className="text-step--2 leading-relaxed text-fg-muted">
                            <strong className="text-danger">Unverified figures:</strong>{" "}
                            {message.verification.unverifiedClaims.join(", ")} could not be
                            reconciled against the model&rsquo;s computed output. Check these on the
                            dashboard before relying on them.
                          </p>
                        </div>
                      )}

                      {message.notice && (
                        <p className="mt-1.5 text-left text-step--2 text-fg-subtle">
                          {message.notice}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {busy && (
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-strong">
                      <Bot className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-bg-subtle/60 px-4 py-3.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1.5 w-1.5 rounded-full bg-fg-subtle"
                          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.16 }}
                        />
                      ))}
                      <span className="sr-only">Thinking</span>
                    </div>
                  </div>
                )}
              </div>

              {messages.length <= 1 && (
                <div className="border-t border-border px-5 py-3">
                  <p className="mb-2 text-step--2 font-medium text-fg-subtle">Try asking</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-left text-step--2 text-fg-muted transition-colors hover:border-primary hover:text-primary-strong"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 border-t border-border p-4"
              >
                <label htmlFor="ask-input" className="sr-only">
                  Ask a question about the analysis
                </label>
                <input
                  id="ask-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a what-if question…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-lg border border-border-strong bg-bg px-3.5 py-2.5 text-step--1 outline-none transition-colors focus:border-primary"
                />
                <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
                  <Send className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </Button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
