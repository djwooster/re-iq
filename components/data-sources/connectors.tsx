"use client";

import { Plug } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/dates";
import type { Connector } from "@/lib/data";
import { formatNumber, joinList } from "@/lib/format";

const AVAILABILITY: Record<Connector["availability"], { label: string; tone: "neutral" | "muted" | "data" }> = {
  available: { label: "Available", tone: "neutral" },
  beta: { label: "Beta", tone: "data" },
  request_access: { label: "Partner program", tone: "muted" },
  coming_soon: { label: "Coming soon", tone: "muted" },
};

export function Connectors({ connectors }: { connectors: Connector[] }) {
  const [active, setActive] = useState<Connector | null>(null);
  const toast = useToast();
  const [requested, setRequested] = useState<string[]>([]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connectors.map((c) => {
          const connected = c.source?.status === "connected";
          return (
            <Card key={c.system} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded border border-border bg-bg text-fg-3">
                    <Plug className="size-3" strokeWidth={1.75} />
                  </span>
                  <span className="text-[13px] font-semibold text-fg">{c.name}</span>
                </div>
                {connected ? (
                  <Badge tone="favorable" dot>
                    Connected
                  </Badge>
                ) : (
                  <Badge tone={AVAILABILITY[c.availability].tone}>{AVAILABILITY[c.availability].label}</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-fg-2">{c.description}</p>
              {connected && c.source && (
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
                  <div>
                    <dt className="text-fg-3">Last sync</dt>
                    <dd className="num text-fg" title={formatDateTime(c.source.last_sync_at!)}>
                      {formatRelative(c.source.last_sync_at!)}, {formatDateTime(c.source.last_sync_at!).split(", ")[1]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-3">Records</dt>
                    <dd className="num text-fg">{formatNumber(c.source.records_synced ?? 0)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-fg-3">Properties</dt>
                    <dd className="text-fg">{joinList(c.property_names)}</dd>
                  </div>
                </dl>
              )}
              <div className="mt-auto pt-4">
                {connected ? (
                  <Button size="xs" onClick={() => setActive(c)}>
                    Manage
                  </Button>
                ) : c.availability === "available" || c.availability === "request_access" ? (
                  <Button size="xs" onClick={() => setActive(c)}>
                    {c.availability === "request_access" ? "Request access" : "Connect"}
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={requested.includes(c.system)}
                    onClick={() => {
                      setRequested((r) => [...r, c.system]);
                      toast(`We'll let you know when ${c.name} is ready`);
                    }}
                  >
                    {requested.includes(c.system) ? "You'll be notified" : "Notify me"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.source ? `${active.name} connection` : `Connect ${active?.name ?? ""}`}
        description={
          active?.source
            ? "Connection settings, sync schedule, and property mapping will live here."
            : active?.availability === "request_access"
              ? "Yardi connections go through Yardi's interface partner program, which needs a qualifying customer. Tell us which properties you'd connect and we'll start the request."
              : "Direct connections are being set up with early customers. Uploads already work for every property in the meantime."
        }
        footer={
          <Button variant="primary" onClick={() => setActive(null)}>
            Got it
          </Button>
        }
      >
        <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[11px] text-fg-3">
          Not available in this preview. Nothing is connected or changed.
        </p>
      </Modal>
    </>
  );
}
