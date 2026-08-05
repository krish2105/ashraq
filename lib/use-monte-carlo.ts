"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAshraqStore } from "./store";
import { runMonteCarlo, type MonteCarloResult } from "./finance-engine";

/**
 * Runs the simulation in a Web Worker, with a synchronous fallback if Workers are
 * unavailable (older browsers, some embedded webviews). The fallback is slower but
 * produces identical numbers — the same seeded engine function either way.
 */
export function useMonteCarlo() {
  const workerRef = useRef<Worker | null>(null);
  const { inputs, monteCarlo, monteCarloRunning, setMonteCarlo, setMonteCarloRunning, errors } =
    useAshraqStore();

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback(
    (iterations = 5000, seed = 42) => {
      if (Object.keys(errors).length > 0) return;
      setMonteCarloRunning(true);

      const finish = (result: MonteCarloResult) => {
        setMonteCarlo(result);
        setMonteCarloRunning(false);
      };

      try {
        workerRef.current?.terminate();
        const worker = new Worker(new URL("../workers/monte-carlo.worker.ts", import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
          if (event.data?.ok) finish(event.data.result as MonteCarloResult);
          else {
            console.error("[ashraq] Monte Carlo worker error:", event.data?.error);
            finish(runMonteCarlo(inputs, iterations, seed));
          }
          worker.terminate();
          workerRef.current = null;
        };

        worker.onerror = () => {
          // Worker failed to start — fall back to the main thread rather than
          // leaving the panel stuck in a loading state.
          finish(runMonteCarlo(inputs, iterations, seed));
          worker.terminate();
          workerRef.current = null;
        };

        worker.postMessage({ inputs, iterations, seed });
      } catch {
        finish(runMonteCarlo(inputs, iterations, seed));
      }
    },
    [inputs, errors, setMonteCarlo, setMonteCarloRunning]
  );

  return { run, result: monteCarlo, running: monteCarloRunning };
}
