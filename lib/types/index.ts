/**
 * Domain types. These mirror the future Supabase tables: snake_case columns,
 * string ids, ISO dates, and an `org_id` on every tenant-scoped record.
 */

export type ISODate = string; // "2026-09-30"
export type ISODateTime = string; // "2026-10-09T14:12:00Z"
export type MonthKey = string; // "2026-09"

export type Role = "asset_manager" | "owner" | "executive";
export type PropertyClass = "A" | "B" | "C";

export type SourceType =
  | "upload"
  | "resman"
  | "rent_manager"
  | "yardi"
  | "appfolio"
  | "entrata";

/** Systems a property manager runs. Uploads can come from any of them. */
export type PmsSystem = "yardi" | "resman" | "rent_manager" | "appfolio" | "entrata";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: ISODateTime;
}

export interface Member {
  id: string;
  org_id: string;
  name: string;
  email: string;
  title: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "invited";
  initials: string;
}

export interface PropertyManager {
  id: string;
  org_id: string;
  name: string;
  system: PmsSystem;
}

export interface Property {
  id: string;
  org_id: string;
  name: string;
  short_name: string;
  market: string;
  city: string;
  state: string;
  class: PropertyClass;
  units: number;
  year_built: number;
  property_manager_id: string;
  /** Data sources that feed this property's numbers. */
  data_source_ids: string[];
  /** Annual debt service, used for owner cash-flow estimates. */
  annual_debt_service: number;
}

/** Property with its derived freshness, as returned by the data layer. */
export interface PropertyRecord extends Property {
  property_manager: PropertyManager;
  primary_source: DataSource;
  data_through: ISODate;
}

export interface Unit {
  id: string;
  org_id: string;
  property_id: string;
  unit_number: string;
  floorplan: string;
  bedrooms: number;
  sqft: number;
  market_rent: number;
  status: "occupied" | "vacant";
}

/** Lease-level only. No resident personal details are stored. */
export interface Lease {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string;
  start_date: ISODate;
  end_date: ISODate;
  rent: number;
  status: "current" | "notice";
}

export type RevenueCategory =
  | "gross_potential_rent"
  | "loss_to_lease"
  | "vacancy_loss"
  | "concessions"
  | "bad_debt"
  | "other_income";

export type ExpenseCategory =
  | "payroll"
  | "repairs_maintenance"
  | "turnover"
  | "utilities"
  | "contract_services"
  | "marketing"
  | "administrative"
  | "management_fees"
  | "insurance"
  | "property_taxes";

export type GlCategory = RevenueCategory | ExpenseCategory;

/** One normalized GL line for one property-month. Contra-revenue is negative. */
export interface LedgerLine {
  org_id: string;
  property_id: string;
  month: MonthKey;
  category: GlCategory;
  amount: number;
}

export type BudgetLine = LedgerLine;
export type ActualLine = LedgerLine & { import_id: string | null; data_source_id: string };

/** Month-end operating stats that are not GL lines. */
export interface OccupancySnapshot {
  org_id: string;
  property_id: string;
  month: MonthKey;
  occupied_units: number;
  budget_occupied_units: number;
  delinquent_balance: number;
  billed_charges: number;
}

export type WorkOrderCategory =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "appliance"
  | "make_ready"
  | "grounds"
  | "pest"
  | "general";

export interface WorkOrder {
  id: string;
  number: string;
  org_id: string;
  property_id: string;
  unit_number: string | null;
  category: WorkOrderCategory;
  description: string;
  priority: "low" | "normal" | "high" | "emergency";
  status: "open" | "in_progress" | "on_hold" | "completed";
  opened_at: ISODate;
  completed_at: ISODate | null;
  vendor_id: string | null;
  cost: number | null;
  repeat: boolean;
}

export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  category: string;
  gl_category: ExpenseCategory;
  /** Share of the property's GL category actuals that flows to this vendor. */
  share: number;
  property_ids: string[];
  /** Benchmark annual spend per unit, for vendors we benchmark. */
  benchmark_per_unit: number | null;
}

export interface VendorSpend {
  vendor: Vendor;
  property_id: string | null;
  spend_t12: number;
  per_unit: number;
  benchmark_per_unit: number | null;
}

export type DataSourceStatus = "connected" | "syncing" | "error" | "active" | "not_connected";

export interface DataSource {
  id: string;
  org_id: string;
  type: SourceType;
  name: string;
  status: DataSourceStatus;
  last_sync_at: ISODateTime | null;
  records_synced: number | null;
  property_ids: string[];
}

export type ReportType = "rent_roll" | "t12" | "budget" | "ar_aging" | "work_orders";
export type ImportStatus = "processed" | "needs_review" | "failed";
export type FileFormat = "xlsx" | "csv" | "pdf";

export interface Import {
  id: string;
  org_id: string;
  data_source_id: string;
  file_name: string;
  file_format: FileFormat;
  file_size: number;
  report_type: ReportType;
  /** E.g. "yardi" when the file looks like a Yardi export. */
  detected_source_format: PmsSystem | null;
  property_id: string;
  /** Last month covered by the report. */
  period: MonthKey;
  status: ImportStatus;
  status_detail: string | null;
  uploaded_by: string;
  uploaded_at: ISODateTime;
  processed_at: ISODateTime | null;
  row_count: number;
}

export type MappingTarget = GlCategory | `field:${string}` | "ignore";

export interface AccountMapping {
  id: string;
  org_id: string;
  import_id: string;
  source_label: string;
  source_code: string | null;
  amount: number | null;
  target: MappingTarget;
  confidence: number;
  confirmed_by_user: boolean;
}

export type InsightType = "issue" | "opportunity";
export type VarianceDriver =
  | "vacancy"
  | "concessions"
  | "bad_debt"
  | "repairs_maintenance"
  | "utilities"
  | "payroll"
  | "contract_services"
  | "loss_to_lease"
  | "other";

export interface EvidenceItem {
  label: string;
  value: string;
  detail?: string;
}

/** A sentence of AI-written copy and the numbers behind it. */
export interface SummarySentence {
  text: string;
  evidence: EvidenceItem[];
  sources: EvidenceSource[];
  insight_id?: string;
  is_estimate?: boolean;
}

export interface EvidenceSource {
  kind: "import" | "connector";
  id: string;
  label: string;
  detail: string;
}

export interface Insight {
  id: string;
  org_id: string;
  type: InsightType;
  property_id: string | null;
  title: string;
  /** One sentence for rollups such as the executive summary. */
  summary: string;
  diagnosis: string;
  drivers: VarianceDriver[];
  /** Positive dollars: money lost (issue) or available (opportunity). */
  impact: number;
  impact_label: string;
  is_estimate: boolean;
  confidence: "high" | "medium" | "low";
  severity: number;
  evidence: EvidenceItem[];
  sources: EvidenceSource[];
  data_through: ISODate;
  recommended_action: string;
}

export type ActionStatus = "new" | "accepted" | "dismissed" | "done";

export interface Action {
  id: string;
  org_id: string;
  insight_id: string;
  property_id: string | null;
  title: string;
  detail: string;
  estimated_impact: number;
  status: ActionStatus;
  assignee_id: string | null;
  due_date: ISODate | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type Period = "mtd" | "qtd" | "ytd" | "t12";

/** Aggregated P&L for a property or the portfolio over a period. */
export interface PeriodFinancials {
  period: Period;
  months: MonthKey[];
  revenue: { actual: number; budget: number };
  expenses: { actual: number; budget: number };
  noi: { actual: number; budget: number };
  gpr: { actual: number; budget: number };
  byCategory: Record<GlCategory, { actual: number; budget: number }>;
}

export interface OccupancyMetrics {
  physical: number;
  physical_budget: number;
  economic: number;
  economic_budget: number;
  delinquency: number;
  delinquent_balance: number;
}

export interface DriverVariance {
  driver: VarianceDriver;
  /** NOI impact in dollars: positive is favorable. */
  variance: number;
}

export interface PortfolioSummary {
  org_id: string;
  period: Period;
  period_label: string;
  data_through: ISODate;
  financials: PeriodFinancials;
  occupancy: OccupancyMetrics;
  drivers: DriverVariance[];
  properties: PropertyPerformance[];
  /** Properties whose data stops before the portfolio's latest month. */
  lagging_property_ids: string[];
  units: number;
}

export interface PropertyPerformance {
  property: PropertyRecord;
  financials: PeriodFinancials;
  occupancy: OccupancyMetrics;
  drivers: DriverVariance[];
  /** Months in the period that have no actuals yet. */
  missing_months: MonthKey[];
}

export interface DataHealthIssue {
  id: string;
  severity: "warning" | "info";
  message: string;
  property_ids: string[];
  import_id: string | null;
}

export interface Session {
  member_id: string;
  org_id: string;
}
