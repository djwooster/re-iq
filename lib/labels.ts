import type { ActionStatus, GlCategory, ImportStatus, PmsSystem, ReportType, Role, SourceType, VarianceDriver } from "@/lib/types";

export const PRODUCT_NAME = "RE-IQ";

export const CATEGORY_LABELS: Record<GlCategory, string> = {
  gross_potential_rent: "Gross potential rent",
  loss_to_lease: "Loss to lease",
  vacancy_loss: "Vacancy loss",
  concessions: "Concessions",
  bad_debt: "Bad debt",
  other_income: "Other income",
  payroll: "Payroll",
  repairs_maintenance: "Repairs & maintenance",
  turnover: "Turnover",
  utilities: "Utilities",
  contract_services: "Contract services",
  marketing: "Marketing",
  administrative: "Administrative",
  management_fees: "Management fees",
  insurance: "Insurance",
  property_taxes: "Property taxes",
};

export const DRIVER_LABELS: Record<VarianceDriver, string> = {
  vacancy: "Vacancy",
  concessions: "Concessions",
  bad_debt: "Bad debt",
  repairs_maintenance: "R&M and turnover",
  utilities: "Utilities",
  payroll: "Payroll",
  contract_services: "Contract services",
  loss_to_lease: "Loss to lease",
  other: "All other",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  rent_roll: "Rent roll",
  t12: "T12 income statement",
  budget: "Budget",
  ar_aging: "AR aging",
  work_orders: "Work orders",
};

export const REPORT_TYPE_SHORT: Record<ReportType, string> = {
  rent_roll: "Rent roll",
  t12: "T12",
  budget: "Budget",
  ar_aging: "AR aging",
  work_orders: "Work orders",
};

export const SYSTEM_LABELS: Record<PmsSystem, string> = {
  yardi: "Yardi",
  resman: "ResMan",
  rent_manager: "Rent Manager",
  appfolio: "AppFolio",
  entrata: "Entrata",
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  upload: "Upload",
  ...SYSTEM_LABELS,
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  processed: "Processed",
  needs_review: "Needs review",
  failed: "Failed",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  new: "New",
  accepted: "Accepted",
  dismissed: "Dismissed",
  done: "Done",
};

export const ROLE_LABELS: Record<Role, string> = {
  asset_manager: "Asset Manager",
  owner: "Owner / Investor",
  executive: "Executive",
};
