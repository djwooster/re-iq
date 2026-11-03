"use client";

import { Copy, ExternalLink } from "lucide-react";
import { Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import type { CloseTracker, TrackerCell } from "@/lib/data";
import { REPORT_TYPE_SHORT } from "@/lib/labels";

/** One row per property × report for the month's close, grouped by manager, with each manager's upload link. */
export function CloseTrackerView({ tracker }: { tracker: CloseTracker }) {
  const toast = useToast();
  const copy = async (path: string, name: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast(`Upload link for ${name} copied`);
    } catch {
      toast("Couldn't copy. Select the link and copy it instead.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-3">
        {formatMonth(tracker.month, "long")} reports, due {formatDate(tracker.due_date, true)}. Managers send them through their own upload link; no login needed.
      </p>
      {tracker.managers.map((m) => (
        <Card key={m.manager.id}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Dot tone={m.state === "complete" ? "favorable" : m.state === "late" ? "unfavorable" : "warning"} />
                <h3 className="text-[13px] font-semibold text-fg">{m.manager.name}</h3>
                <span className={cn("text-[11px]", m.state === "late" ? "text-unfavorable" : m.state === "partial" ? "text-warning" : "text-fg-3")}>{m.status}</span>
              </div>
              <p className="mt-0.5 pl-3.5 text-[11px] text-fg-3">
                {m.manager.contact_name} · {m.manager.contact_email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="num hidden max-w-[220px] truncate rounded border border-border bg-bg px-2 py-1 text-[10px] text-fg-3 lg:block">{m.upload_path}</code>
              <Button size="xs" icon={<Copy className="size-3" />} onClick={() => copy(m.upload_path, m.manager.name)}>
                Copy link
              </Button>
              <a
                href={m.upload_path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-[11px] font-medium text-fg-2 hover:bg-surface-2 hover:text-fg"
              >
                <ExternalLink className="size-3" /> Preview as manager
              </a>
            </div>
          </div>
          <Table>
            <THead>
              <Th>Property</Th>
              {tracker.report_types.map((t) => (
                <Th key={t}>{REPORT_TYPE_SHORT[t]}</Th>
              ))}
            </THead>
            <tbody>
              {m.properties.map((p) => (
                <Tr key={p.property.id}>
                  <Td className="text-fg">{p.property.name}</Td>
                  {p.cells.map((c) => (
                    <Td key={c.report_type}>
                      <Cell cell={c} />
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ))}
    </div>
  );
}

function Cell({ cell }: { cell: TrackerCell }) {
  if (cell.state === "received") return <span className="num text-[11px] text-fg-2">Received {formatDate(cell.received_at!.slice(0, 10))}</span>;
  if (cell.state === "late") return <span className="text-[11px] text-unfavorable">Late</span>;
  return <span className="text-[11px] font-medium text-warning">Missing</span>;
}
