"use client";

import Link from "next/link";
import { useState } from "react";
import type { Company, Property } from "@/lib/workspace/queries";
import { Legend } from "./chart";
import { Page } from "./page";
import { Card, Kpi, Row, Segmented, Table, Td } from "./ui";

/**
 * The Overview, as validated in the prototype (tested with users): period controls, six portfolio
 * KPIs, NOI by month and the properties table. Figures fill in from confirmed reports; until a
 * figure has a source, it shows a dash and what it's waiting for.
 */

const PERIODS = ["Month", "YTD", "T-3", "T-12"] as const;
const COMPARES = ["Budget", "Prior year", "Underwriting"] as const;
type Period = (typeof PERIODS)[number];
type Compare = (typeof COMPARES)[number];

const DASH = <span className="text-fg-3">–</span>;
const waiting = (what: string) => <span className="text-fg-3">{what}</span>;

export function Overview({ date, month, range, properties, companies }: { date: string; month: string; range: string; properties: Property[]; companies: Company[] }) {
  const [period, setPeriod] = useState<Period>("Month");
  const [compare, setCompare] = useState<Compare>("Budget");
  const company = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <Page
      title="Overview"
      subtitle={date}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="" value={period} options={PERIODS} onChange={setPeriod} />
          <Segmented label="vs." value={compare} options={COMPARES} onChange={setCompare} />
        </div>
      }
    >
      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`NOI · ${period === "Month" ? month : period}`} value={DASH} sub={waiting("Waiting for confirmed P&Ls")} target="Alert below budget by 3%+" href="/app/financials" />
        <Kpi label="Physical occupancy" value={DASH} sub={waiting("Waiting for box scores")} target="Target 93–96%" href="/app/leasing" />
        <Kpi label="Economic occupancy" value={DASH} sub={waiting("Waiting for confirmed P&Ls")} target="Within 5 points of physical" href="/app/leasing" />
        <Kpi label="Leased %" value={DASH} sub={waiting("Waiting for box scores")} target="Exposure under 8%" href="/app/leasing" />
        <Kpi label="Collection rate" value={DASH} sub={waiting("Waiting for AR agings")} target="Target 97%+" href="/app/operations" />
        <Kpi label="DSCR · T-12" value={DASH} sub={waiting("Needs loan details")} target="Covenant 1.25x" href="/app/capital" />
      </section>

      <Card title="Portfolio NOI by month" action={<span className="num text-xs text-fg-3">{range}</span>}>
        <div className="flex flex-col gap-3">
          <Legend
            series={[
              { key: "actual", label: "Actual", style: "data" },
              { key: "plan", label: compare, style: "reference" },
            ]}
          />
          <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-border text-xs text-fg-3">NOI by month appears once T-12s or monthly P&Ls are confirmed.</div>
        </div>
      </Card>

      <Card
        title="Properties"
        flush
        action={
          <Link href="/app/properties" className="text-xs font-medium text-fg underline decoration-fg/20 underline-offset-[3px] transition-colors hover:decoration-fg/60">
            All properties
          </Link>
        }
      >
        <Table
          bare
          columns={[
            "Property",
            "Manager",
            "Status",
            { label: "Units", num: true },
            { label: "NOI", num: true },
            { label: `vs. ${compare}`, num: true },
            { label: "Occupancy", num: true },
            { label: "Leased", num: true },
            { label: "Collections", num: true },
            "Renovation",
            { label: "Exceptions", num: true },
            "Owner report",
          ]}
        >
          {properties.map((p) => (
            <Row key={p.id} href={`/app/properties/${p.id}`}>
              <Td className="font-medium whitespace-nowrap">{p.name}</Td>
              <Td className="whitespace-nowrap text-fg-2">{(p.management_company_id && company.get(p.management_company_id)) || DASH}</Td>
              <Td>{DASH}</Td>
              <Td num className="text-fg-2">
                {p.unit_count ?? DASH}
              </Td>
              <Td num>{DASH}</Td>
              <Td num>{DASH}</Td>
              <Td num>{DASH}</Td>
              <Td num>{DASH}</Td>
              <Td num>{DASH}</Td>
              <Td>{DASH}</Td>
              <Td num>{DASH}</Td>
              <Td>{DASH}</Td>
            </Row>
          ))}
        </Table>
      </Card>
    </Page>
  );
}
