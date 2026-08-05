/**
 * Monte Carlo worker.
 *
 * The 5,000-iteration simulation runs here, off the main thread, so the interface
 * never freezes mid-run. The worker imports the same engine the rest of the app uses —
 * there is no second implementation of the maths that could drift out of sync.
 */

import { runMonteCarlo, type ProjectInputs } from "@/lib/finance-engine";

export interface MonteCarloRequest {
  inputs: ProjectInputs;
  iterations: number;
  seed: number;
}

self.onmessage = (event: MessageEvent<MonteCarloRequest>) => {
  try {
    const { inputs, iterations, seed } = event.data;
    const result = runMonteCarlo(inputs, iterations, seed);
    // Samples are dropped before transfer — 5,000 floats are not needed on the main
    // thread, and the histogram already carries the shape of the distribution.
    self.postMessage({ ok: true, result: { ...result, samples: [] } });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Simulation failed",
    });
  }
};

export {};
