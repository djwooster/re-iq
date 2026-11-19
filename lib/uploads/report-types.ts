/**
 * What a property manager can upload, from Brian's "Reports & Decision Workflow" doc (sections 1–5),
 * grouped as he groups them, plus property photos and Other. Keys are stored on each upload.
 */
export const REPORT_GROUPS: { label: string; types: { key: string; label: string }[] }[] = [
  {
    label: "Core financial",
    types: [
      { key: "t12", label: "T-12 (trailing 12-month operating statement)" },
      { key: "income_statement", label: "Monthly P&L / income statement" },
      { key: "budget_variance", label: "Budget variance report" },
      { key: "reforecast", label: "Reforecast / year-end projection" },
      { key: "balance_sheet", label: "Balance sheet" },
      { key: "cash_reconciliation", label: "Cash flow statement / cash reconciliation" },
      { key: "general_ledger", label: "General ledger (GL) detail" },
      { key: "ar_aging", label: "AR aging / delinquency" },
      { key: "ap_aging", label: "AP aging / payables and check register" },
      { key: "annual_budget", label: "Annual operating budget" },
    ],
  },
  {
    label: "Revenue and leasing",
    types: [
      { key: "rent_roll", label: "Rent roll" },
      { key: "box_score", label: "Box score / occupancy and availability" },
      { key: "leasing_activity", label: "Leasing activity / traffic funnel" },
      { key: "lease_expirations", label: "Lease expiration schedule" },
      { key: "renewals", label: "Renewal / retention report" },
      { key: "trade_out", label: "New lease trade-out report" },
      { key: "concessions", label: "Concessions report" },
      { key: "other_income", label: "Other income report" },
    ],
  },
  {
    label: "Operations",
    types: [
      { key: "make_ready", label: "Unit status / make-ready report" },
      { key: "work_orders", label: "Work order report" },
      { key: "payroll", label: "Payroll / staffing report" },
      { key: "resident_satisfaction", label: "Resident satisfaction / online reputation" },
      { key: "inspection", label: "Property inspection / site visit report" },
      { key: "utilities", label: "Utility consumption report" },
      { key: "insurance_claims", label: "Insurance / claims and incident log" },
    ],
  },
  {
    label: "Capital and renovation",
    types: [
      { key: "capex", label: "CapEx budget vs. actual" },
      { key: "renovation_tracker", label: "Interior renovation tracker" },
      { key: "renovation_roi", label: "Renovation premium / ROI analysis" },
      { key: "classic_vs_renovated", label: "Classic vs. renovated comparison" },
      { key: "bid_leveling", label: "Bid leveling / scope comparison" },
      { key: "draw_request", label: "Draw schedule / lender draw request" },
      { key: "exterior_projects", label: "Exterior / common-area project tracker" },
      { key: "pca", label: "Property condition assessment / reserve study" },
    ],
  },
  {
    label: "Market and investment",
    types: [
      { key: "rent_comps", label: "Market survey / rent comps" },
      { key: "submarket", label: "Submarket report" },
      { key: "loan_covenants", label: "Debt / loan covenant report" },
      { key: "business_plan", label: "Business plan tracker" },
      { key: "investor_report", label: "Investor / owner quarterly report" },
      { key: "valuation", label: "Valuation / hold-sell analysis" },
    ],
  },
  {
    label: "Other",
    types: [
      { key: "photos", label: "Property photos" },
      { key: "other", label: "Other" },
    ],
  },
];

const LABELS = new Map(REPORT_GROUPS.flatMap((g) => g.types.map((t) => [t.key, t.label] as const)));

export const isReportType = (key: string) => LABELS.has(key);
export const reportTypeLabel = (key: string) => LABELS.get(key) ?? key;
