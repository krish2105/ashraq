import type { Metadata } from "next";
import { InputWizard } from "@/components/wizard/input-wizard";

export const metadata: Metadata = {
  title: "Input wizard",
  description:
    "A four-step guided form for the Al Waha solar investment — every field pre-filled with a sourced default and explained in plain language.",
};

export default function WizardPage() {
  return <InputWizard />;
}
