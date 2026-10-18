"use client";

import { PERIODS } from "@/lib/dates";
import type { Period } from "@/lib/types";
import { Segmented } from "./controls";

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return <Segmented label="Period" value={value} onChange={onChange} options={PERIODS.map((p) => ({ id: p.id, label: p.label, title: p.long }))} />;
}
