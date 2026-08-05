import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Results dashboard",
  description:
    "All seventeen computed metrics for the Al Waha solar investment — NPV, IRR, MIRR, sensitivity, scenarios, Monte Carlo risk, DSCR feasibility, emissions and delay analysis.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
