import type { PmsSystem } from "@/lib/types";
import { delay, isNewWorkspace, propertyRecords } from "./core";
import { dataSources } from "./mock/catalog";

export interface Connector {
  system: PmsSystem;
  name: string;
  description: string;
  availability: "available" | "beta" | "request_access" | "coming_soon";
  source: (typeof dataSources)[number] | null;
  property_names: string[];
}

const CONNECTORS: Omit<Connector, "source" | "property_names">[] = [
  { system: "resman", name: "ResMan", description: "Ledger, rent roll, delinquency, and work orders, synced nightly.", availability: "available" },
  { system: "rent_manager", name: "Rent Manager", description: "General ledger, unit and lease data, and service issues, synced nightly.", availability: "available" },
  { system: "yardi", name: "Yardi Voyager", description: "Available through Yardi's interface partner program. Upload Yardi reports in the meantime.", availability: "request_access" },
  { system: "appfolio", name: "AppFolio", description: "Read-only access to financials and rent roll.", availability: "coming_soon" },
  { system: "entrata", name: "Entrata", description: "Read-only access to financials, leases, and maintenance.", availability: "coming_soon" },
];

export async function listConnectors(orgId: string): Promise<Connector[]> {
  await delay();
  const records = propertyRecords();
  const fresh = isNewWorkspace();
  return CONNECTORS.map((c) => {
    const source = fresh ? null : (dataSources.find((s) => s.org_id === orgId && s.type === c.system) ?? null);
    return {
      ...c,
      source,
      property_names: source ? records.filter((r) => source.property_ids.includes(r.id)).map((r) => r.name) : [],
    };
  });
}

export async function listDataSources(orgId: string) {
  await delay();
  return dataSources.filter((s) => s.org_id === orgId && (!isNewWorkspace() || s.type === "upload"));
}
