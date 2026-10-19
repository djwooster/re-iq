import type { Metadata } from "next";
// import { MonthEndChecklist } from "@/components/marketing/month-end-checklist";
import { Features, FinalCta, Hero, Trust } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: { absolute: "RE-IQ · Portfolio intelligence for multifamily" },
  description:
    "RE-IQ turns the T12s, rent rolls, and work orders your property managers send into variance, ranked issues, and next steps.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Checklist band: hidden while its presentation is reworked. */}
      {/* <MonthEndChecklist /> */}
      <Features />
      <Trust />
      <FinalCta />
    </>
  );
}
