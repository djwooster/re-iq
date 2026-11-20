/**
 * Pulse: the operating numbers owners want as close to live as possible (Brian's list, from a buyer
 * who demoed SymmetRE). Each tile names the reports that feed it. Values appear once those reports are
 * read; until then a tile shows when its report last arrived, or that it's waiting for one.
 */
export const PULSE = [
  { id: "traffic", label: "Traffic", parts: ["Leads", "Follow-up", "Conversion", "Renewals"], reports: ["leasing_activity", "renewals"] },
  { id: "delinquency", label: "Delinquency", parts: ["30 days", "60 days", "90+ days"], reports: ["ar_aging"] },
  { id: "work_orders", label: "Open work orders", parts: ["Open", "Over 7 days"], reports: ["work_orders"] },
  { id: "non_ready", label: "Non-ready units", parts: ["Vacant not ready"], reports: ["make_ready"] },
  { id: "occupancy", label: "Occupancy", parts: ["Physical", "Economic"], reports: ["box_score"] },
] as const;

export const PULSE_REPORTS: string[] = [...new Set(PULSE.flatMap((t) => t.reports))];
