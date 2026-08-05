"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAshraqStore } from "@/lib/store";
import { callAiRoute } from "@/lib/ai/client";
import { Skeleton, Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, Cpu, ShieldCheck, TriangleAlert, Check, Flag, X } from "lucide-react";

/** Small shared header showing which path produced the content — model or engine. */
function SourceBadge({ source, notice }: { source?: string; notice?: string }) {
  if (!source) return null;
  const deterministic = source === "deterministic";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={deterministic ? "neutral" : "primary"}>
        {deterministic ? (
          <Cpu className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
        )}
        {deterministic ? "Computed" : "AI-assisted"}
      </Badge>
      {notice && <span className="text-step--2 text-fg-subtle">{notice}</span>}
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-step-0 leading-relaxed text-fg-muted">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic prose panel (explain / compare / delay)                             */
/* -------------------------------------------------------------------------- */

function ProsePanel({
  route,
  title,
  description,
}: {
  route: "explain" | "compare" | "delay-analysis";
  title: string;
  description: string;
}) {
  const { inputs } = useAshraqStore();
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await callAiRoute<string>(route, inputs);
    if (res.ok && typeof res.content === "string") {
      setText(res.content);
      setSource(res.source);
      setNotice(res.notice);
    } else {
      setText(null);
    }
    setLoading(false);
  }, [route, inputs]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-step-1 font-bold tracking-tight">{title}</h3>
          <p className="mt-1 text-step--2 text-fg-subtle">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Regenerate">
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            strokeWidth={2.4}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[96%]" />
            <Skeleton className="h-4 w-[88%]" />
            <Skeleton className="h-4 w-[92%]" />
          </div>
        ) : text ? (
          <>
            <SourceBadge source={source} notice={notice} />
            <div className="mt-4">
              <Prose text={text} />
            </div>
          </>
        ) : (
          <p className="text-step--1 text-fg-muted">
            This explanation is temporarily unavailable. Every figure it describes is on the
            dashboard tabs above.
          </p>
        )}
      </div>
    </section>
  );
}

export function ExplainPanel() {
  return (
    <ProsePanel
      route="explain"
      title="What these results mean"
      description="Written for a reader with no finance background."
    />
  );
}

export function ComparePanel() {
  return (
    <ProsePanel
      route="compare"
      title="Reading the alternatives against each other"
      description="Why the discount rates differ, and what that does to the ranking."
    />
  );
}

export function DelayNarrative() {
  return (
    <ProsePanel
      route="delay-analysis"
      title="Is waiting worth it?"
      description="Grounded in IRENA's finding that solar costs have stabilised."
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Risks                                                                       */
/* -------------------------------------------------------------------------- */

interface Risk {
  title: string;
  severity: "High" | "Medium" | "Low";
  category: "Financial" | "Operational" | "Regulatory";
  body: string;
}

const SEVERITY_TONE = {
  High: "danger",
  Medium: "warning",
  Low: "success",
} as const;

export function RisksPanel() {
  const { inputs } = useAshraqStore();
  const [risks, setRisks] = useState<Risk[] | null>(null);
  const [source, setSource] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callAiRoute<Risk[]>("risks", inputs).then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.content)) {
        setRisks(res.content);
        setSource(res.source);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inputs]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="mb-4">
        <h3 className="font-display text-step-1 font-bold tracking-tight">
          Top financial and operational risks
        </h3>
        <p className="mt-1 text-step--2 text-fg-subtle">
          Specific to this case — not a generic corporate risk register.
        </p>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : risks ? (
          <>
            <SourceBadge source={source} />
            <ol className="mt-4 space-y-3">
              {risks.map((risk, i) => (
                <motion.li
                  key={risk.title}
                  initial={reduce ? undefined : { opacity: 0, y: 12 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="rounded-xl border border-border bg-bg-subtle/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-step-0 font-bold">{risk.title}</span>
                    <Badge tone={SEVERITY_TONE[risk.severity]}>{risk.severity}</Badge>
                    <Badge tone="neutral">{risk.category}</Badge>
                  </div>
                  <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">{risk.body}</p>
                </motion.li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-step--1 text-fg-muted">Risk analysis is temporarily unavailable.</p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Recommendation                                                              */
/* -------------------------------------------------------------------------- */

interface Recommendation {
  verdict: string;
  headline: string;
  body: string;
  confidence: string;
}

const VERDICT_STYLE: Record<string, { cls: string; Icon: typeof Check }> = {
  Accept: { cls: "border-success/40 bg-success-soft/50", Icon: Check },
  "Review Further": { cls: "border-warning/45 bg-warning-soft/50", Icon: Flag },
  Delay: { cls: "border-warning/45 bg-warning-soft/50", Icon: Flag },
  Reject: { cls: "border-danger/45 bg-danger-soft/50", Icon: X },
};

export function RecommendationPanel() {
  const { inputs, results } = useAshraqStore();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [source, setSource] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callAiRoute<Recommendation>("recommend", inputs).then((res) => {
      if (cancelled) return;
      if (res.ok && res.content) {
        setRec(res.content);
        setSource(res.source);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inputs]);

  const verdict = rec?.verdict ?? results.recommendation.verdict;
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE["Review Further"];

  return (
    <section className={cn("rounded-2xl border p-6 shadow-soft", style.cls)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface/80">
          <style.Icon className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <div>
          <p className="text-step--2 uppercase tracking-[0.14em] text-fg-subtle">
            Final recommendation
          </p>
          <p className="font-display text-step-2 font-bold tracking-tight">{verdict}</p>
        </div>
        {rec?.confidence && (
          <Badge tone="neutral" className="ml-auto">
            <ShieldCheck className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
            {rec.confidence} confidence
          </Badge>
        )}
      </div>

      <p className="mt-4 text-step-1 font-semibold leading-snug">
        {rec?.headline ?? results.recommendation.headline}
      </p>

      <div aria-live="polite" aria-busy={loading} className="mt-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[94%]" />
            <Skeleton className="h-4 w-[86%]" />
          </div>
        ) : (
          <>
            <SourceBadge source={source} />
            <div className="mt-3">
              <Prose text={rec?.body ?? results.recommendation.rationale.join("\n\n")} />
            </div>
          </>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 border-t border-border/60 pt-4 text-step--2 leading-relaxed text-fg-subtle">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        The verdict itself is produced by decision rules in the engine, not by a language model — so
        it is reproducible and explainable. The AI layer may only phrase the reasoning around it.
      </p>
    </section>
  );
}
