import { z } from "zod";

/**
 * Input validation.
 *
 * The same schema does two jobs: it guards the wizard's form fields at the UI
 * boundary, and it validates the request body on /api/compute. One definition, so
 * the client and the server can never disagree about what a valid input set is.
 *
 * The design rule throughout: a bad input must produce a visible, specific error —
 * never a silent NaN on the dashboard.
 */

const positive = (label: string) =>
  z
    .number({ message: `${label} must be a number` })
    .finite(`${label} must be a real number`)
    .positive(`${label} must be greater than zero`);

const nonNegative = (label: string) =>
  z
    .number({ message: `${label} must be a number` })
    .finite(`${label} must be a real number`)
    .min(0, `${label} cannot be negative`);

const rate = (label: string, max = 1) =>
  z
    .number({ message: `${label} must be a number` })
    .finite(`${label} must be a real number`)
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} cannot exceed ${max * 100}%`);

export const projectInputsSchema = z.object({
  // System
  systemSizeMWp: positive("System size"),
  year1GenerationKwh: positive("Year-1 generation"),
  degradationRate: rate("Panel degradation", 0.2),
  projectLifeYears: z
    .number()
    .int("Project life must be a whole number of years")
    .min(1, "Project life must be at least 1 year")
    .max(40, "Project life beyond 40 years is not a credible forecast horizon"),

  // Capital costs
  equipmentCost: positive("Equipment cost"),
  installationCost: nonNegative("Installation cost"),
  transportCost: nonNegative("Transportation cost"),
  connectionFee: nonNegative("Connection fee"),
  workingCapital: nonNegative("Working capital"),

  // Revenue
  tariffYear1: positive("Avoided tariff"),
  tariffEscalation: rate("Tariff escalation", 0.5),

  // Operating cost
  omYear1: nonNegative("O&M cost"),
  omEscalation: rate("O&M escalation", 0.5),

  // Tax & depreciation
  taxRate: rate("Corporate tax rate"),
  qfzpEnabled: z.boolean(),
  salvageValue: nonNegative("Salvage value"),

  // Discount rates — validated independently, exactly as they are applied
  discountRateCapex: z
    .number()
    .min(0.001, "Hurdle rate must be greater than zero")
    .max(0.75, "A hurdle rate above 75% is outside any credible range"),
  discountRatePpa: z
    .number()
    .min(0.001, "PPA discount rate must be greater than zero")
    .max(0.75, "A discount rate above 75% is outside any credible range"),

  // MIRR
  financeRate: rate("Finance rate", 0.75),
  reinvestmentRate: rate("Reinvestment rate", 0.75),

  // Alternative B
  ppaRate: nonNegative("PPA rate"),

  // Alternative D
  debtRatio: rate("Debt ratio"),
  debtInterestRate: rate("Debt interest rate", 0.5),
  debtTermYears: z
    .number()
    .int("Loan term must be a whole number of years")
    .min(1, "Loan term must be at least 1 year")
    .max(30, "Loan term cannot exceed 30 years"),

  // ESG
  gridEmissionFactor: nonNegative("Grid emission factor"),

  // Real options
  capexDeclineRate: rate("CAPEX decline rate", 0.5),
});

export type ProjectInputsSchema = z.infer<typeof projectInputsSchema>;

/** Field-level errors keyed by input name, ready to bind straight to the form. */
export function validateInputs(data: unknown): {
  success: boolean;
  errors: Record<string, string>;
  data?: ProjectInputsSchema;
} {
  const result = projectInputsSchema.safeParse(data);
  if (result.success) return { success: true, errors: {}, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}

/* -------------------------------------------------------------------------- */
/* AI route payloads                                                           */
/* -------------------------------------------------------------------------- */

export const askRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000, "Message is too long"),
      })
    )
    .max(30, "Conversation is too long — start a new one"),
  inputs: projectInputsSchema.optional(),
});

export const explainRequestSchema = z.object({
  inputs: projectInputsSchema,
});
