# Ashraq — AI-Powered Capital Budgeting & Investment Decision Platform

**أشرق — "it dawned."**

A capital budgeting decision-support platform built to evaluate one real investment question: should **Al Waha Logistics & Cold Chain LLC**, a third-party logistics and cold-storage operator in Dubai Investments Park, install a 1.2 MWp rooftop solar system — and if so, should it own the asset, borrow to fund it, or simply buy the output under a Power Purchase Agreement?

Built as an individual submission for Corporate Finance, MAIB Term 3, SP Jain School of Global Management, Dubai.

**Krishna Mathur · AS25DXB018 · September 2025 cohort**

---

## What makes this more than an NPV calculator

**1. Every alternative is discounted at a rate that matches its own risk.**
Alternatives A and D (owned solar, exposed to equipment and performance risk) are discounted at 10%. Alternative B (a contracted PPA, whose dominant risk is developer credit) is discounted at 7.5%. Applying one uniform rate across differently-risked cash flow streams is the single most common conceptual error in a comparison exercise — and correcting it here **changes which alternative wins**, not merely by how much. A unit test asserts that changing one rate cannot move the other's result.

**2. The AI layer cannot produce a number.**
All arithmetic lives in `lib/finance-engine.ts` — pure functions, no side effects, no network, no model involvement. 103 unit tests assert it against independently hand-computed values. When the assistant answers a what-if question, it does not estimate: it extracts the parameter change, the engine is re-run for real, and the model narrates the actual output. Every numeric claim in its reply is then mechanically cross-checked against what the engine returned, and anything that fails to reconcile is visibly flagged.

**3. It works with zero API keys.**
This is a hard requirement, not a fallback story. With no environment file at all, every AI route serves a deterministic, engine-derived response — including genuine what-if recomputation in the chat panel for recognisable question patterns. The live model is an upgrade, never a dependency.

**4. The investment and financing decisions stay separate.**
Alternative D has exactly the same NPV as Alternative A, because financing does not change what an investment is worth. It is judged on Debt Service Coverage Ratio against a lender's covenant floor instead. Presenting a levered NPV as a "better" NPV is a common error this model is built so it cannot make.

---

## Headline results (default Al Waha inputs)

| Metric | Alternative A — CAPEX owned | Alternative B — PPA |
|---|---|---|
| Initial outflow | AED 4,280,000 | AED 0 |
| **NPV / PV** | **AED 1,640,296** @ 10% | **AED 2,065,233** @ 7.5% |
| IRR | 15.85% | Undefined (no outlay) |
| MIRR | 12.41% | — |
| Profitability Index | 1.383 | — |
| Simple payback | 5.87 years | Immediate |
| Discounted payback | 9.09 years | — |
| ARR | 23.6% | — |

**Alternative D** (70/30 debt): identical NPV to A by construction; minimum DSCR **1.25×** against a 1.20× covenant floor, improving every year.
**Alternative C** (status quo): NPV 0 — the baseline everything else is measured against.

**The central finding.** Once the discount rate is corrected for the fact that PPA cash flows carry counterparty credit risk rather than equipment risk, the PPA's advantage over ownership **widens** — a gap of roughly **AED 425,000**. The counter-argument for ownership is not that its NPV competes; it is that ownership captures the whole long tail (the panels physically last 20–25 years while this model stops at 15) and builds a balance-sheet asset.

**Recommendation:** Accept the solar investment in principle; review the ownership structure before committing, pending competitive PPA bids.

---

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment file is needed.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | 103 unit tests — finance engine + AI guardrails |
| `npm run typecheck` | TypeScript, strict mode |
| `npm run lint` | ESLint |

To enable live AI, get a free key at [console.groq.com](https://console.groq.com/keys) and set `GROQ_API_KEY`. Nothing else changes.

---

## How the finance engine works

`lib/finance-engine.ts` is the single source of arithmetic truth. It is deliberately free of React, network calls and side effects so it can be tested in isolation and reused by the API routes, the Web Worker and the UI without divergence.

**The cash flow construction**

```
Year 0:      −(CAPEX + working capital)
Years 1..n:  OCF = (avoided cost − O&M − depreciation) × (1 − t) + depreciation
Final year:  + salvage × (1 − t) + working capital recovered
```

Depreciation is subtracted to compute taxable income, then added back because it is a non-cash charge — that add-back is the depreciation tax shield. Generation degrades 0.5%/yr; the tariff escalates 2%/yr; O&M escalates 3%/yr. Because the asset is fully depreciated by the horizon, its book value is nil, so the entire salvage amount is a taxable gain.

**What it computes** — the 13 required calculations plus 4 production-grade additions:

Initial / operating / terminal cash flows · payback · discounted payback · ARR · NPV · IRR · MIRR (editable finance and reinvestment rates) · profitability index · break-even tariff · four-variable sensitivity tornado · best/base/worst scenarios · **5,000-run Monte Carlo** · **DSCR financing feasibility** · **avoided emissions** · **real-options delay analysis**.

**Implementation notes worth knowing**

- **IRR uses bisection, not Newton-Raphson.** Slower, and completely reliable where Newton-Raphson can diverge. Returns `null` rather than a misleading number when no root is bracketed — which is exactly what happens for the PPA, since it has no initial outlay.
- **Monte Carlo is seeded** (Mulberry32), so the same inputs always produce the same distribution and the figures quoted in the report are reproducible. It runs in a Web Worker so the UI thread never blocks.
- **Break-even solves by bisection** on the tariff, since NPV is monotonic in it.
- **Nothing returns `NaN` to the UI.** A test asserts this across every headline metric, and Zod validation catches bad input at the form boundary before it can reach the engine.

---

## Architecture

```
app/
  page.tsx              Landing — 3D solar hero (R3F, progressively enhanced)
  wizard/               Four-step guided input form
  dashboard/            Verdict cards + 8 deep-analysis tabs + Ask Ashraq
  assumptions/          Every input with its source and caveats
  methodology/          How it computes, and what it refuses to do
  api/
    compute/            The deterministic engine, exposed. No AI.
    explain/ risks/ compare/ recommend/ delay-analysis/
    ask/                Conversational, tool-grounded, guarded
    solar-yield/        Open-Meteo irradiance calibration
components/
  three/                R3F scenes — solar hero, 3D Monte Carlo distribution
  dashboard/panels/     Cash flow, comparison, sensitivity, scenarios,
                        Monte Carlo, financing, ESG, delay
lib/
  finance-engine.ts     Pure functions. The source of every number.
  case-data.ts          Al Waha defaults + sourced assumptions register
  schema.ts             Zod — validates the form AND the API. One definition.
  store.ts              Zustand, persisted
  ai/                   Provider, fallbacks, guardrails, rate limiter
workers/                Monte Carlo Web Worker
middleware.ts           Same-origin + session-token gate on /api/*
```

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript strict · Tailwind · Motion · React Three Fiber · Recharts · Zustand · Zod · Vercel AI SDK + Groq · Vitest.

---

## Security posture — and what is *not* claimed

This is a public course project with no user accounts. Full authentication would be genuine overkill and would work against the "usable by a non-finance user" requirement. But "no protection at all" is not acceptable for routes that consume a shared external quota. The controls are scoped to the actual threat model:

| Control | What it does | What it does **not** do |
|---|---|---|
| Origin/Referer check | Rejects any `/api/*` POST whose origin doesn't match the deployed host | Stop a determined attacker who forges headers |
| Session token | AI routes require a token minted by the app's own client bundle | Authenticate a *user* — it proves nothing about who is calling |
| Global rate limiter | Caps model calls app-wide at 20/min | Survive a serverless cold start (see limitations) |
| Prompt-injection defence | Structural separation, sanitisation, read-only tools, output verification | Guarantee no injection ever produces a misleading sentence |

**Why the rate limiter is global rather than per-IP:** Groq's free tier is metered **per organization**, not per IP or per key. Every visitor to the deployment draws from one shared pool of roughly 30 requests/minute. A per-IP limiter would protect nothing — three people demoing from three different networks can exhaust the quota just as easily as one.

**Verified, not assumed** (see `lib/ai/guardrails.test.ts`):

```
Bare curl, no Origin              → 403
Cross-origin POST                 → 403
Same-origin, no session token     → 401
Same-origin, valid token          → 200
12 adversarial injection prompts  → all flagged
8 legitimate questions            → none flagged (no false positives)
Fabricated "AED 50,000,000" claim → flagged as unverified
```

The most important structural property: **the assistant's tools are read-only.** There is no code path by which it can write to the stored scenario, the dashboard, or an export. A successful injection's worst case is a misleading chat bubble — it cannot alter what the dashboard or the exported report show.

---

## Known limitations — disclosed, not hidden

**The rate limiter is best-effort, not durable.** `lib/ai/rate-limit.ts` uses an in-memory token bucket. On Vercel's stateless runtime, each cold start gets a fresh module scope, so the counter resets and the global cap is enforced only within a warm instance. The spec-compliant fix is Upstash Redis via `@upstash/ratelimit`, which persists across invocations; this was consciously deferred to avoid a third-party account dependency for a course project. The seam in `rate-limit.ts` is kept clean so it is a single-function swap, and `checkGlobalRateLimit()` reports `bestEffort: true` so callers cannot mistake it for a hard guarantee.

**Modelling limitations** (also disclosed in-app and in the report):

- The 15-year horizon is shorter than the 20–25 year physical life. Post-horizon value — which accrues only to an owner — is excluded entirely, so the comparison is conservative *against* ownership.
- A single blended tariff is modelled rather than DEWA's full slab structure.
- The PPA rate (AED 0.30/kWh) and its 7.5% discount rate are reasoned estimates, not a real quote. The whole PPA-versus-ownership conclusion rests on them.
- The 9% corporate tax treatment is a judgement call. Al Waha sits in a Free Zone and could *test* for Qualifying Free Zone Person status, but property-linked activity is excluded and mostly-mainland customers risk the de-minimis threshold. The conservative standard rate is modelled; the QFZP upside is available as a toggle but is **not** a confirmed tax ruling.
- The grid emission factor (0.45 tCO₂/MWh) is an illustrative estimate. DEWA publishes no single official factor.

---

## AI tool declaration

Claude Code (Anthropic) was used for application scaffolding, code generation and drafting assistance. All financial figures were computed by the deterministic engine in this repository and independently verified against hand-computed values before the engine was written — those checks are encoded as the test suite. The final judgement, the discount-rate methodology, and the investment recommendation are the author's own.

---

## Originality

This is an independent submission, distinct in case, company, codebase, design system and repository from the group project `CF-CapExIQ` (NovaRetail GCC, automated micro-fulfilment). No code, copy, design tokens or case data are shared between them.
