import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Distinctive display face — a grotesque with real character, so headings never
// read as a default system stack.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ashraq — AI-Powered Capital Budgeting & Investment Decision Platform",
    template: "%s · Ashraq",
  },
  description:
    "Ashraq evaluates a 1.2 MWp rooftop solar investment for Al Waha Logistics & Cold Chain LLC across four ownership structures — NPV, IRR, MIRR, Monte Carlo risk and DSCR feasibility, with every assumption sourced.",
  keywords: [
    "capital budgeting",
    "NPV",
    "IRR",
    "solar investment",
    "Dubai",
    "corporate finance",
    "Monte Carlo simulation",
    "DSCR",
  ],
  authors: [{ name: "Krishna Mathur" }],
  openGraph: {
    title: "Ashraq — Capital Budgeting Decision Platform",
    description:
      "Should Al Waha install 1.2 MWp of rooftop solar — and own it, finance it, or buy the output? Every input sourced, every number computed deterministically.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171b26" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${bricolage.variable} ${jetbrains.variable}`}
    >
      <body className="font-sans text-step-0 min-h-dvh">
        <Providers>
          {/* Skip link — the first thing a keyboard user reaches */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-fg"
          >
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
