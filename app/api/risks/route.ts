import { NextRequest } from "next/server";
import { prepare, resultsDigest, aiResponse } from "@/lib/ai/route-helpers";
import { fallbackRisks } from "@/lib/ai/fallbacks";
import { getModel, withTimeout, BASE_SYSTEM_PROMPT } from "@/lib/ai/provider";
import { generateObject } from "ai";
import { z } from "zod";

const riskSchema = z.object({
  risks: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["High", "Medium", "Low"]),
        category: z.enum(["Financial", "Operational", "Regulatory"]),
        body: z.string(),
      })
    )
    .min(3)
    .max(5),
});

export async function POST(request: NextRequest) {
  const outcome = await prepare(await request.json().catch(() => ({})));
  if ("error" in outcome) return outcome.error;

  const { results, fallbackReason } = outcome.prepared;
  const model = getModel();

  if (fallbackReason === null && model) {
    try {
      const { object } = await withTimeout(
        generateObject({
          model,
          schema: riskSchema,
          system: BASE_SYSTEM_PROMPT,
          prompt: `${resultsDigest(results)}

TASK: Identify the three-to-five most material risks to THIS specific investment. They must be case-specific — DEWA tariff and Shams Dubai net-metering policy risk, panel degradation exceeding assumption in Dubai's heat and dust, PPA counterparty credit risk, roof structural and insurance exposure, financing covenant headroom. Do not produce a generic corporate risk list.

Ground each one in the computed sensitivity, break-even or DSCR figures above where they are relevant. Two to four sentences each.`,
        })
      );
      return aiResponse(object.risks, fallbackReason, true);
    } catch (error) {
      console.error("[ashraq:risks] Model call failed — falling back", error);
    }
  }

  return aiResponse(fallbackRisks(results), fallbackReason, false);
}
