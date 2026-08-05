import { LandingHero } from "@/components/sections/landing-hero";
import { CaseBrief } from "@/components/sections/case-brief";
import { AlternativesGrid } from "@/components/sections/alternatives-grid";
import { CapabilityBento } from "@/components/sections/capability-bento";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <CaseBrief />
      <AlternativesGrid />
      <CapabilityBento />
      <SiteFooter />
    </>
  );
}
