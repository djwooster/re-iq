import type { Metadata } from "next";
import {
  Explain,
  FinalCta,
  Grow,
  Hero,
  Ingest,
  Reconcile,
  WhoItsFor,
} from "@/components/marketing/sections";
import { MonthBento } from "@/components/marketing/month-bento";
import { WhatWeDo } from "@/components/marketing/what-we-do";

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
      <WhatWeDo />
      <Grow />
      <MonthBento />
      <Ingest />
      <Reconcile />
      <Explain />
      <WhoItsFor />
      <FinalCta />
    </>
  );
}
