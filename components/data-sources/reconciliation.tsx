"use client";

import { Check, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { RECON_CHECKS, type CheckState, type PropertyRecon, type ReconCheck } from "@/lib/data";

/** Every file checked against the others, with the numbers on both sides. */
export function Reconciliation({ recon }: { recon: PropertyRecon[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const all = recon.flatMap((r) => r.checks.map((c) => ({ property: r.property, check: c })));
  const count = (s: CheckState) => all.filter((x) => x.check.state === s).length;
  const breaks = all.filter((x) => x.check.state === "break");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-3">
        <span className="num text-fg">{count("pass")}</span> of {all.length} checks pass · <span className="num text-unfavorable">{count("break")}</span> breaks ·{" "}
        <span className="num text-fg-2">{count("waiting")}</span> waiting on reports
      </p>

      {breaks.length > 0 && (
        <Card>
          <CardHeader title="Breaks" description="Numbers that don't tie. Each shows both sides." />
          <ul className="border-t border-border">
            {breaks.map(({ property, check }) => (
              <li key={`${property.id}-${check.id}`} className="grid gap-2 border-b border-border/70 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <Link href={`/app/properties/${property.id}`} className="text-xs font-medium text-fg hover:underline">
                    {property.name}
                  </Link>
                  <div className="text-[11px] text-fg-2">{check.label}</div>
                  {check.note && <div className="mt-0.5 text-[11px] text-unfavorable">{check.note}</div>}
                </div>
                <Side side={check.left} />
                <Side side={check.right} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="All checks" description="Select a property to see both sides of every check." />
        <Table>
          <THead>
            <Th>Property</Th>
            {RECON_CHECKS.map((c) => (
              <Th key={c.id}>
                <span title={c.label}>{SHORT[c.id]}</span>
              </Th>
            ))}
          </THead>
          <tbody>
            {recon.map((r) => (
              <PropertyRows key={r.property.id} recon={r} open={open === r.property.id} onToggle={() => setOpen(open === r.property.id ? null : r.property.id)} />
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

const SHORT: Record<string, string> = {
  statement: "Statement",
  rent_roll: "Rent roll",
  ar: "AR aging",
  budget: "Budget",
  payroll: "Payroll",
  continuity: "Months",
};

function PropertyRows({ recon, open, onToggle }: { recon: PropertyRecon; open: boolean; onToggle: () => void }) {
  return (
    <>
      <Tr onClick={onToggle} selected={open}>
        <Td className="text-fg">{recon.property.name}</Td>
        {recon.checks.map((c) => (
          <Td key={c.id}>
            <StateMark state={c.state} />
          </Td>
        ))}
      </Tr>
      {open && (
        <tr className="border-b border-border/70 bg-fg/[0.02]">
          <td colSpan={RECON_CHECKS.length + 1} className="px-4 py-3">
            <ul className="flex flex-col gap-2">
              {recon.checks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function CheckRow({ check }: { check: ReconCheck }) {
  return (
    <li className="grid items-start gap-2 text-xs md:grid-cols-[18px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <StateMark state={check.state} />
      <div>
        <div className="text-fg">{check.label}</div>
        {check.note && <div className={cn("text-[11px]", check.state === "break" ? "text-unfavorable" : "text-fg-3")}>{check.note}</div>}
      </div>
      <Side side={check.left} />
      <Side side={check.right} />
    </li>
  );
}

function Side({ side }: { side: { label: string; value: string } }) {
  return (
    <div>
      <div className="text-[11px] text-fg-3">{side.label}</div>
      <div className="num text-xs text-fg">{side.value}</div>
    </div>
  );
}

function StateMark({ state }: { state: CheckState }) {
  if (state === "pass") return <Check className="size-3.5 text-favorable" aria-label="Pass" />;
  if (state === "break") return <X className="size-3.5 text-unfavorable" aria-label="Break" />;
  return <Clock className="size-3.5 text-fg-3" aria-label="Waiting" />;
}
