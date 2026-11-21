/** The real setup's steps. A plain module, so the server page and the client frame both read it. */
export const SETUP_STEPS = [
  { id: "properties", label: "Properties and reports", title: "Add reports", hint: "" },
  { id: "managers", label: "Managers", title: "Who sends you these reports?", hint: "" },
  { id: "links", label: "Upload links", title: "Send each company its upload link", hint: "" },
  { id: "review", label: "Review", title: "Review what we read", hint: "Nothing counts toward your numbers until you confirm it." },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["id"];
