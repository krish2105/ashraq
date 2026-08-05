"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useAshraqStore } from "@/lib/store";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact, formatPercent, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Field, InfoTip } from "@/components/ui/primitives";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export function FinancingPanel({ results }: { results: FullResults }) {
  const { inputs, setInput } = useAshraqStore();
  const { financing } = results;

  const data = financing.schedule.map((r) => ({
    year: `Y${r.year}`,
    ocf: r.operatingCashFlow,
    debtService: r.debtService,
    dscr: r.dscr,
    breach: r.breach,
  }));

  return (
    <section aria-labelledby="financing-heading" className="space-y-6">
      <div>
        <h2 id="financing-heading" className="font-display text-step-2 font-bold tracking-tight">
          Financing feasibility — Alternative D
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          This panel answers a different question from NPV. Alternative D has{" "}
          <strong className="text-fg">exactly the same NPV as Alternative A</strong> — financing
          does not change what an investment is worth. What it asks instead is whether operating
          cash flow can service the loan, which is the metric a lender actually underwrites to.
        </p>
      </div>

      {/* Live-editable debt structure */}
      <div className="grid gap-5 rounded-2xl border border-border bg-surface p-6 shadow-soft sm:grid-cols-3">
        <Field
          label="Debt ratio"
          suffix="%"
          tip="The share of CAPEX funded with borrowing rather than equity. Push it higher and the annual repayment rises, squeezing coverage."
          value={Number((inputs.debtRatio * 100).toFixed(2))}
          onChange={(v) => setInput("debtRatio", v / 100)}
          step={1}
          min={0}
          max={100}
        />
        <Field
          label="Interest rate"
          suffix="%"
          tip="Priced off EIBOR plus a margin for secured equipment finance."
          value={Number((inputs.debtInterestRate * 100).toFixed(2))}
          onChange={(v) => setInput("debtInterestRate", v / 100)}
          step={0.25}
          min={0}
        />
        <Field
          label="Loan term"
          suffix="years"
          tip="A shorter term concentrates repayment into fewer years, which lowers DSCR even though total interest paid is less."
          value={inputs.debtTermYears}
          onChange={(v) => setInput("debtTermYears", v)}
          step={1}
          min={1}
        />
      </div>

      {/* Verdict */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-start",
          financing.anyBreach
            ? "border-danger/40 bg-danger-soft/50"
            : "border-success/35 bg-success-soft/45"
        )}
      >
        {financing.anyBreach ? (
          <ShieldAlert className="h-5 w-5 shrink-0 text-danger" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-5 w-5 shrink-0 text-success" strokeWidth={2.2} aria-hidden="true" />
        )}
        <div>
          <p className="text-step-0 font-semibold">
            {financing.anyBreach
              ? `Covenant breach — DSCR falls to ${financing.minDscr.toFixed(2)}×`
              : `Bankable — minimum DSCR ${financing.minDscr.toFixed(2)}×`}
          </p>
          <p className="mt-1.5 text-step--1 leading-relaxed text-fg-muted">
            {financing.anyBreach ? (
              <>
                Coverage drops below the {financing.covenantFloor.toFixed(2)}× floor most UAE
                commercial lenders require. The equity contribution would need to rise, or the term
                to lengthen, before a bank would underwrite this structure.
              </>
            ) : (
              <>
                Coverage stays above the {financing.covenantFloor.toFixed(2)}× floor throughout, and
                it <em className="not-italic font-semibold text-fg">improves every year</em> —
                avoided-cost savings escalate with the tariff while debt service stays fixed. This
                is a genuinely bankable structure, not just a theoretical one.
              </>
            )}
          </p>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Loan amount", value: formatAED(financing.loanAmount) },
          { label: "Equity contribution", value: formatAED(financing.equityAmount) },
          { label: "Annual debt service", value: formatAED(financing.annualDebtService) },
          { label: "Covenant floor", value: `${financing.covenantFloor.toFixed(2)}×` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">{s.label}</dt>
            <dd className="tabular mt-1.5 font-display text-step-1 font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="h-[320px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis yAxisId="left" {...axisProps} tickFormatter={formatAEDCompact} width={78} />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...axisProps}
              domain={[0, "auto"]}
              tickFormatter={(v) => `${Number(v).toFixed(1)}×`}
              width={48}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v) => (Number(v) < 10 ? `${Number(v).toFixed(2)}×` : formatAED(Number(v)))}
                />
              }
              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
            />
            <Bar
              yAxisId="left"
              dataKey="ocf"
              name="Operating cash flow"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
              maxBarSize={34}
            />
            <Bar
              yAxisId="left"
              dataKey="debtService"
              name="Debt service"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
              maxBarSize={34}
            />
            <ReferenceLine
              yAxisId="right"
              y={financing.covenantFloor}
              stroke="hsl(var(--danger))"
              strokeDasharray="5 5"
              label={{
                value: `${financing.covenantFloor.toFixed(2)}× floor`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--danger))",
              }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="dscr"
              name="DSCR"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2.5}
              dot={{ r: 3.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[520px] text-step--1">
          <caption className="sr-only">Debt service coverage ratio schedule</caption>
          <thead>
            <tr className="border-b border-border bg-bg-subtle/70 text-left">
              {["Year", "Operating cash flow", "Debt service", "DSCR", "Status"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold text-fg-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {financing.schedule.map((r) => (
              <tr
                key={r.year}
                className={cn("border-b border-border/60 last:border-0", r.breach && "bg-danger-soft/40")}
              >
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  {r.year}
                </th>
                <td className="tabular px-4 py-3">{formatAED(r.operatingCashFlow)}</td>
                <td className="tabular px-4 py-3">{formatAED(r.debtService)}</td>
                <td className="tabular px-4 py-3 font-semibold">{r.dscr.toFixed(2)}×</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-step--2 font-semibold",
                      r.breach ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
                    )}
                  >
                    {r.breach ? (
                      <ShieldAlert className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                    )}
                    {r.breach ? "Breach" : "Pass"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-start text-step--2 leading-relaxed text-fg-subtle">
        <span>
          Debt service is calculated as a level annual payment on an amortizing term loan:
          P·i / (1 − (1+i)⁻ⁿ), where P is {formatAED(financing.loanAmount)}, i is{" "}
          {formatPercent(inputs.debtInterestRate, 2)} and n is {inputs.debtTermYears} years.
        </span>
        <InfoTip label="DSCR">
          Debt Service Coverage Ratio is operating cash flow divided by annual debt service. A
          lender wants to see at least 1.20× — meaning the project generates 20% more cash than it
          needs to make its payments.
        </InfoTip>
      </p>
    </section>
  );
}
