import type { Metadata } from "next";
import { Reveal } from "@/components/ui/primitives";
import { SiteFooter } from "@/components/site-footer";
import { Calculator, Split, Landmark, ShieldCheck, Cpu } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Ashraq computes: the deterministic engine, per-alternative discount rates, the investment/financing separation, and the guardrails on the AI layer.",
};

const FORMULAS = [
  { name: "Net Present Value", formula: "NPV = Σ [CFₜ / (1+r)ᵗ] − CF₀", note: "Positive means value created beyond the required return." },
  { name: "Internal Rate of Return", formula: "Solve Σ [CFₜ / (1+IRR)ᵗ] = CF₀", note: "Found by bisection — reliable where Newton-Raphson can diverge." },
  { name: "Modified IRR", formula: "MIRR = (FV of inflows @ r / PV of outflows @ r)^(1/n) − 1", note: "Corrects IRR's unrealistic reinvestment assumption." },
  { name: "Profitability Index", formula: "PI = PV(future cash flows) / |CF₀|", note: "PI > 1 exactly when NPV > 0." },
  { name: "Operating cash flow", formula: "OCF = (Avoided cost − O&M − Depreciation) × (1 − t) + Depreciation", note: "Depreciation is subtracted for tax, then added back as a non-cash charge." },
  { name: "Terminal cash flow", formula: "TCF = Salvage × (1 − t) + Working capital recovered", note: "The asset is fully depreciated, so the whole salvage amount is a taxable gain." },
  { name: "Debt Service Coverage Ratio", formula: "DSCR = OCF / Annual debt service", note: "The metric a lender underwrites to — separate from project NPV." },
  { name: "Accounting Rate of Return", formula: "ARR = Average net income / Average book investment", note: "Included per the brief, though it ignores the time value of money." },
];

export default function MethodologyPage() {
  return (
    <>
      <div className="shell py-10 md:py-14">
        <Reveal className="max-w-3xl">
          <p className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
            Methodology
          </p>
          <h1 className="mt-3 font-display text-step-4 font-bold tracking-tight">
            How Ashraq computes — and what it deliberately refuses to do
          </h1>
          <p className="mt-5 text-step-0 leading-relaxed text-fg-muted">
            Three design decisions do most of the analytical work here. Each one exists to avoid a
            specific, common modelling error.
          </p>
        </Reveal>

        <div className="mt-12 space-y-6">
          <Reveal>
            <article className="rounded-2xl border border-primary/30 bg-primary-soft/35 p-6 md:p-8">
              <Split className="h-6 w-6 text-primary-strong" strokeWidth={2} aria-hidden="true" />
              <h2 className="mt-4 font-display text-step-2 font-bold tracking-tight">
                1. One discount rate per alternative, never one for all
              </h2>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                A cash flow&rsquo;s risk should determine its discount rate. Owning solar equipment
                exposes Al Waha to performance risk, maintenance risk and residual-value risk, so
                Alternatives A and D are discounted at the full 10% hurdle rate. A Power Purchase
                Agreement exposes it to essentially one thing — whether the developer stays solvent
                and honours the contract — a profile that sits much closer to secured debt, so
                Alternative B is discounted at 7.5%.
              </p>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                Applying a single blended rate across both would be the single most common
                conceptual error in a comparison exercise, and it is not a cosmetic one: correcting
                it here <strong className="font-semibold text-fg">changes which alternative wins</strong>,
                not merely the size of the gap. The engine enforces this structurally — the two
                rates are separate fields applied by separate code paths, and a unit test asserts
                that changing one cannot move the other.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.06}>
            <article className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8">
              <Landmark className="h-6 w-6 text-accent" strokeWidth={2} aria-hidden="true" />
              <h2 className="mt-4 font-display text-step-2 font-bold tracking-tight">
                2. The investment decision and the financing decision stay separate
              </h2>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                Alternative D produces exactly the same NPV as Alternative A. That is not a bug —
                it is the point. Whether a project is worth doing is judged on its unlevered cash
                flows at the hurdle rate, independent of how it is funded. Financing changes who
                puts up the money and how returns are split; it does not change what the asset is
                worth.
              </p>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                So Alternative D is not evaluated on a re-levered NPV. It answers a different
                question — can operating cash flow service the debt? — and is judged on Debt Service
                Coverage Ratio against the covenant floor a UAE commercial lender would actually
                apply. Presenting a levered NPV as though it were a better NPV is a common student
                error, and this model is built so it cannot happen.
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className="rounded-2xl border border-border bg-surface p-6 shadow-soft md:p-8">
              <Cpu className="h-6 w-6 text-primary-strong" strokeWidth={2} aria-hidden="true" />
              <h2 className="mt-4 font-display text-step-2 font-bold tracking-tight">
                3. The AI layer cannot produce a number
              </h2>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                Every figure in this application is computed by a pure TypeScript engine with 67
                unit tests asserting it against independently hand-computed values. No language
                model participates in any arithmetic at any point.
              </p>
              <p className="mt-3 text-step-0 leading-relaxed text-fg-muted">
                When the assistant answers a what-if question, it does not estimate. It extracts the
                parameter change from the question, the engine is re-run for real, and the model
                narrates that output — you can see the tool call and the changed inputs in the chat
                itself. Afterwards, every numeric claim in its reply is mechanically cross-checked
                against what the engine actually returned, and anything that fails to reconcile is
                flagged in the interface rather than rendered as trustworthy.
              </p>
            </article>
          </Reveal>
        </div>

        <section aria-labelledby="formulas" className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary-strong" strokeWidth={2} aria-hidden="true" />
            <h2 id="formulas" className="font-display text-step-3 font-bold tracking-tight">
              The formulas, as implemented
            </h2>
          </div>
          <p className="mb-6 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
            Definitions follow Ross, Westerfield &amp; Jordan, <em>Essentials of Corporate Finance</em>
            — the course&rsquo;s prescribed text — so the app&rsquo;s language matches the source
            being assessed against.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {FORMULAS.map((f) => (
              <Reveal key={f.name}>
                <article className="h-full rounded-xl border border-border bg-surface p-5">
                  <h3 className="font-display text-step-0 font-bold">{f.name}</h3>
                  <code className="mt-2.5 block overflow-x-auto rounded-lg bg-bg-subtle px-3 py-2.5 font-mono text-step--2 text-fg">
                    {f.formula}
                  </code>
                  <p className="mt-2.5 text-step--2 leading-relaxed text-fg-muted">{f.note}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="security" className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-success" strokeWidth={2} aria-hidden="true" />
            <h2 id="security" className="font-display text-step-3 font-bold tracking-tight">
              Guardrails on the assistant
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Structural separation of instructions and input",
                body: "Case context, rules and tool definitions live in a system-role message the visitor's text can never edit or append to. User input always travels inside an explicitly-untrusted delimited block, never concatenated into the instruction text.",
              },
              {
                title: "Read-only tool surface",
                body: "The assistant can cause the engine to be run. It has no tool that writes to the stored scenario, the dashboard, or any export. A successful injection's worst case is a misleading chat bubble — it structurally cannot alter what the dashboard or an exported report show.",
              },
              {
                title: "Mechanical output verification",
                body: "Before rendering, every numeric claim in the reply is extracted and reconciled against the figures the engine actually returned. Anything that doesn't match within tolerance is visibly flagged. This is arithmetic performed on the model's output — not a prompt politely asking the model to be accurate.",
              },
              {
                title: "Input sanitisation with silent logging",
                body: "Role markers, chat-template control tokens and known injection patterns are stripped before the message is packaged. Messages that trip the filter are logged server-side for review and never told to the user — teaching an adversary what tripped the filter only helps them write the next attempt.",
              },
              {
                title: "Same-origin gate and a global request budget",
                body: "Middleware rejects API requests whose origin doesn't match the deployed host, and AI routes additionally require a session token minted by the app's own client bundle. Model calls draw on a single global budget rather than a per-visitor one, because the upstream free tier is metered per organisation — a per-IP limit would protect nothing.",
              },
            ].map((item) => (
              <Reveal key={item.title}>
                <article className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="font-display text-step-0 font-bold">{item.title}</h3>
                  <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
