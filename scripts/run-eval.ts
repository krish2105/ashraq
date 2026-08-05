/**
 * Runs the eval harness and prints a report.
 *
 *   npm run eval
 *
 * Exits non-zero if any hard gate fails, so CI blocks on a regression.
 */

import { DEFAULT_INPUTS } from "../lib/case-data";
import { runEval } from "../lib/eval/runner";
import { evalSummary } from "../lib/eval/golden-set";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const bar = (v: number, width = 24) => {
  const filled = Math.round(v * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
};

const report = runEval(DEFAULT_INPUTS);

console.log("\n══════════════════════════════════════════════════════════════════════");
console.log("  ASHRAQ AI EVALUATION HARNESS");
console.log("══════════════════════════════════════════════════════════════════════");
console.log(`  Path evaluated : ${report.path} (no API key configured)`);
console.log(`  Golden set     : ${report.total} cases across ${Object.keys(evalSummary.byCategory).length} categories`);
console.log(`  Run at         : ${report.runAt}`);

console.log("\n── HARD GATES (these block the build) ────────────────────────────────");
const g = report.gateResults;
console.log(
  `  Numeric accuracy    ${bar(g.numericAccuracy.rate)}  ${pct(g.numericAccuracy.rate).padStart(6)}  (${g.numericAccuracy.passed}/${g.numericAccuracy.total})`
);
console.log(
  `  Refusal correctness ${bar(g.refusalCorrectness.rate)}  ${pct(g.refusalCorrectness.rate).padStart(6)}  (${g.refusalCorrectness.passed}/${g.refusalCorrectness.total})`
);
console.log(
  `  No content leakage  ${bar(report.softMetrics.noLeakage.rate)}  ${pct(report.softMetrics.noLeakage.rate).padStart(6)}  (${report.softMetrics.noLeakage.passed}/${report.softMetrics.noLeakage.total})`
);

console.log("\n── SOFT METRICS (informative, non-blocking) ──────────────────────────");
console.log(
  `  Groundedness        ${bar(report.softMetrics.groundedness)}  ${pct(report.softMetrics.groundedness).padStart(6)}`
);
console.log(
  `  Required mentions   ${bar(report.softMetrics.requiredMentions.rate)}  ${pct(report.softMetrics.requiredMentions.rate).padStart(6)}  (${report.softMetrics.requiredMentions.passed}/${report.softMetrics.requiredMentions.total})`
);

console.log("\n── BY CATEGORY ───────────────────────────────────────────────────────");
for (const [cat, r] of Object.entries(report.byCategory).sort()) {
  console.log(`  ${cat.padEnd(30)} ${bar(r.rate, 16)}  ${pct(r.rate).padStart(6)}  (${r.passed}/${r.total})`);
}

if (report.failures.length > 0) {
  console.log("\n── FAILURES ──────────────────────────────────────────────────────────");
  for (const f of report.failures) {
    console.log(`\n  [${f.id}] ${f.category}`);
    console.log(`  Q: ${f.question}`);
    console.log(`  A: ${f.answer.slice(0, 180).replace(/\n/g, " ")}${f.answer.length > 180 ? "…" : ""}`);
    f.notes.forEach((n) => console.log(`  ✗ ${n}`));
  }
}

console.log("\n══════════════════════════════════════════════════════════════════════");
if (g.allGatesPassed && report.failures.length === 0) {
  console.log("  ✓ ALL HARD GATES PASSED");
  console.log("══════════════════════════════════════════════════════════════════════\n");
  process.exit(0);
} else {
  console.log(`  ✗ ${report.failures.length} CASE(S) FAILED A HARD GATE`);
  console.log("══════════════════════════════════════════════════════════════════════\n");
  process.exit(1);
}
