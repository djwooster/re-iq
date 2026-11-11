/** Setup steps, outside the client component so the route can list them at build time. */
export const STEPS = [
  { id: "portfolio", label: "Properties" },
  { id: "managers", label: "Managers" },
  { id: "upload", label: "November packages" },
  { id: "mapping", label: "Review mapping" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];
