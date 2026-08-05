import { NextRequest } from "next/server";
import { prepare, tryModel, resultsDigest, aiResponse } from "@/lib/ai/route-helpers";
import { fallbackCompare } from "@/lib/ai/fallbacks";

export async function POST(request: NextRequest) {
  const outcome = await prepare(await request.json().catch(() => ({})));
  if ("error" in outcome) return outcome.error;

  const { results, fallbackReason } = outcome.prepared;

  const text =
    fallbackReason === null
      ? await tryModel(
          `${resultsDigest(results)}

TASK: Compare Alternatives A, B, C and D in four paragraphs.

The tension flag is currently ${results.comparison.tensionFlag}. If it is true, the top two alternatives are within 10% of each other and you must say plainly that NPV alone cannot decide this and the choice turns on qualitative factors. If it is false, state which alternative leads and by how much.

You must cover: (1) both solar alternatives against the do-nothing baseline; (2) why A and B are discounted at different rates and what that does to the ranking — noting whether the correction widens or narrows B's advantage; (3) that D has the same NPV as A by construction, because financing does not change what an investment is worth, and is judged on DSCR instead; (4) the honest counter-argument for ownership despite the NPV ranking — post-horizon value beyond the modelled ${results.inputs.projectLifeYears} years, and balance-sheet ownership.

Do not soften the finding to make the alternatives look closer than the numbers say.`
        )
      : null;

  return aiResponse(text ?? fallbackCompare(results), fallbackReason, text !== null);
}
