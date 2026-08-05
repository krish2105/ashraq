"use client";

import { useState } from "react";
import { useAshraqStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { formatAED, formatPercent } from "@/lib/utils";
import { FileDown, Sheet, Check } from "lucide-react";

/**
 * Exports.
 *
 * PDF uses the browser's own print pipeline against a print stylesheet rather than
 * pulling in a heavy renderer — for a one-page summary that is the lighter, more
 * reliable choice, and it keeps the dashboard bundle small.
 */
export function ExportToolbar() {
  const { results, inputs } = useAshraqStore();
  const [copied, setCopied] = useState(false);

  const exportCsv = () => {
    const header = [
      "Year",
      "Generation (kWh)",
      "Tariff (AED/kWh)",
      "Avoided cost (AED)",
      "O&M (AED)",
      "Depreciation (AED)",
      "EBT (AED)",
      "Tax (AED)",
      "Net income (AED)",
      "Operating cash flow (AED)",
      "Terminal cash flow (AED)",
      "Net cash flow (AED)",
      "Discounted cash flow (AED)",
      "Cumulative cash flow (AED)",
    ];

    const rows = results.cashFlows.map((r) =>
      [
        r.year,
        r.generationKwh.toFixed(0),
        r.tariff.toFixed(4),
        r.avoidedCost.toFixed(2),
        r.omCost.toFixed(2),
        r.depreciation.toFixed(2),
        r.ebt.toFixed(2),
        r.tax.toFixed(2),
        r.netIncome.toFixed(2),
        r.operatingCashFlow.toFixed(2),
        r.terminalCashFlow.toFixed(2),
        r.netCashFlow.toFixed(2),
        r.discountedCashFlow.toFixed(2),
        r.cumulativeCashFlow.toFixed(2),
      ].join(",")
    );

    const summary = [
      "",
      "SUMMARY METRICS,Value,Discount rate applied",
      `NPV (Alternative A),${results.metrics.npv.toFixed(2)},${formatPercent(inputs.discountRateCapex, 2)}`,
      `IRR,${results.metrics.irr?.toFixed(6) ?? "undefined"},`,
      `MIRR,${results.metrics.mirr?.toFixed(6) ?? "undefined"},`,
      `Profitability Index,${results.metrics.profitabilityIndex.toFixed(4)},`,
      `Payback (years),${results.metrics.paybackPeriod?.toFixed(4) ?? "never"},`,
      `Discounted payback (years),${results.metrics.discountedPaybackPeriod?.toFixed(4) ?? "never"},`,
      `ARR,${results.metrics.arr.toFixed(6)},`,
      `PPA PV (Alternative B),${results.ppa.pvAtPpaRate.toFixed(2)},${formatPercent(inputs.discountRatePpa, 2)}`,
      `PPA PV at uniform rate (for contrast only),${results.ppa.pvAtCapexRate.toFixed(2)},${formatPercent(inputs.discountRateCapex, 2)}`,
      `Minimum DSCR (Alternative D),${results.financing.minDscr.toFixed(4)},`,
      `Break-even tariff (AED/kWh),${results.breakEven.breakEvenTariff.toFixed(6)},`,
      `Year-1 avoided CO2 (tonnes; estimate),${results.esg.year1AvoidedTonnes.toFixed(2)},`,
      `Recommendation,${results.recommendation.verdict},`,
      "",
      `Exported,${new Date().toISOString()}`,
      "Source,Ashraq deterministic finance engine — no AI involvement in any figure above",
    ];

    const csv = [header.join(","), ...rows, ...summary].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ashraq-al-waha-cashflows-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <FileDown className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
        Export summary as PDF
      </Button>
      <Button variant="secondary" size="sm" onClick={exportCsv}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <Sheet className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
        )}
        {copied ? "Downloaded" : "Export cash flows as CSV"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? `Cash flow CSV downloaded. NPV ${formatAED(results.metrics.npv)}.` : ""}
      </span>
    </div>
  );
}
