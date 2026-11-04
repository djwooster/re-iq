/**
 * The story behind wireframe v2: it's December 14 and November's close is
 * partly done. Generic names only, no numbers. Values render as gray bars;
 * statuses, dates, targets and thresholds are real text.
 */

export const TODAY = "2026-12-14";
export const CLOSE_MONTH = "November";
export const ORG = "Owner firm (sample)";
export const ME = "You";

export const MANAGERS = [
  { id: "m1", name: "Manager 1", contact: "Regional manager · reports@manager1.com", token: "m1-7f3k2q" },
  { id: "m2", name: "Manager 2", contact: "Regional manager · reports@manager2.com", token: "m2-m82xva" },
  { id: "m3", name: "Manager 3", contact: "Regional manager · reports@manager3.com", token: "m3-q4c9tw" },
  { id: "m4", name: "Manager 4", contact: "Regional manager · reports@manager4.com", token: "m4-h6p1rz" },
] as const;

export type ManagerId = (typeof MANAGERS)[number]["id"];
export type Rag = "red" | "amber" | "green";

export interface Property {
  id: string;
  name: string;
  manager: ManagerId;
  rag: Rag;
}

const P = (letter: string, manager: ManagerId, rag: Rag): Property => ({ id: letter.toLowerCase(), name: `Property ${letter}`, manager, rag });

export const PROPERTIES: Property[] = [
  P("A", "m1", "amber"),
  P("B", "m1", "amber"),
  P("C", "m1", "amber"),
  P("D", "m2", "red"),
  P("E", "m2", "red"),
  P("F", "m2", "red"),
  P("G", "m3", "amber"),
  P("H", "m3", "green"),
  P("I", "m3", "amber"),
  P("J", "m2", "green"),
  P("K", "m4", "amber"),
  P("L", "m1", "green"),
];

export const property = (id: string) => PROPERTIES.find((p) => p.id === id);
export const manager = (id: string) => MANAGERS.find((m) => m.id === id)!;
export const managerOf = (propertyId: string) => manager(property(propertyId)!.manager);

// ---- Close: the package each manager sends ----

export const PACKAGE = ["P&L", "T-12", "Rent roll", "Box score", "AR aging", "Capex", "Renovation tracker", "GL"] as const;
export const REPORT_DUE = "2026-12-12";

/** When each manager's package arrived. Null: nothing yet. */
export const RECEIVED: Record<ManagerId, string | null> = { m1: "2026-12-09", m2: "2026-12-11", m3: "2026-12-12", m4: null };
/** Reports missing from a package that otherwise arrived. */
export const MISSING: Record<string, string[]> = { i: ["AR aging"] };

export const RECON_CHECKS = ["Rent roll ties to P&L", "Cash ties to bank", "GL mapped to owner's chart of accounts", "Totals match the manager's statements"] as const;
export type CheckState = "Pass" | "Break" | "Waiting";

export interface FileRow {
  id: string;
  manager: ManagerId;
  name: string;
  by: string;
  when: string;
  version: string;
}

export const FILES: FileRow[] = [
  { id: "f1", manager: "m1", name: "November package · Properties A, B, C, L", by: "Manager 1 · upload link", when: "Dec 9, 2026 · 4:12 PM", version: "v1" },
  { id: "f2", manager: "m2", name: "November package · Properties D, E, F, J", by: "Manager 2 · upload link", when: "Dec 11, 2026 · 10:03 AM", version: "v1" },
  { id: "f3", manager: "m2", name: "Rent roll · Property E (corrected)", by: "Manager 2 · upload link", when: "Dec 11, 2026 · 2:47 PM", version: "v2" },
  { id: "f4", manager: "m3", name: "November package · Properties G, H, I", by: "Manager 3 · email", when: "Dec 12, 2026 · 6:30 PM", version: "v1" },
  { id: "f5", manager: "m1", name: "October package · Properties A, B, C, L", by: "Manager 1 · upload link", when: "Nov 10, 2026 · 9:15 AM", version: "v1" },
];

/** Manager 3's GL: their labels mapped to the owner's chart. Uncertain lines first. */
export interface MappingLine {
  id: string;
  label: string;
  account: string;
  sure: boolean;
}

export const MAPPING_FILE = "Manager 3 · GL · November";
export const MAPPING: MappingLine[] = [
  { id: "ml1", label: "Contract Labor - Maint", account: "Repairs & maintenance", sure: false },
  { id: "ml2", label: "Resident Svcs Misc", account: "Marketing", sure: false },
  { id: "ml3", label: "Util Reimb - RUBS", account: "Other income", sure: false },
  { id: "ml4", label: "Gross Potential Rent", account: "Gross potential rent", sure: true },
  { id: "ml5", label: "Vacancy Loss", account: "Vacancy", sure: true },
  { id: "ml6", label: "Concessions - New Lease", account: "Concessions", sure: true },
  { id: "ml7", label: "Payroll - Onsite", account: "Payroll", sure: true },
  { id: "ml8", label: "Water/Sewer", account: "Utilities", sure: true },
];

export const CHART_OF_ACCOUNTS = [
  "Gross potential rent",
  "Vacancy",
  "Loss to lease",
  "Concessions",
  "Bad debt",
  "Other income",
  "Payroll",
  "Repairs & maintenance",
  "Turnover",
  "Utilities",
  "Marketing",
  "Administrative",
  "Management fee",
  "Insurance",
  "Property taxes",
];

// ---- Exceptions ----

export const STAGES = ["new", "diagnosing", "waiting", "decide", "assigned", "closed"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  diagnosing: "Diagnosing",
  waiting: "Waiting on PM",
  decide: "Decide",
  assigned: "Assigned",
  closed: "Closed",
};

export interface LogEntry {
  date: string;
  who: string;
  text: string;
}

export interface DrillLevel {
  kind: "KPI" | "Report" | "Line item" | "GL transactions" | "Units";
  label: string;
  /** Rows shown at this level: GL transactions or units. */
  rows?: string[];
}

export interface Question {
  text: string;
  sent: string;
  due: string;
  reply?: { text: string; file?: string; received: string };
}

export interface Exception {
  id: string;
  property: string;
  trigger: string;
  source: string;
  threshold: string;
  stage: Stage;
  opened: string;
  cause: string;
  typical: string;
  drill: DrillLevel[];
  nature?: "One-time" | "Ongoing";
  question?: Question;
  action?: string;
  projectId?: string;
  log: LogEntry[];
}

export const ACTIONS = [
  "Adjust pricing or concessions",
  "Shift marketing spend",
  "Collections plan or tighter screening",
  "Raise renewal offers toward market",
  "Rebid vendors or add turn crews",
  "Staffing changes",
  "Start a capital project",
  "Re-price or re-scope the renovation tier",
  "Reforecast",
  "Cash management or rate cap",
  "Refinance or sell",
];

export const TEAM = ["You", "Analyst", "Owner"] as const;

const RE_IQ = "RE-IQ";

export const EXCEPTIONS: Exception[] = [
  {
    id: "d-exposure",
    property: "d",
    trigger: "60-day exposure over 8%",
    source: "Box score",
    threshold: "Exposure under 8%",
    stage: "new",
    opened: "2026-12-12",
    cause: "Pricing above comps, weak funnel, reputation",
    typical: "Adjust pricing or concessions",
    drill: [
      { kind: "KPI", label: "60-day exposure" },
      { kind: "Report", label: "Box score · Week of Dec 7", rows: ["Floor plan 1A", "Floor plan 1B", "Floor plan 2A", "Floor plan 2B · Notice to vacate"] },
      { kind: "Line item", label: "Floor plan 2B · Notice to vacate" },
      { kind: "Units", label: "Units on notice", rows: ["Unit 204", "Unit 206", "Unit 305", "Unit 307"] },
    ],
    log: [{ date: "2026-12-12", who: RE_IQ, text: "Flagged from Box score: 60-day exposure over 8%" }],
  },
  {
    id: "f-dscr",
    property: "f",
    trigger: "DSCR nearing covenant",
    source: "Loan report",
    threshold: "DSCR covenant 1.25x",
    stage: "new",
    opened: "2026-12-11",
    cause: "NOI drop, rate reset",
    typical: "Cash management or rate cap",
    drill: [
      { kind: "KPI", label: "DSCR" },
      { kind: "Report", label: "Loan report · November", rows: ["Net operating income", "Principal", "Interest expense", "Reserve deposits"] },
      { kind: "Line item", label: "Interest expense" },
      { kind: "GL transactions", label: "Interest expense · GL detail", rows: ["Lender · November interest", "Lender · Rate reset adjustment", "Lender · October interest"] },
    ],
    log: [{ date: "2026-12-11", who: RE_IQ, text: "Flagged from Loan report: DSCR within the cushion set for the 1.25x covenant" }],
  },
  {
    id: "h-ahead",
    property: "h",
    trigger: "NOI ahead of plan in a strong market",
    source: "Valuation",
    threshold: "Alert: NOI more than 5% ahead of budget",
    stage: "new",
    opened: "2026-12-13",
    cause: "Value created early",
    typical: "Refinance or sell",
    drill: [
      { kind: "KPI", label: "NOI vs. budget" },
      { kind: "Report", label: "P&L · November", rows: ["Gross potential rent", "Vacancy", "Effective gross income", "Operating expenses"] },
      { kind: "Line item", label: "Effective gross income" },
      { kind: "GL transactions", label: "Rental income · GL detail", rows: ["Rent roll posting · November", "Renewal increases · November", "Other income · November"] },
    ],
    log: [{ date: "2026-12-13", who: RE_IQ, text: "Flagged from Valuation: NOI ahead of plan" }],
  },
  {
    id: "b-tradeout",
    property: "b",
    trigger: "Renovated trade-out below underwriting",
    source: "Trade-out report",
    threshold: "Premium within 10% of underwriting",
    stage: "diagnosing",
    opened: "2026-12-09",
    cause: "Premium set too high or finishes miss the market",
    typical: "Re-price or re-scope the renovation tier",
    projectId: "b-interior",
    drill: [
      { kind: "KPI", label: "Trade-out % · renovated units" },
      { kind: "Report", label: "Trade-out report · November", rows: ["Classic · new leases", "Classic · renewals", "Renovated tier · new leases", "Renovated tier · renewals"] },
      { kind: "Line item", label: "Renovated tier · new leases" },
      { kind: "Units", label: "Renovated units leased in November", rows: ["Unit 204", "Unit 207", "Unit 302"] },
    ],
    log: [
      { date: "2026-12-09", who: RE_IQ, text: "Flagged from Trade-out report: renovated premium below underwriting" },
      { date: "2026-12-10", who: ME, text: "Started diagnosing" },
    ],
  },
  {
    id: "e-delinquency",
    property: "e",
    trigger: "Delinquency over 3% of rent",
    source: "AR aging",
    threshold: "Delinquency under 3% of rent",
    stage: "waiting",
    opened: "2026-12-02",
    cause: "Collections process, screening",
    typical: "Collections plan or tighter screening",
    nature: "Ongoing",
    drill: [
      { kind: "KPI", label: "Delinquency % of rent" },
      { kind: "Report", label: "AR aging · Dec 1", rows: ["0–30 days", "31–60 days", "61–90 days", "90+ days"] },
      { kind: "Line item", label: "61–90 days" },
      { kind: "Units", label: "Units 61–90 days past due", rows: ["Unit 108", "Unit 203", "Unit 305"] },
    ],
    question: {
      text: "Delinquency is over 3% of rent for the second month. Which units are 61–90 days past due, what is the collections plan, and are any headed to eviction?",
      sent: "2026-12-03",
      due: "2026-12-10",
    },
    log: [
      { date: "2026-12-02", who: RE_IQ, text: "Flagged from AR aging: delinquency over 3% of rent" },
      { date: "2026-12-03", who: ME, text: "Diagnosed: ongoing, concentrated in the 61–90 day bucket" },
      { date: "2026-12-03", who: ME, text: "Asked Manager 2 · due Dec 10" },
      { date: "2026-12-11", who: RE_IQ, text: "Question overdue" },
    ],
  },
  {
    id: "k-turn",
    property: "k",
    trigger: "Days to turn rising",
    source: "Make-ready",
    threshold: "Under 7–10 days classic",
    stage: "waiting",
    opened: "2026-12-08",
    cause: "Vendor or staff capacity",
    typical: "Rebid vendors or add turn crews",
    nature: "Ongoing",
    drill: [
      { kind: "KPI", label: "Days to turn" },
      { kind: "Report", label: "Make-ready · Week of Dec 7", rows: ["Vacant, ready", "Vacant, not ready", "Down units", "Scheduled move-ins"] },
      { kind: "Line item", label: "Vacant, not ready" },
      { kind: "Units", label: "Vacant units not ready", rows: ["Unit 102", "Unit 106", "Unit 201", "Unit 403"] },
    ],
    question: {
      text: "Days to turn has gone up three weeks in a row. Is this the paint vendor, staffing, or parts? What would it take to get back under 10 days?",
      sent: "2026-12-11",
      due: "2026-12-18",
    },
    log: [
      { date: "2026-12-08", who: RE_IQ, text: "Flagged from Make-ready: days to turn rising" },
      { date: "2026-12-10", who: ME, text: "Diagnosed: ongoing" },
      { date: "2026-12-11", who: ME, text: "Asked Manager 4 · due Dec 18" },
    ],
  },
  {
    id: "g-ltl",
    property: "g",
    trigger: "Loss to lease over 5%",
    source: "Rent roll",
    threshold: "Flag if over 5%",
    stage: "assigned",
    opened: "2026-11-14",
    cause: "Renewals priced too low",
    typical: "Raise renewal offers toward market",
    nature: "Ongoing",
    action: "Raise renewal offers toward market",
    drill: [
      { kind: "KPI", label: "Loss to lease" },
      { kind: "Report", label: "Rent roll · October", rows: ["New leases · in-place vs. market", "Renewals · in-place vs. market", "Month-to-month", "Model and down units"] },
      { kind: "Line item", label: "Renewals · in-place vs. market" },
      { kind: "Units", label: "Renewals below market", rows: ["Unit 103", "Unit 108", "Unit 208", "Unit 302"] },
    ],
    question: {
      text: "Loss to lease is over 5%. How are renewal offers being set, and why are they below market?",
      sent: "2026-11-15",
      due: "2026-11-22",
      reply: { text: "Renewals have been capped at a flat increase since spring. We can move offers to market less a retention discount starting with January expirations.", received: "2026-11-20" },
    },
    log: [
      { date: "2026-11-14", who: RE_IQ, text: "Flagged from Rent roll: loss to lease over 5%" },
      { date: "2026-11-15", who: ME, text: "Asked Manager 3 · due Nov 22" },
      { date: "2026-11-20", who: ME, text: "Recorded reply from Manager 3" },
      { date: "2026-12-01", who: ME, text: "Decided: Raise renewal offers toward market" },
      { date: "2026-12-01", who: ME, text: "Assigned to Manager 3 · due Jan 15" },
    ],
  },
  {
    id: "a-repairs",
    property: "a",
    trigger: "Repairs over budget 3 months running",
    source: "Budget variance, work orders",
    threshold: "Alert: ±5% and ±$2,500",
    stage: "assigned",
    opened: "2026-11-12",
    cause: "Aging building systems",
    typical: "Start a capital project",
    nature: "Ongoing",
    action: "Start a capital project",
    projectId: "a-hvac",
    drill: [
      { kind: "KPI", label: "Repairs & maintenance vs. budget" },
      { kind: "Report", label: "Budget variance · October", rows: ["Payroll", "HVAC repairs", "Plumbing repairs", "Turnover"] },
      { kind: "Line item", label: "HVAC repairs" },
      { kind: "GL transactions", label: "HVAC repairs · GL detail", rows: ["HVAC vendor · Building 2 rooftop unit", "HVAC vendor · Building 2 compressor", "HVAC vendor · Building 3 rooftop unit", "HVAC vendor · Emergency call"] },
    ],
    question: {
      text: "HVAC repairs have been over budget for three months. Are these the same units, and is the vendor recommending repair or replacement?",
      sent: "2026-11-13",
      due: "2026-11-20",
      reply: {
        text: "Most calls are the rooftop units on Buildings 2 and 3, which are original to the property. The vendor recommends replacement over another season of repairs. Their bid is attached.",
        file: "Rooftop unit replacement bid.pdf",
        received: "2026-11-18",
      },
    },
    log: [
      { date: "2026-11-12", who: RE_IQ, text: "Flagged from Budget variance: repairs over budget 3 months running" },
      { date: "2026-11-12", who: ME, text: "Diagnosed: ongoing, HVAC repairs on Buildings 2 and 3" },
      { date: "2026-11-13", who: ME, text: "Asked Manager 1 · due Nov 20" },
      { date: "2026-11-18", who: ME, text: "Recorded reply from Manager 1 · Rooftop unit replacement bid.pdf" },
      { date: "2026-11-20", who: ME, text: "Decided: Start a capital project" },
      { date: "2026-11-20", who: ME, text: "Created project: HVAC replacement · assigned to You · due Jan 8" },
    ],
  },
];

// ---- Tasks and approvals ----

export type TaskStatus = "Open" | "In progress" | "Done";

export interface Task {
  id: string;
  title: string;
  property: string;
  owner: string;
  due: string;
  status: TaskStatus;
  exceptionId?: string;
  projectId?: string;
}

export const TASKS: Task[] = [
  { id: "t1", title: "Underwrite HVAC replacement for Gate A", property: "a", owner: "You", due: "2027-01-08", status: "In progress", exceptionId: "a-repairs", projectId: "a-hvac" },
  { id: "t2", title: "Raise renewal offers toward market", property: "g", owner: "Manager 3", due: "2027-01-15", status: "Open", exceptionId: "g-ltl" },
];

export type ApprovalKind = "Budget" | "Change order" | "Lender draw";

export interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  property: string;
  from: string;
  submitted: string;
  status: "Waiting" | "Approved" | "Declined";
  projectId?: string;
}

export const APPROVALS: Approval[] = [
  { id: "ap1", kind: "Budget", title: "2027 operating budget", property: "d", from: "Manager 2", submitted: "2026-12-10", status: "Waiting" },
  { id: "ap2", kind: "Budget", title: "2027 operating budget", property: "a", from: "Manager 1", submitted: "2026-12-08", status: "Waiting" },
  { id: "ap3", kind: "Change order", title: "Change order 3 · Roof replacement", property: "j", from: "Manager 2", submitted: "2026-12-12", status: "Waiting", projectId: "j-roof" },
  { id: "ap4", kind: "Lender draw", title: "Draw 2 · Roof replacement", property: "j", from: "Manager 2", submitted: "2026-12-11", status: "Waiting", projectId: "j-roof" },
];

// ---- Renovations ----

export type ProjectType = "Interior" | "Exterior";
export type ProjectStatus = "Active" | "Paused" | "Stopped" | "Dropped" | "Complete";

export interface Project {
  id: string;
  property: string;
  name: string;
  type: ProjectType;
  step: number;
  status: ProjectStatus;
  exceptionId?: string;
  triggers: string[];
  log: LogEntry[];
}

export const STEP_NAMES = ["Find the opportunity", "Scope and underwrite", "Bid and award", "Pilot", "Scale / execute", "Measure and decide"];
export const stepName = (type: ProjectType, step: number) => (type === "Exterior" && step === 4 ? "Sequence and notify" : step === 5 && type === "Exterior" ? "Execute" : STEP_NAMES[step - 1]);

export const PROJECTS: Project[] = [
  {
    id: "a-hvac",
    property: "a",
    name: "HVAC replacement",
    type: "Exterior",
    step: 2,
    status: "Active",
    exceptionId: "a-repairs",
    triggers: ["Linked exception", "Repeat work orders", "Inspection"],
    log: [
      { date: "2026-11-20", who: ME, text: "Created from exception: Repairs over budget 3 months running" },
      { date: "2026-12-01", who: ME, text: "Opportunity confirmed: rooftop units, Buildings 2 and 3" },
      { date: "2026-12-04", who: "Manager 1", text: "Contractor pricing received for scope" },
    ],
  },
  {
    id: "b-interior",
    property: "b",
    name: "Interior upgrade",
    type: "Interior",
    step: 4,
    status: "Active",
    exceptionId: "b-tradeout",
    triggers: ["Loss to lease", "Rent comps"],
    log: [
      { date: "2026-06-02", who: ME, text: "Opportunity: classic units leasing well below renovated comps" },
      { date: "2026-07-15", who: ME, text: "Gate A approved: return on cost clears the 15% hurdle" },
      { date: "2026-08-20", who: ME, text: "Awarded to Contractor 2" },
      { date: "2026-09-08", who: "Manager 1", text: "Pilot started: 8 units" },
      { date: "2026-12-09", who: RE_IQ, text: "Pilot premium below underwriting · see exception" },
    ],
  },
  {
    id: "j-roof",
    property: "j",
    name: "Roof replacement",
    type: "Exterior",
    step: 5,
    status: "Active",
    triggers: ["Inspection", "Property condition assessment"],
    log: [
      { date: "2026-04-10", who: ME, text: "Opportunity: roofs at end of useful life in the condition assessment" },
      { date: "2026-05-02", who: ME, text: "Gate A approved: budget and funding from reserves" },
      { date: "2026-06-12", who: ME, text: "Awarded to Contractor 1" },
      { date: "2026-08-01", who: "Manager 2", text: "Resident notices sent for Buildings 1–2" },
      { date: "2026-09-15", who: "Manager 2", text: "Work started" },
      { date: "2026-12-12", who: "Manager 2", text: "Submitted Change order 3 and Draw 2" },
    ],
  },
];

// ---- Decision log ----

export interface Decision {
  date: string;
  property: string;
  decision: string;
  who: string;
  why: string;
  exceptionId?: string;
  projectId?: string;
}

export const DECISIONS: Decision[] = [
  { date: "2026-12-01", property: "g", decision: "Raise renewal offers toward market", who: ME, why: "Renewals capped at a flat increase; manager will move offers to market less a retention discount", exceptionId: "g-ltl" },
  { date: "2026-11-20", property: "a", decision: "Start a capital project: HVAC replacement", who: ME, why: "Repeat repairs on original rooftop units; vendor recommends replacement", exceptionId: "a-repairs", projectId: "a-hvac" },
  { date: "2026-08-20", property: "b", decision: "Award interior upgrade to Contractor 2", who: ME, why: "Lowest leveled bid with full scope", projectId: "b-interior" },
  { date: "2026-07-15", property: "b", decision: "Gate A approved: Interior upgrade", who: ME, why: "Return on cost clears the 15% hurdle", projectId: "b-interior" },
  { date: "2026-06-12", property: "j", decision: "Award roof replacement to Contractor 1", who: ME, why: "Best schedule before winter; complete scope", projectId: "j-roof" },
  { date: "2026-05-02", property: "j", decision: "Gate A approved: Roof replacement", who: "Owner", why: "End of useful life; funded from reserves", projectId: "j-roof" },
];

// ---- Thresholds (Brian's KPI table) ----

export const KPIS = [
  { kpi: "Net operating income", formula: "Effective gross income − Operating expenses", source: "P&L, T-12", target: "Alert if below budget by more than 3%" },
  { kpi: "Effective gross income", formula: "GPR − Vacancy − Loss to lease − Concessions − Bad debt + Other income", source: "P&L", target: "Trend up month over month" },
  { kpi: "Physical occupancy", formula: "Occupied units ÷ Total units", source: "Box score", target: "93–96%" },
  { kpi: "Economic occupancy", formula: "Rent collected ÷ Gross potential rent", source: "P&L, rent roll", target: "Within 5 points of physical" },
  { kpi: "Leased % / 60-day exposure", formula: "(Vacant + Notice − Pre-leased) ÷ Total units", source: "Box score", target: "Exposure under 8%" },
  { kpi: "Loss to lease", formula: "(Market rent − In-place rent) ÷ Market rent", source: "Rent roll", target: "Flag if over 5%" },
  { kpi: "Collection rate", formula: "Collected ÷ Billed", source: "AR aging", target: "97%+" },
  { kpi: "Bad debt %", formula: "Write-offs ÷ Gross potential rent", source: "P&L", target: "Under 1–2%" },
  { kpi: "Expense ratio", formula: "Operating expenses ÷ EGI", source: "P&L", target: "Market dependent; trend matters" },
  { kpi: "Cost per unit", formula: "Expense ÷ Units (annualized)", source: "T-12", target: "Compare to portfolio and market" },
  { kpi: "Retention rate", formula: "Renewals ÷ Expiring leases", source: "Renewal report", target: "50–60%" },
  { kpi: "Days to turn", formula: "Move-out date to ready date", source: "Make-ready", target: "Under 7–10 days classic" },
  { kpi: "Trade-out %", formula: "(New rent − Prior rent) ÷ Prior rent", source: "Trade-out report", target: "Positive; matches renovation premium" },
  { kpi: "DSCR", formula: "NOI ÷ Annual debt service", source: "Loan report", target: "Above covenant (1.25x)" },
  { kpi: "Renovation return on cost", formula: "(Monthly premium × 12) ÷ Cost per unit", source: "Renovation ROI", target: "15%+" },
  { kpi: "Payback period", formula: "Cost per unit ÷ Monthly premium", source: "Renovation ROI", target: "Under 5–6 years" },
  { kpi: "Value created", formula: "(Added NOI ÷ Cap rate) − Capex spent", source: "Valuation", target: "Positive and on plan" },
];

/** The scorecard: the KPIs that apply to one property in a month. */
export const SCORECARD = KPIS.slice(0, 14);

// ---- Units ----

export type UnitStatus = "Classic" | "In renovation" | "Renovated vacant" | "Renovated leased";
export const UNIT_STATUSES: UnitStatus[] = ["Classic", "In renovation", "Renovated vacant", "Renovated leased"];

export const FLOORS = [4, 3, 2, 1];
export const UNITS_PER_FLOOR = 8;
export const unitNumbers = () => FLOORS.flatMap((f) => Array.from({ length: UNITS_PER_FLOOR }, (_, i) => `${f}${String(i + 1).padStart(2, "0")}`));

/** A stable status per unit. Property B is mid-program; the rest are mostly classic. */
export function unitStatus(propertyId: string, unit: string): UnitStatus {
  const n = [...`${propertyId}${unit}`].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) % 100;
  if (propertyId === "b") return n < 30 ? "Classic" : n < 50 ? "In renovation" : n < 62 ? "Renovated vacant" : "Renovated leased";
  return n < 94 ? "Classic" : n < 97 ? "Renovated leased" : "In renovation";
}

export const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const fmtLongDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
