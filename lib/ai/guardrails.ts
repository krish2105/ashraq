/**
 * Prompt-injection defence and output verification for "Ask Ashraq".
 *
 * The chat panel accepts arbitrary user text and can trigger a real engine run, so it
 * gets a layered defence rather than a single "please be safe" instruction. Layers,
 * in order of how much they actually protect:
 *
 *   1. Structural separation — the user's text is never concatenated into the
 *      instruction text. It travels as a distinct, explicitly-untrusted data block.
 *   2. Read-only tool surface — the model can only cause the engine to be *run*. No
 *      code path lets it write to the stored scenario, the dashboard, or an export.
 *      A successful injection's worst case is a misleading chat bubble.
 *   3. Output-side numeric verification — a mechanical cross-check of the model's
 *      numeric claims against the engine's actual output. This is real arithmetic,
 *      not a request for the model to police itself.
 *   4. Input sanitisation + server-side logging of anything that trips the filter.
 */

/** Patterns that look like an attempt to escape the role or reveal the prompt. */
const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /ignore\s+(all\s+)?(your\s+|the\s+)?(previous\s+|prior\s+|above\s+)?instructions?/i, label: "ignore-instructions" },
  { pattern: /disregard\s+(all\s+|your\s+|the\s+)?(previous\s+|prior\s+)?(instructions?|rules?|prompts?)/i, label: "disregard-rules" },
  { pattern: /(reveal|show|print|repeat|output|display)\s+(me\s+)?(your\s+|the\s+)?(system\s+)?(prompt|instructions?|rules)/i, label: "reveal-prompt" },
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, label: "role-reassignment" },
  { pattern: /pretend\s+(to\s+be|you('| a)re)/i, label: "roleplay-override" },
  { pattern: /act\s+as\s+(a|an|if)\s+/i, label: "act-as" },
  { pattern: /\b(developer|admin|system|root)\s+mode\b/i, label: "privilege-claim" },
  { pattern: /^\s*(system|assistant)\s*:/im, label: "role-marker-injection" },
  { pattern: /<\|?(im_start|im_end|system|endoftext)\|?>/i, label: "control-token" },
  { pattern: /\bDAN\b|\bjailbreak\b/i, label: "known-jailbreak" },
  { pattern: /new\s+instructions?\s*:/i, label: "new-instructions" },
  { pattern: /(say|output|tell\s+me)\s+(that\s+)?(the\s+)?npv\s+is\s+[\d,.]+/i, label: "forced-figure" },
  { pattern: /forget\s+(everything|all|your\s+(instructions?|training))/i, label: "forget-instructions" },
];

export interface SanitisationResult {
  /** The text that is safe to package as an untrusted data block. */
  clean: string;
  /** True when the message tripped at least one filter. */
  flagged: boolean;
  /** Which filters fired — logged server-side only, never returned to the user. */
  labels: string[];
}

/**
 * Strips role markers and control tokens, and records which injection heuristics
 * fired. Note what this deliberately does NOT do: it never tells the user that a
 * filter exists or which pattern matched. Teaching an adversary what tripped the
 * filter just helps them write the next attempt.
 */
export function sanitiseUserMessage(raw: string): SanitisationResult {
  const labels: string[] = [];

  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(raw)) labels.push(label);
  }

  const clean = raw
    // Neutralise chat-template control tokens
    .replace(/<\|?(im_start|im_end|system|endoftext)\|?>/gi, "")
    // Neutralise line-leading role markers that could fake a turn boundary
    .replace(/^\s*(system|assistant|user)\s*:/gim, "")
    // Collapse the delimiter we use to fence untrusted content, so it can't be forged
    .replace(/<\/?untrusted_user_input>/gi, "")
    .replace(/```/g, "'''")
    .trim()
    .slice(0, 2000);

  return { clean, flagged: labels.length > 0, labels };
}

/** Server-side only. Never surfaced to the client. */
export function logInjectionAttempt(labels: string[], messagePreview: string) {
  console.warn("[ashraq:guardrail] Possible prompt injection blocked", {
    labels,
    preview: messagePreview.slice(0, 160),
    at: new Date().toISOString(),
  });
}

/* -------------------------------------------------------------------------- */
/* Output-side numeric verification                                            */
/* -------------------------------------------------------------------------- */

export interface NumericClaim {
  raw: string;
  value: number;
  kind: "currency" | "percent" | "ratio";
}

export interface VerificationResult {
  verified: boolean;
  claims: NumericClaim[];
  unverifiedClaims: NumericClaim[];
  note?: string;
}

/** Pulls figures the model asserted out of its own prose. */
export function extractNumericClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = [];

  // AED 1,640,296 / AED 1.64M / AED 1.64 million
  const currency = /AED\s*([\d,]+(?:\.\d+)?)\s*(million|m|k|thousand)?/gi;
  let match: RegExpExecArray | null;
  while ((match = currency.exec(text)) !== null) {
    let value = parseFloat(match[1].replace(/,/g, ""));
    const unit = match[2]?.toLowerCase();
    if (unit === "million" || unit === "m") value *= 1_000_000;
    if (unit === "k" || unit === "thousand") value *= 1_000;
    if (Number.isFinite(value)) claims.push({ raw: match[0], value, kind: "currency" });
  }

  // 15.85% etc.
  const percent = /(\d+(?:\.\d+)?)\s*%/g;
  while ((match = percent.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    if (Number.isFinite(value)) claims.push({ raw: match[0], value, kind: "percent" });
  }

  return claims;
}

/**
 * Cross-checks every numeric claim against the set of figures the engine actually
 * produced for this request. A claim that reconciles with no engine output within
 * tolerance is reported so the UI can flag the message rather than render it as
 * trustworthy.
 *
 * Tolerance is deliberately loose (2%) because the model legitimately rounds — the
 * check is for fabricated figures, not for rounding.
 */
export function verifyNumericClaims(
  text: string,
  allowedValues: number[],
  tolerance = 0.02
): VerificationResult {
  const claims = extractNumericClaims(text);
  if (claims.length === 0) return { verified: true, claims: [], unverifiedClaims: [] };

  const reconciles = (claim: NumericClaim) =>
    allowedValues.some((allowed) => {
      if (!Number.isFinite(allowed)) return false;
      // Percent claims are compared both as-written (15.85) and as a decimal (0.1585).
      const candidates =
        claim.kind === "percent" ? [claim.value, claim.value / 100] : [claim.value];
      return candidates.some((c) => {
        if (allowed === 0) return Math.abs(c) < 1e-6;
        return Math.abs(c - allowed) <= Math.abs(allowed * tolerance);
      });
    });

  // Small integers (years, counts, "top 3") are not financial claims — excluding them
  // keeps the flag meaningful instead of firing on every sentence.
  const material = claims.filter(
    (c) => !(c.kind === "percent" && c.value <= 100 && Number.isInteger(c.value) && c.value <= 20)
  );

  const unverifiedClaims = material.filter((c) => !reconciles(c));

  return {
    verified: unverifiedClaims.length === 0,
    claims,
    unverifiedClaims,
    note:
      unverifiedClaims.length > 0
        ? "One or more figures in this reply could not be reconciled against the model's own computed output. Verify them on the dashboard before relying on them."
        : undefined,
  };
}

/**
 * Every figure the engine produced for a given result set, flattened — the allowlist
 * the verifier reconciles against.
 */
export function collectEngineValues(results: {
  metrics: {
    npv: number;
    irr: number | null;
    mirr: number | null;
    profitabilityIndex: number;
    paybackPeriod: number | null;
    discountedPaybackPeriod: number | null;
    arr: number;
    initialOutflow: number;
    totalCapex: number;
    pvOfInflows: number;
  };
  ppa: { pvAtPpaRate: number; pvAtCapexRate: number };
  financing: { minDscr: number; loanAmount: number; annualDebtService: number; equityAmount: number };
  esg: { year1AvoidedTonnes: number; lifetimeAvoidedTonnes: number };
  breakEven: { breakEvenTariff: number; marginOfSafetyPercent: number };
  inputs: object;
  scenarios?: { npv: number }[];
  sensitivity?: { lowNpv: number; highNpv: number; swing: number }[];
}): number[] {
  const values: number[] = [
    results.metrics.npv,
    results.metrics.irr ?? NaN,
    results.metrics.mirr ?? NaN,
    results.metrics.profitabilityIndex,
    results.metrics.paybackPeriod ?? NaN,
    results.metrics.discountedPaybackPeriod ?? NaN,
    results.metrics.arr,
    results.metrics.initialOutflow,
    results.metrics.totalCapex,
    results.metrics.pvOfInflows,
    results.ppa.pvAtPpaRate,
    results.ppa.pvAtCapexRate,
    results.financing.minDscr,
    results.financing.loanAmount,
    results.financing.annualDebtService,
    results.financing.equityAmount,
    results.esg.year1AvoidedTonnes,
    results.esg.lifetimeAvoidedTonnes,
    results.breakEven.breakEvenTariff,
    results.breakEven.marginOfSafetyPercent,
    Math.abs(results.ppa.pvAtPpaRate - results.metrics.npv),
  ];

  for (const s of results.scenarios ?? []) values.push(s.npv);
  for (const s of results.sensitivity ?? []) values.push(s.lowNpv, s.highNpv, s.swing);

  // Every raw input is a legitimate figure to quote back.
  for (const v of Object.values(results.inputs)) {
    if (typeof v === "number") values.push(v);
  }

  return values.filter((v) => Number.isFinite(v));
}
