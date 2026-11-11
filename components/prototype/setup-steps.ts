/** Setup steps, outside the client component so the route can list them at build time. */
export const STEPS = [
  { id: "properties", label: "Properties and reports" },
  { id: "managers", label: "Managers" },
  { id: "links", label: "Upload links" },
  { id: "review", label: "Review" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];
