import type { Metadata } from "next";
import { FinalCta, Hero, HowItWorks, Questions, Trust } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: { absolute: "RE-IQ · Portfolio intelligence for multifamily" },
  description:
    "RE-IQ reads the T12s, rent rolls, and work orders your property managers send and tells you what's off budget, why, and what to do this week.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Questions />
      <HowItWorks />
      <Trust />
      <FinalCta />
    </>
  );
}
