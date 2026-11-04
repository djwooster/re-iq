"use client";

import { useState } from "react";
import { PROPERTIES } from "./seed";
import { Page } from "./shell";
import { Card, Chart, StubTable, Tabs } from "./ui";

/** Module pages: labeled structure that shows what each holds. */

type Block = { table: string; columns: string[]; rows?: string[]; highlight?: number[]; note?: string } | { chart: string };
interface Module {
  title: string;
  tabs: { id: string; label: string; blocks: Block[] }[];
}

const PROPS = PROPERTIES.map((p) => p.name);
const MONTHS = ["Line", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "T-12"];
const LINES = ["Gross potential rent", "Vacancy", "Loss to lease", "Concessions", "Bad debt", "Other income", "Effective gross income", "Payroll", "Repairs & maintenance", "Utilities", "Net operating income"];

export const MODULES: Record<string, Module> = {
  financials: {
    title: "Financials",
    tabs: [
      { id: "t12", label: "T-12", blocks: [{ table: "T-12 · Property A", columns: MONTHS, rows: LINES }] },
      {
        id: "variance",
        label: "Budget variance",
        blocks: [{ table: "Budget variance · November", columns: ["Line", "Actual", "Budget", "$ variance", "% variance", "PM commentary"], rows: LINES, highlight: [3, 8], note: "Alert: ±5% and ±$2,500 · highlighted lines are over" }],
      },
      { id: "gl", label: "GL detail", blocks: [{ table: "GL detail · click any variance cell to land here", columns: ["Date", "Account", "Vendor", "Description", "Amount"], rows: ["Nov 3", "Nov 7", "Nov 12", "Nov 19", "Nov 26"] }] },
      { id: "balance", label: "Balance sheet", blocks: [{ table: "Balance sheet · November", columns: ["Account", "This month", "Last month", "Change"], rows: ["Operating cash", "Security deposits", "Receivables", "Prepaid rent", "Payables", "Accruals", "Reserves"] }] },
      { id: "cash", label: "Cash reconciliation", blocks: [{ table: "Cash reconciliation", columns: ["Property", "Beginning cash", "Receipts", "Disbursements", "Ending cash", "Bank balance", "Unreconciled"], rows: PROPS }] },
      { id: "ar", label: "AR aging", blocks: [{ table: "AR aging", columns: ["Property", "0–30", "31–60", "61–90", "90+", "Evictions in process"], rows: PROPS, highlight: [4] }] },
      { id: "ap", label: "AP aging", blocks: [{ table: "AP aging", columns: ["Vendor", "0–30", "31–60", "61–90", "90+", "Total open"], rows: ["HVAC vendor", "Landscaping vendor", "Paint vendor", "Utility provider", "Turn contractor"] }] },
      { id: "reforecast", label: "Reforecast", blocks: [{ chart: "Year-end projection vs. budget and underwriting" }, { table: "Reforecast · year end", columns: ["Property", "YTD actual", "Remaining forecast", "Year end", "Budget", "Underwriting"], rows: PROPS }] },
    ],
  },
  leasing: {
    title: "Leasing and revenue",
    tabs: [
      { id: "box", label: "Box score", blocks: [{ table: "Box score · by floor plan", columns: ["Floor plan", "Units", "Occupied", "Vacant", "Notice", "Pre-leased", "Leased %", "60-day exposure"], rows: ["1A", "1B", "2A", "2B", "3A"], note: "Target exposure under 8%" }] },
      { id: "funnel", label: "Leasing funnel", blocks: [{ chart: "Leads → tours → applications → approvals → move-ins" }, { table: "By source", columns: ["Source", "Leads", "Tours", "Applications", "Move-ins", "Closing ratio", "Cost per lease"], rows: ["Website", "ILS", "Referral", "Walk-in"] }] },
      { id: "rentroll", label: "Rent roll explorer", blocks: [{ table: "Rent roll · Property A", columns: ["Unit", "Floor plan", "Status", "Lease start", "Lease end", "Market rent", "Lease rent", "Renovated"], rows: ["101", "102", "103", "104", "105", "106"] }] },
      { id: "expirations", label: "Lease expiration heatmap", blocks: [{ chart: "Lease expiration heatmap · property × month, flag months over 10% of units" }] },
      { id: "ltl", label: "Loss to lease", blocks: [{ table: "Loss to lease", columns: ["Property", "Market rent", "In-place rent", "Loss to lease"], rows: PROPS, highlight: [6], note: "Flag if over 5%" }] },
      { id: "renewals", label: "Renewals", blocks: [{ table: "Renewals", columns: ["Property", "Offers sent", "Accepted", "Declined", "Renewal rate", "Avg increase"], rows: PROPS, note: "Target retention 50–60%" }] },
      { id: "tradeout", label: "Trade-out", blocks: [{ table: "Trade-out", columns: ["Property", "Classic trade-out", "Renovated trade-out", "Underwritten premium"], rows: PROPS, highlight: [1] }] },
      { id: "concessions", label: "Concessions", blocks: [{ table: "Concessions", columns: ["Property", "Type", "Units", "Amount", "Effective vs. face rent"], rows: PROPS }] },
      { id: "other", label: "Other income", blocks: [{ table: "Other income", columns: ["Stream", "Penetration", "Billed", "Collected"], rows: ["Utility billback (RUBS)", "Parking", "Pet", "Storage", "Fees", "Amenity"] }] },
    ],
  },
  operations: {
    title: "Operations",
    tabs: [
      { id: "makeready", label: "Make-ready board", blocks: [{ table: "Vacant units", columns: ["Unit", "Property", "Days vacant", "Ready", "Scheduled move-in", "Days to turn"], rows: ["Unit 102", "Unit 106", "Unit 201", "Unit 403"], note: "Target under 7–10 days classic" }] },
      { id: "wo", label: "Work orders", blocks: [{ table: "Work orders by category", columns: ["Category", "Open", "Completed", "Aged 7+ days", "Avg completion"], rows: ["HVAC", "Plumbing", "Appliance", "Electrical", "Roof"], highlight: [0] }] },
      { id: "delinquency", label: "Delinquency", blocks: [{ table: "Delinquency", columns: ["Property", "% of rent", "Collection rate", "Evictions"], rows: PROPS, highlight: [4], note: "Alert over 3% of rent · collections 97%+" }] },
      { id: "payroll", label: "Payroll", blocks: [{ table: "Payroll", columns: ["Property", "Positions", "Hours", "Overtime", "Payroll per unit", "vs. budget"], rows: PROPS }] },
      { id: "utilities", label: "Utilities", blocks: [{ chart: "Water, gas, electric per unit · spikes flag leaks" }] },
      { id: "inspections", label: "Inspections", blocks: [{ table: "Inspections and site visits", columns: ["Date", "Property", "Type", "Items for capex plan", "Photos"], rows: ["Oct 22", "Sep 14", "Aug 3"] }] },
    ],
  },
  capital: {
    title: "Capital and debt",
    tabs: [
      { id: "capex", label: "Capex budget vs. actual", blocks: [{ table: "Capex by project", columns: ["Project", "Budget", "Committed", "Spent", "Remaining", "% complete", "Funding source"], rows: ["HVAC replacement · A", "Interior upgrade · B", "Roof replacement · J"] }] },
      { id: "draws", label: "Lender draws", blocks: [{ table: "Draw schedule", columns: ["Draw", "Project", "Work completed", "Lien waivers", "Retainage", "Requested", "Status"], rows: ["Draw 1 · Roof", "Draw 2 · Roof"] }] },
      { id: "loans", label: "Loans", blocks: [{ table: "Loans", columns: ["Property", "Balance", "Rate", "DSCR", "Covenant cushion", "Debt yield", "LTV", "Maturity", "Rate cap expiry"], rows: PROPS, highlight: [5], note: "DSCR covenant 1.25x" }] },
      { id: "valuation", label: "Valuation / hold-sell", blocks: [{ table: "Hold vs. sell vs. refinance", columns: ["Property", "NOI", "Cap rate", "Value", "Hold IRR", "Sell IRR", "Refi proceeds"], rows: PROPS, highlight: [7] }] },
    ],
  },
};

export function ModulePage({ id }: { id: keyof typeof MODULES }) {
  const m = MODULES[id];
  const [tab, setTab] = useState(m.tabs[0].id);
  const t = m.tabs.find((x) => x.id === tab)!;
  return (
    <Page title={m.title} controls>
      <Tabs value={tab} onChange={setTab} tabs={m.tabs} />
      {t.blocks.map((b, i) =>
        "chart" in b ? (
          <Chart key={i} label={b.chart} className="min-h-56" />
        ) : (
          <Card key={i}>
            <StubTable label={b.table} columns={b.columns} rows={b.rows ?? PROPS} highlight={b.highlight} note={b.note} />
          </Card>
        ),
      )}
    </Page>
  );
}
