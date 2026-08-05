"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_INPUTS } from "./case-data";
import {
  computeAll,
  type ProjectInputs,
  type FullResults,
  type MonteCarloResult,
} from "./finance-engine";
import { computeAdvanced, type AdvancedResults } from "./finance-engine-advanced";
import { validateInputs } from "./schema";

interface AshraqState {
  inputs: ProjectInputs;
  results: FullResults;
  /** Slab verification, cost-of-capital build-up, APV, EAA, equal-life, flips. */
  advanced: AdvancedResults;
  monteCarlo: MonteCarloResult | null;
  monteCarloRunning: boolean;
  errors: Record<string, string>;
  caseLoaded: boolean;
  wizardStep: number;

  setInput: <K extends keyof ProjectInputs>(key: K, value: ProjectInputs[K]) => void;
  setInputs: (patch: Partial<ProjectInputs>) => void;
  loadAlWahaCase: () => void;
  resetToBlank: () => void;
  setWizardStep: (step: number) => void;
  setMonteCarlo: (result: MonteCarloResult | null) => void;
  setMonteCarloRunning: (running: boolean) => void;
  recompute: () => void;
}

/**
 * A deliberately blank-ish starting point for "Start from scratch" — the structural
 * inputs remain (so the model still has a shape), but every case-specific figure the
 * user should own is zeroed out.
 */
const BLANK_INPUTS: ProjectInputs = {
  ...DEFAULT_INPUTS,
  year1GenerationKwh: 0,
  equipmentCost: 0,
  installationCost: 0,
  transportCost: 0,
  connectionFee: 0,
  workingCapital: 0,
  omYear1: 0,
  salvageValue: 0,
  tariffYear1: 0,
};

export const useAshraqStore = create<AshraqState>()(
  persist(
    (set, get) => ({
      inputs: DEFAULT_INPUTS,
      results: computeAll(DEFAULT_INPUTS),
      advanced: computeAdvanced(DEFAULT_INPUTS),
      monteCarlo: null,
      monteCarloRunning: false,
      errors: {},
      caseLoaded: true,
      wizardStep: 0,

      setInput: (key, value) => {
        const next = { ...get().inputs, [key]: value };
        const { errors } = validateInputs(next);
        set({
          inputs: next,
          errors,
          // Only recompute from a valid input set — never let a half-typed field
          // push NaN into the dashboard.
          results: Object.keys(errors).length === 0 ? computeAll(next, get().monteCarlo?.probabilityPositive) : get().results,
          advanced: Object.keys(errors).length === 0 ? computeAdvanced(next) : get().advanced,
          // Any input change invalidates the previous simulation.
          monteCarlo: null,
        });
      },

      setInputs: (patch) => {
        const next = { ...get().inputs, ...patch };
        const { errors } = validateInputs(next);
        set({
          inputs: next,
          errors,
          results: Object.keys(errors).length === 0 ? computeAll(next) : get().results,
          advanced: Object.keys(errors).length === 0 ? computeAdvanced(next) : get().advanced,
          monteCarlo: null,
        });
      },

      loadAlWahaCase: () =>
        set({
          inputs: DEFAULT_INPUTS,
          results: computeAll(DEFAULT_INPUTS),
          advanced: computeAdvanced(DEFAULT_INPUTS),
          errors: {},
          caseLoaded: true,
          monteCarlo: null,
          wizardStep: 0,
        }),

      resetToBlank: () =>
        set({
          inputs: BLANK_INPUTS,
          results: computeAll(DEFAULT_INPUTS),
          advanced: computeAdvanced(DEFAULT_INPUTS),
          errors: validateInputs(BLANK_INPUTS).errors,
          caseLoaded: false,
          monteCarlo: null,
          wizardStep: 0,
        }),

      setWizardStep: (wizardStep) => set({ wizardStep }),
      setMonteCarlo: (monteCarlo) =>
        set((state) => ({
          monteCarlo,
          results: monteCarlo
            ? computeAll(state.inputs, monteCarlo.probabilityPositive)
            : state.results,
        })),
      setMonteCarloRunning: (monteCarloRunning) => set({ monteCarloRunning }),

      recompute: () => {
        const { inputs, monteCarlo } = get();
        const { errors } = validateInputs(inputs);
        set({
          errors,
          results:
            Object.keys(errors).length === 0
              ? computeAll(inputs, monteCarlo?.probabilityPositive)
              : get().results,
          advanced: Object.keys(errors).length === 0 ? computeAdvanced(inputs) : get().advanced,
        });
      },
    }),
    {
      name: "ashraq-scenario-v1",
      // Only the inputs are persisted; results are always recomputed from them so a
      // stale cached result can never be displayed after an engine change.
      partialize: (state) => ({
        inputs: state.inputs,
        caseLoaded: state.caseLoaded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.recompute();
      },
    }
  )
);
