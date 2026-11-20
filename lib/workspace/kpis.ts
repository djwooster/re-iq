/**
 * The KPIs owners track and the owner chart of accounts, as validated in the prototype. Shared by
 * `/prototype` (re-exported from its seed) and `/app`, so the two can't drift apart.
 */

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
