/** The real setup's steps. A plain module, so the server page and the client frame both read it. */
export const SETUP_STEPS = [
  { id: "properties", label: "Properties", title: "Add your properties", hint: "Add each property you own or manage. You can change these any time." },
  { id: "reports", label: "Reports", title: "Upload reports", hint: "Upload last month's reports for each property, or leave this to its property manager." },
  { id: "managers", label: "Property managers", title: "Invite property managers", hint: "Each manager gets a link to upload reports for the properties you choose." },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["id"];
