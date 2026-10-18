"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatMonth, LATEST_MONTH } from "@/lib/dates";
import type { DataHealthIssue, Import, PropertyRecord } from "@/lib/types";

/**
 * One quiet line when data is missing or stale, with the next step inline.
 * Renders nothing when everything is current.
 */
export function DataHealthNote({
  issues,
  properties,
  imports,
  onUpload,
}: {
  issues: DataHealthIssue[];
  properties: PropertyRecord[];
  imports: Import[];
  onUpload: () => void;
}) {
  const missing = issues.find((i) => i.id === "missing_latest_t12");
  if (!missing) return null;
  const month = formatMonth(LATEST_MONTH, "long").split(" ")[0];
  const items = missing.property_ids.map((id) => {
    const property = properties.find((p) => p.id === id)!;
    const latest = imports.find((i) => i.property_id === id && i.report_type === "t12" && i.period === LATEST_MONTH);
    return { property, latest };
  });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-warning/25 bg-warning/[0.06] px-3.5 py-2 text-xs">
      <AlertTriangle className="size-3.5 shrink-0 text-warning" strokeWidth={1.75} />
      <span className="text-fg">
        {items.length} {items.length === 1 ? "property is" : "properties are"} missing the {month} T12
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-2">
        {items.map(({ property, latest }) => (
          <span key={property.id} className="inline-flex items-center gap-1.5">
            <span className="text-fg-3">·</span>
            {property.name}
            {latest?.status === "needs_review" ? (
              <Link href={`/app/data-sources?import=${latest.id}`} className="font-medium text-fg underline decoration-fg/30 underline-offset-2 hover:decoration-fg">
                Review mapping
              </Link>
            ) : (
              <button type="button" onClick={onUpload} className="cursor-pointer font-medium text-fg underline decoration-fg/30 underline-offset-2 hover:decoration-fg">
                {latest?.status === "failed" ? "Re-upload" : "Upload"}
              </button>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}
