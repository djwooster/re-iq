/** The real setup's steps. A plain module, so the server page and the client frame both read it. */
export const SETUP_STEPS = [
  { id: "properties", label: "Properties and reports", title: "Add reports", hint: "" },
  { id: "managers", label: "Property managers", title: "Invite property managers", hint: "Each manager gets a link to upload reports for the properties you choose." },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["id"];
