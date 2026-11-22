"use client";

import { CircleCheck, FileSpreadsheet, LineChart } from "lucide-react";
import { useState } from "react";
import type { Company, Property } from "@/lib/workspace/queries";
import { Legend } from "./chart";
import { AddReportsButton } from "./add-reports";
import { Page } from "./page";
import { Card, FilterMenu, Kpi, PropertyTd, Row, SpotEmpty, Table, Td, TextLink } from "./ui";

/**
 * The Overview, as validated in the prototype (tested with users): period controls, six portfolio
 * KPIs, NOI by month and the properties table. Figures fill in from confirmed reports; until a
 * figure has a source, it shows a dash.
 */

const PERIODS = ["Month", "YTD", "T-3", "T-12"] as const;
const PERIOD_LABEL: Record<(typeof PERIODS)[number], string> = { Month: "Month", YTD: "Year to date", "T-3": "Trailing 3 months", "T-12": "Trailing 12 months" };
const COMPARES = ["Budget", "Prior year", "Underwriting"] as const;
type Period = (typeof PERIODS)[number];
type Compare = (typeof COMPARES)[number];

const DASH = <span className="text-fg-3">–</span>;

export function Overview({ date, month, closing, properties, companies }: { date: string; month: string; closing: string; properties: Property[]; companies: Company[] }) {
  const [period, setPeriod] = useState<Period>("Month");
  const [compare, setCompare] = useState<Compare>("Budget");
  const company = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <Page
      title="Overview"
      subtitle={date}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu label="Period" value={period} options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} onChange={(v) => setPeriod(v as Period)} />
          <FilterMenu label="vs." value={compare} options={COMPARES.map((c) => ({ value: c, label: c }))} onChange={(v) => setCompare(v as Compare)} />
          <AddReportsButton properties={properties} period={closing} />
        </div>
      }
    >
      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`NOI · ${period === "Month" ? month : period}`} value={DASH} href="/app/financials" />
        <Kpi label="Physical occupancy" value={DASH} href="/app/leasing" />
        <Kpi label="Economic occupancy" value={DASH} href="/app/leasing" />
        <Kpi label="Leased %" value={DASH} href="/app/leasing" />
        <Kpi label="Collection rate" value={DASH} href="/app/operations" />
        <Kpi label="DSCR · T-12" value={DASH} href="/app/capital" />
      </section>

      <Card title="Portfolio NOI by month">
        <div className="flex flex-col gap-3">
          <Legend
            series={[
              { key: "actual", label: "Actual", style: "data" },
              { key: "plan", label: compare, style: "reference" },
            ]}
          />
          <SpotEmpty icons={[<FileSpreadsheet key="FileSpreadsheet" />, <CircleCheck key="CircleCheck" />, <LineChart key="LineChart" />]} title="No NOI data yet" action={<AddReportsButton properties={properties} period={closing} variant="secondary" />}>
            Add T-12s or monthly P&amp;Ls to chart NOI by month against {compare.toLowerCase()}.
          </SpotEmpty>
        </div>
      </Card>

      <Card
        title="Properties"
        flush
        action={
          <TextLink href="/app/properties">All properties</TextLink>
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
              <PropertyTd>{p.name}</PropertyTd>
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

