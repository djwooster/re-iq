import type { Metadata } from "next";
import {
  CompareManagers,
  Explain,
  FinalCta,
  Grow,
  Hero,
  HowItWorks,
  Ingest,
  Prioritize,
  Reconcile,
  WhoItsFor,
  WhyNotManagerAi,
  YourMonth,
} from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: { absolute: "RE-IQ · Portfolio intelligence for multifamily" },
  description:
    "RE-IQ reads every property manager's monthly package, checks the math, and tells you what's wrong, why, and what to do about it.",
};

/* The buyer's month first, then each pain with the product's answer. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <YourMonth />
      <HowItWorks />
      <Ingest />
      <Reconcile />
      <Explain />
      <Prioritize />
      <CompareManagers />
      <Grow />
      <WhyNotManagerAi />
      <WhoItsFor />
      <FinalCta />
    </>
  );
}
