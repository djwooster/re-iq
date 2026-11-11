"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Bars, TrendChart } from "./chart";
import { evidence } from "./evidence";
import { fmt, noiVs } from "./metrics";
import { DELINQUENT, EXPENSE_LINES, FLOOR_PLANS, LAST, MONTHS, MONTH_LONG, REVENUE_LINES, debt, kpis, month, periodTotal, profile, reported, unit, unitNumbers, type Line } from "./numbers";
import { PROJECT_BUDGET } from "./renovations";
import { PROPERTIES, property } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Card, Chip, Delta, Row, Select, Table, Tabs, Td, type Column } from "./ui";

/** Module pages: the reports behind the KPIs, one tab per report. */

type Cell = React.ReactNode;
interface TableRow {
  key: string;
  cells: Cell[];
  highlight?: boolean;
  href?: string;
}

function DataTable({ title, note, columns, rows, action }: { title: string; note?: string; columns: Column[]; rows: TableRow[]; action?: React.ReactNode }) {
  return (
    <Card
      title={title}
      action={
        <span className="flex items-center gap-3">
          {note && <span className="text-[11px] text-fg-3">{note}</span>}
          {action}
        </span>
      }
    >
      <Table columns={columns}>
        {rows.map((r) => (
          <Row key={r.key} highlight={r.highlight} href={r.href}>
            {r.cells.map((c, i) => {
              const col = columns[i];
              const num = typeof col !== "string" && col.num;
              return (
                <Td key={i} num={num} className={i === 0 ? "font-medium whitespace-nowrap" : !num ? "text-fg-2" : undefined}>
                  {c}
                </Td>
              );
            })}
          </Row>
        ))}
      </Table>
    </Card>
  );
}

const N = (label: string): Column => ({ label, num: true });
const ids = () => PROPERTIES.map((p) => p.id);
const notIn = <span className="text-fg-3">Not received</span>;

function PropertyPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="w-44">
      <Select label="Property" value={property(value)!.name} onChange={(name) => onChange(PROPERTIES.find((p) => p.name === name)!.id)} options={PROPERTIES.map((p) => p.name)} />
    </div>
  );
}

const wig = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 10007;
  return h / 10007;
};

// ---- Financials ----

function T12({ id }: { id: string }) {
  const months = MONTHS.map((_, m) => m).filter((m) => reported(id, m));
  const t = periodTotal(id, "T-12")!;
  const lines: (Line | "Effective gross income" | "Operating expenses" | "Net operating income")[] = [...REVENUE_LINES, "Effective gross income", ...EXPENSE_LINES, "Operating expenses", "Net operating income"];
  const val = (m: ReturnType<typeof month>, l: (typeof lines)[number]) => (l === "Effective gross income" ? m.egi : l === "Operating expenses" ? m.opex : l === "Net operating income" ? m.noi : m.lines[l]);
  return (
    <DataTable
      title={`T-12 · ${property(id)!.name}`}
      note={`${MONTH_LONG[months[0]]} – ${MONTH_LONG[months.at(-1)!]}`}
      columns={["Line", ...months.map((m) => N(MONTHS[m])), N("T-12")]}
      rows={lines.map((l) => ({
        key: l,
        cells: [<span key="l" className={cn(!["Effective gross income", "Operating expenses", "Net operating income"].includes(l) && "font-normal text-fg-2")}>{l}</span>, ...months.map((m) => fmt.usd(val(month(id, m), l))), <span key="t" className="font-medium">{fmt.usd(val(t, l))}</span>],
      }))}
    />
  );
}

const COMMENTARY: Record<string, Partial<Record<Line, string>>> = {
  a: { "Repairs & maintenance": "HVAC calls, Buildings 2 and 3" },
  e: { "Bad debt": "Write-offs on three move-outs" },
  h: { Vacancy: "Ahead of plan on lease-up" },
  k: { Turnover: "Turn vendor backlog" },
};

function Variance({ id }: { id: string }) {
  const m = profile(id).through;
  const a = month(id, m);
  const b = month(id, m, "Budget");
  const lines = [...REVENUE_LINES, ...EXPENSE_LINES];
  return (
    <DataTable
      title={`Budget variance · ${property(id)!.name} · ${MONTH_LONG[m]}`}
      note="Highlighted: over ±5% and ±$2,500"
      columns={["Line", N("Actual"), N("Budget"), N("$ variance"), N("% variance"), "PM commentary"]}
      rows={[
        ...lines.map((l) => {
          const expense = (EXPENSE_LINES as readonly string[]).includes(l);
          const v = a.lines[l] - b.lines[l];
          const pct = b.lines[l] ? v / Math.abs(b.lines[l]) : 0;
          return {
            key: l,
            highlight: Math.abs(pct) > 0.05 && Math.abs(v) > 2_500,
            cells: [<span key="l" className="font-normal text-fg-2">{l}</span>, fmt.usd(a.lines[l]), <span key="b" className="text-fg-3">{fmt.usd(b.lines[l])}</span>, <Delta key="v" value={v} format={fmt.delta} good={expense ? "down" : "up"} />, <Delta key="p" value={pct} format={fmt.signedPct} good={expense ? "down" : "up"} />, COMMENTARY[id]?.[l] ?? <span className="text-fg-3">None</span>],
          };
        }),
        { key: "noi", cells: ["Net operating income", fmt.usd(a.noi), <span key="b" className="text-fg-3">{fmt.usd(b.noi)}</span>, <Delta key="v" value={a.noi - b.noi} format={fmt.delta} />, <Delta key="p" value={a.noi / b.noi - 1} format={fmt.signedPct} />, ""] },
      ]}
    />
  );
}

const VENDORS = ["HVAC vendor", "Plumbing vendor", "Landscaping vendor", "Paint vendor", "Turn contractor", "Utility provider", "Pest control", "Appliance parts"];

function Gl({ id }: { id: string }) {
  const rows = Array.from({ length: 10 }, (_, i) => {
    const v = VENDORS[Math.floor(wig(`${id}-v-${i}`) * VENDORS.length)];
    const account: Line = v === "Utility provider" ? "Utilities" : v === "Turn contractor" || v === "Paint vendor" ? "Turnover" : "Repairs & maintenance";
    return { day: 2 + i * 3, v, account, amount: Math.round(300 + wig(`${id}-a-${i}`) * (id === "a" && v === "HVAC vendor" ? 2600 : 1400)) };
  });
  return (
    <DataTable
      title={`GL detail · ${property(id)!.name} · ${MONTH_LONG[profile(id).through]}`}
      note="Operating expenses"
      columns={["Date", "Account", "Vendor", "Description", N("Amount")]}
      rows={rows.map((r, i) => ({ key: String(i), cells: [<span key="d" className="num text-[11px] font-normal text-fg-2">{`${MONTHS[profile(id).through]} ${r.day}`}</span>, r.account, r.v, `Invoice INV-${5200 + i * 17}`, fmt.usd(r.amount)] }))}
    />
  );
}

function Balance({ id }: { id: string }) {
  const u = profile(id).units;
  const noi = month(id, LAST).noi;
  const rows: [string, number, number][] = [
    ["Operating cash", noi * 1.4, noi * 1.25],
    ["Security deposits", u * 520, u * 515],
    ["Receivables", u * 64, u * 58],
    ["Prepaid rent", -u * 41, -u * 44],
    ["Payables", -u * 96, -u * 88],
    ["Accruals", -u * 38, -u * 36],
    ["Replacement reserves", u * 900, u * 875],
  ];
  return (
    <DataTable
      title={`Balance sheet · ${property(id)!.name}`}
      columns={["Account", N(MONTHS[LAST]), N(MONTHS[LAST - 1]), N("Change")]}
      rows={rows.map(([l, a, b]) => ({ key: l, cells: [<span key="l" className="font-normal text-fg-2">{l}</span>, fmt.usd(a), <span key="b" className="text-fg-3">{fmt.usd(b)}</span>, <Delta key="c" value={a - b} format={fmt.delta} />] }))}
    />
  );
}

function Cash() {
  return (
    <DataTable
      title={`Cash reconciliation · ${MONTH_LONG[LAST]}`}
      columns={["Property", N("Beginning cash"), N("Receipts"), N("Disbursements"), N("Ending cash"), N("Bank balance"), N("Unreconciled")]}
      rows={ids().map((id) => {
        if (!reported(id, LAST)) return { key: id, cells: [property(id)!.name, notIn, "", "", "", "", ""] };
        const m = month(id, LAST);
        const begin = m.noi * 1.25;
        const receipts = m.egi * 0.985;
        const out = m.opex + debt(id).service / 12;
        const end = begin + receipts - out;
        return { key: id, href: href.property(id), cells: [property(id)!.name, fmt.usd(begin), fmt.usd(receipts), fmt.usd(out), fmt.usd(end), fmt.usd(end), <span key="u" className="text-fg-3">$0</span>] };
      })}
    />
  );
}

function arBuckets(id: string) {
  const l = month(id, LAST).lines;
  const billed = l["Gross potential rent"] + l.Vacancy + l["Loss to lease"] + l.Concessions;
  if (id === "e") {
    const r = evidence("e-delinquency").report;
    return { billed, buckets: r.map((x) => x.actual ?? 0) };
  }
  const late = kpis(id).delinquency ?? 0;
  return { billed, buckets: [billed * 0.031, billed * late * 0.55, billed * late * 0.3, billed * late * 0.15] };
}

function Ar() {
  return (
    <DataTable
      title={`AR aging · ${MONTH_LONG[LAST]} 30`}
      note="Delinquency: over 30 days ÷ billed rent. Alert over 3%"
      columns={["Property", N("0–30"), N("31–60"), N("61–90"), N("90+"), N("Delinquency"), N("Evictions in process")]}
      rows={ids().map((id) => {
        if (!reported(id, LAST) || profile(id).missing?.includes("AR aging")) return { key: id, cells: [property(id)!.name, notIn, "", "", "", "", ""] };
        const { billed, buckets } = arBuckets(id);
        const d = (buckets[1] + buckets[2] + buckets[3]) / billed;
        return { key: id, highlight: d > 0.03, href: href.property(id), cells: [property(id)!.name, ...buckets.map((b) => fmt.usd(b)), <span key="d" className={d > 0.03 ? "text-unfavorable" : undefined}>{fmt.pct(d)}</span>, "0"] };
      })}
    />
  );
}

function Ap() {
  return (
    <DataTable
      title="AP aging · portfolio"
      columns={["Vendor", N("0–30"), N("31–60"), N("61–90"), N("90+"), N("Total open")]}
      rows={VENDORS.slice(0, 6).map((v, i) => {
        const b = [18_000 + wig(v) * 22_000, wig(`${v}2`) * 6_000, i === 0 ? 4_850 : 0, 0];
        return { key: v, highlight: b[2] > 0, cells: [v, ...b.map((x) => fmt.usd(x)), fmt.usd(b.reduce((s, x) => s + x, 0))] };
      })}
    />
  );
}

/** Year-to-date NOI, January on; months not yet reported count at budget. */
function cumulative(all: string[]) {
  const sum = (m: number, pick: (id: string) => number) => all.reduce((s, id) => s + pick(id), 0);
  const out: { month: string; actual: number; budget: number; underwriting: number }[] = [];
  for (let m = 1; m < MONTHS.length; m++) {
    const prev = out.at(-1) ?? { actual: 0, budget: 0, underwriting: 0 };
    out.push({
      month: MONTHS[m],
      actual: prev.actual + sum(m, (id) => month(id, m, reported(id, m) ? "Actual" : "Budget").noi),
      budget: prev.budget + sum(m, (id) => month(id, m, "Budget").noi),
      underwriting: prev.underwriting + sum(m, (id) => month(id, m, "Underwriting").noi),
    });
  }
  return out;
}

function Reforecast() {
  const { state } = useWf();
  const all = ids();
  const data = cumulative(all);
  const dec = (id: string, b: "Actual" | "Budget" | "Underwriting") => month(id, LAST, b === "Actual" ? "Budget" : b).noi * (b === "Actual" ? 1 + (noiVs(id, "T-3", "Budget")?.pct ?? 0) : 1.004);
  return (
    <>
      <Card title={`Year-end NOI · cumulative, ${state.org}`}>
        <TrendChart
          data={data}
          series={[
            { key: "actual", label: "Actual", style: "data" },
            { key: "budget", label: "Budget", style: "reference" },
            { key: "underwriting", label: "Underwriting", style: "muted" },
          ]}
          format={fmt.usd}
          axisFormat={fmt.usdShort}
        />
      </Card>
      <DataTable
        title="Reforecast · year end 2026"
        note="December forecast: budget adjusted by the last three months' variance"
        columns={["Property", N("YTD actual"), N("December forecast"), N("Year end"), N("Budget"), N("Underwriting")]}
        rows={all.map((id) => {
          const ytd = periodTotal(id, "YTD")!.noi;
          const f = dec(id, "Actual");
          const budget = periodTotal(id, "YTD", "Budget")!.noi + dec(id, "Budget");
          const uw = periodTotal(id, "YTD", "Underwriting")!.noi + dec(id, "Underwriting");
          return { key: id, href: href.property(id), cells: [property(id)!.name, fmt.usd(ytd), fmt.usd(f), <span key="y" className="font-medium">{fmt.usd(ytd + f)}</span>, <Delta key="b" value={ytd + f - budget} format={fmt.delta} />, <Delta key="u" value={ytd + f - uw} format={fmt.delta} />] };
        })}
      />
    </>
  );
}

// ---- Leasing ----

function BoxScore({ id }: { id: string }) {
  const us = unitNumbers(id).map((u) => unit(id, u));
  const ex = profile(id).exposure;
  return (
    <DataTable
      title={`Box score · ${property(id)!.name} · week of Dec 7`}
      note="Target exposure under 8%"
      columns={["Floor plan", N("Units"), N("Occupied"), N("Vacant"), N("Notice"), N("Pre-leased"), N("Leased %"), N("60-day exposure")]}
      rows={FLOOR_PLANS.map((fp) => {
        const g = us.filter((u) => u.plan.name === fp.name);
        const vacant = g.filter((u) => u.occupancy.startsWith("Vacant")).length;
        const notice = Math.max(g.filter((u) => u.occupancy === "Notice to vacate").length, Math.round(g.length * ex * 0.6));
        const pre = Math.round((vacant + notice) * 0.45);
        const exposure = (vacant + notice - pre) / g.length;
        return {
          key: fp.name,
          highlight: exposure > 0.08,
          cells: [
            <span key="f" className="font-medium">
              {fp.name} <span className="font-normal text-fg-3">· {fp.beds}</span>
            </span>,
            g.length,
            g.length - vacant,
            vacant,
            notice,
            pre,
            fmt.pct((g.length - vacant + pre) / g.length),
            <span key="e" className={exposure > 0.08 ? "text-unfavorable" : undefined}>
              {fmt.pct(exposure)}
            </span>,
          ].map((c) => (typeof c === "number" ? String(c) : c)),
        };
      })}
    />
  );
}

const SOURCES = [
  { s: "Website", leads: 412, tours: 118, apps: 46, ins: 31, cost: 0 },
  { s: "ILS", leads: 638, tours: 141, apps: 52, ins: 33, cost: 14_200 },
  { s: "Referral", leads: 54, tours: 31, apps: 18, ins: 14, cost: 3_500 },
  { s: "Walk-in", leads: 77, tours: 62, apps: 21, ins: 15, cost: 0 },
];

function Funnel() {
  const t = SOURCES.reduce((a, x) => ({ leads: a.leads + x.leads, tours: a.tours + x.tours, apps: a.apps + x.apps, ins: a.ins + x.ins }), { leads: 0, tours: 0, apps: 0, ins: 0 });
  return (
    <>
      <Card title={`Leasing funnel · portfolio · ${MONTH_LONG[LAST]}`}>
        <Bars
          data={[
            { label: "Leads", value: t.leads },
            { label: "Tours", value: t.tours },
            { label: "Applications", value: t.apps },
            { label: "Approvals", value: Math.round(t.apps * 0.81) },
            { label: "Move-ins", value: t.ins },
          ]}
          format={fmt.int}
        />
      </Card>
      <DataTable
        title="By source"
        columns={["Source", N("Leads"), N("Tours"), N("Applications"), N("Move-ins"), N("Closing ratio"), N("Cost per lease")]}
        rows={SOURCES.map((x) => ({ key: x.s, cells: [x.s, fmt.int(x.leads), fmt.int(x.tours), fmt.int(x.apps), fmt.int(x.ins), fmt.pct(x.ins / x.tours), x.cost ? fmt.usd(x.cost / x.ins) : <span key="c" className="text-fg-3">$0</span>] }))}
      />
    </>
  );
}

function RentRoll({ id }: { id: string }) {
  const [all, setAll] = useState(false);
  const us = unitNumbers(id)
    .map((u) => unit(id, u))
    .sort((a, b) => a.num.localeCompare(b.num, "en", { numeric: true }));
  const shown = all ? us : us.slice(0, 24);
  return (
    <DataTable
      title={`Rent roll · ${property(id)!.name}`}
      note={`${shown.length} of ${us.length} units`}
      action={
        <button type="button" onClick={() => setAll((v) => !v)} className="text-[11px] font-medium text-fg underline decoration-fg/20 underline-offset-[3px] hover:decoration-fg/60">
          {all ? "Show fewer" : "Show all"}
        </button>
      }
      columns={["Unit", "Floor plan", "Status", "Lease start", "Lease end", N("Market rent"), N("Lease rent"), N("Balance")]}
      rows={shown.map((u) => ({
        key: u.num,
        href: href.unit(id, u.num),
        cells: [`Unit ${u.num}`, u.plan.name, u.occupancy, u.leaseStart?.slice(0, 7) ?? "–", u.leaseEnd?.slice(0, 7) ?? "–", fmt.usd(u.market), u.leaseRent === null ? <span key="v" className="text-fg-3">Vacant</span> : fmt.usd(u.leaseRent), u.balance ? <span key="b" className={u.balance > 1000 ? "text-unfavorable" : undefined}>{fmt.usd(u.balance)}</span> : <span key="b" className="text-fg-3">$0</span>],
      }))}
    />
  );
}

const NEXT12 = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function Expirations() {
  return (
    <Card title="Lease expirations · next 12 months" action={<span className="text-[11px] text-fg-3">Outlined: over 10% of units in one month</span>}>
      <Table columns={["Property", ...NEXT12.map((m) => N(m))]}>
        {ids().map((id) => {
          const us = unitNumbers(id).map((u) => unit(id, u));
          const counts = NEXT12.map((_, i) => us.filter((u) => u.leaseEnd && Number(u.leaseEnd.slice(5, 7)) === ((i + 11) % 12) + 1).length);
          const max = Math.max(...counts);
          return (
            <Row key={id} href={href.property(id)}>
              <Td className="font-medium whitespace-nowrap">{property(id)!.name}</Td>
              {counts.map((c, i) => {
                const hot = c / us.length > 0.1;
                return (
                  <Td key={i} num className="!px-1">
                    <span className={cn("num block rounded px-1.5 py-1 text-right", hot && "ring-1 ring-unfavorable ring-inset")} style={{ background: `color-mix(in srgb, var(--data) ${Math.round((c / max) * 45)}%, transparent)` }}>
                      {c}
                    </span>
                  </Td>
                );
              })}
            </Row>
          );
        })}
      </Table>
    </Card>
  );
}

function Ltl() {
  return (
    <DataTable
      title={`Loss to lease · ${MONTH_LONG[LAST]}`}
      note="Flag if over 5%"
      columns={["Property", N("Avg market rent"), N("Avg in-place rent"), N("Loss to lease"), N("Monthly")]}
      rows={ids().map((id) => {
        const k = kpis(id);
        const mkt = profile(id).rent;
        const gpr = month(id, profile(id).through).lines["Gross potential rent"];
        return { key: id, highlight: k.ltl > 0.05, href: href.property(id), cells: [property(id)!.name, fmt.usd(mkt), fmt.usd(mkt * (1 - k.ltl)), <span key="l" className={k.ltl > 0.05 ? "text-unfavorable" : undefined}>{fmt.pct(k.ltl)}</span>, fmt.usd(gpr * k.ltl)] };
      })}
    />
  );
}

function Renewals() {
  return (
    <DataTable
      title={`Renewals · ${MONTH_LONG[LAST]} expirations`}
      note="Target retention 50–60%"
      columns={["Property", N("Offers sent"), N("Accepted"), N("Declined"), N("Renewal rate"), N("Avg increase")]}
      rows={ids().map((id) => {
        const offers = Math.round(profile(id).units * 0.075);
        const acc = Math.round(offers * kpis(id).retention);
        return { key: id, href: href.property(id), cells: [property(id)!.name, offers, acc, offers - acc, fmt.pct(acc / offers), fmt.signedPct(id === "g" ? 0.019 : 0.031 + wig(id) * 0.012)].map((c) => (typeof c === "number" ? String(c) : c)) as Cell[] };
      })}
    />
  );
}

function TradeOut() {
  return (
    <DataTable
      title={`Trade-out · ${MONTH_LONG[LAST]}`}
      columns={["Property", N("Classic trade-out"), N("Renovated premium"), N("Underwritten premium")]}
      rows={ids().map((id) => ({
        key: id,
        highlight: id === "b",
        href: href.property(id),
        cells: [property(id)!.name, fmt.signedPct(kpis(id).tradeOut), id === "b" ? <span key="r" className="text-unfavorable">$142/mo</span> : <span key="r" className="text-fg-3">No program</span>, id === "b" ? "$185/mo" : <span key="u" className="text-fg-3">–</span>],
      }))}
    />
  );
}

function Concessions() {
  return (
    <DataTable
      title={`Concessions · ${MONTH_LONG[LAST]}`}
      columns={["Property", "Type", N("Leases"), N("Amount"), N("Effective vs. face rent")]}
      rows={ids().map((id) => {
        const c = -month(id, profile(id).through).lines.Concessions;
        const leases = Math.max(1, Math.round(c / 750));
        return { key: id, href: href.property(id), cells: [property(id)!.name, profile(id).conc > 0.008 ? "Two weeks free" : "One week free", String(leases), fmt.usd(c), fmt.signedPct(-(c / leases) / 12 / profile(id).rent)] };
      })}
    />
  );
}

function OtherIncome() {
  const total = ids().reduce((s, id) => s + month(id, profile(id).through).lines["Other income"], 0);
  const streams: [string, number, number][] = [
    ["Utility billback (RUBS)", 0.41, 0.93],
    ["Parking", 0.17, 0.62],
    ["Pet", 0.14, 0.38],
    ["Storage", 0.07, 0.21],
    ["Fees", 0.15, 1],
    ["Amenity", 0.06, 0.12],
  ];
  return (
    <DataTable
      title={`Other income · portfolio · ${MONTH_LONG[LAST]}`}
      columns={["Stream", N("Penetration"), N("Billed"), N("Collected")]}
      rows={streams.map(([s, share, pen]) => ({ key: s, cells: [s, fmt.pct(pen), fmt.usd(total * share * 1.02), fmt.usd(total * share)] }))}
    />
  );
}

// ---- Operations ----

function MakeReady() {
  const vacant = ids().flatMap((id) =>
    unitNumbers(id)
      .map((u) => unit(id, u))
      .filter((u) => u.occupancy.startsWith("Vacant"))
      .slice(0, id === "k" ? 6 : 2)
      .map((u) => ({ id, u, days: Math.round((u.occupancy === "Vacant, not ready" ? 14 : 3) + wig(`${id}${u.num}`) * 9) })),
  );
  return (
    <DataTable
      title="Vacant units"
      note="Target under 7–10 days classic"
      columns={["Unit", "Property", "Status", N("Days vacant"), "Scheduled move-in"]}
      rows={vacant
        .sort((a, b) => b.days - a.days)
        .map(({ id, u, days }) => ({
          key: id + u.num,
          highlight: days > 10,
          href: href.unit(id, u.num),
          cells: [`Unit ${u.num}`, property(id)!.name, u.occupancy, <span key="d" className={days > 10 ? "text-unfavorable" : undefined}>{days}</span>, days > 10 ? <span key="m" className="text-fg-3">None</span> : `Dec ${16 + (days % 12)}`],
        }))}
    />
  );
}

function WorkOrders() {
  const rows: [string, number, number, number, number][] = [
    ["HVAC", 23, 64, 7, 3.8],
    ["Plumbing", 14, 81, 2, 1.9],
    ["Appliance", 11, 58, 3, 2.6],
    ["Electrical", 6, 29, 1, 1.4],
    ["Roof", 3, 6, 2, 6.2],
  ];
  return (
    <DataTable
      title={`Work orders by category · ${MONTH_LONG[LAST]}`}
      columns={["Category", N("Open"), N("Completed"), N("Aged 7+ days"), N("Avg days to complete")]}
      rows={rows.map(([c, o, d, a, avg]) => ({ key: c, highlight: a > 5, cells: [c, String(o), String(d), String(a), avg.toFixed(1)] }))}
    />
  );
}

function Delinquency() {
  return (
    <DataTable
      title={`Delinquency · ${MONTH_LONG[LAST]}`}
      note="Alert over 3% of rent · collections 97%+"
      columns={["Property", N("% of rent"), N("Collection rate"), N("Units 61+ days"), N("Evictions")]}
      rows={ids().map((id) => {
        const k = kpis(id);
        if (k.delinquency === null || !reported(id, LAST)) return { key: id, cells: [property(id)!.name, notIn, "", "", ""] };
        return {
          key: id,
          highlight: k.delinquency > 0.03,
          href: href.property(id),
          cells: [property(id)!.name, <span key="d" className={k.delinquency > 0.03 ? "text-unfavorable" : undefined}>{fmt.pct(k.delinquency)}</span>, <span key="c" className={k.collection! < 0.97 ? "text-unfavorable" : undefined}>{fmt.pct(k.collection!)}</span>, String(Object.keys(DELINQUENT[id] ?? {}).length || Math.round(profile(id).units * 0.004)), "0"],
        };
      })}
    />
  );
}

function Payroll() {
  return (
    <DataTable
      title={`Payroll · ${MONTH_LONG[LAST]}`}
      columns={["Property", N("Positions"), N("Hours"), N("Overtime"), N("Per unit"), N("vs. budget")]}
      rows={ids().map((id) => {
        const m = profile(id).through;
        const a = month(id, m).lines.Payroll;
        const b = month(id, m, "Budget").lines.Payroll;
        const pos = Math.round(profile(id).units / 40) + 1;
        return { key: id, href: href.property(id), cells: [property(id)!.name, String(pos), fmt.int(pos * 168), fmt.int(pos * 6 * (a > b ? 2.2 : 0.8)), fmt.usd(a / profile(id).units), <Delta key="v" value={a - b} format={fmt.delta} good="down" />] };
      })}
    />
  );
}

function Utilities() {
  return (
    <DataTable
      title={`Utilities per unit · ${MONTH_LONG[LAST]}`}
      note="Spikes over 15% month over month can mean a leak"
      columns={["Property", N("Water"), N("Electric"), N("Gas"), N("Water vs. Oct")]}
      rows={ids().map((id) => {
        const u = month(id, profile(id).through).lines.Utilities / profile(id).units;
        const spike = id === "j" ? 0.21 : (wig(`${id}w`) - 0.5) * 0.08;
        return { key: id, highlight: spike > 0.15, href: href.property(id), cells: [property(id)!.name, fmt.usd(u * 0.46), fmt.usd(u * 0.31), fmt.usd(u * 0.23), <Delta key="s" value={spike} format={fmt.signedPct} good="down" />] };
      })}
    />
  );
}

function Inspections() {
  const rows = [
    ["Oct 22, 2026", "a", "Site visit", "Rooftop units, Buildings 2 and 3", 14],
    ["Sep 14, 2026", "j", "Property condition", "Roofs, Building 3; gutters", 22],
    ["Aug 3, 2026", "b", "Unit walk", "Classic units for the pilot", 31],
  ] as const;
  return (
    <DataTable
      title="Inspections and site visits"
      columns={["Date", "Property", "Type", "Items for capex plan", N("Photos")]}
      rows={rows.map(([d, id, t, items, ph]) => ({ key: d, href: href.property(id), cells: [<span key="d" className="num text-[11px] font-normal text-fg-2">{d}</span>, property(id)!.name, t, items, String(ph)] }))}
    />
  );
}

// ---- Capital ----

function Capex() {
  const { state } = useWf();
  return (
    <DataTable
      title="Capex by project"
      columns={["Project", N("Budget"), N("Committed"), N("Spent"), N("Remaining"), N("% complete"), "Funding source"]}
      rows={state.projects.map((p) => {
        const b = PROJECT_BUDGET[p.id];
        if (!b) return { key: p.id, href: href.project(p.id), cells: [`${p.name} · ${property(p.property)!.name}`, <span key="n" className="text-fg-3">Not set</span>, "", "", "", "", "Not set"] };
        const committed = p.step >= 4 ? b.budget * 0.86 : 0;
        return { key: p.id, href: href.project(p.id), cells: [`${p.name} · ${property(p.property)!.name}`, fmt.usd(b.budget), fmt.usd(committed), fmt.usd(b.spent), fmt.usd(b.budget - b.spent), fmt.pct(b.spent / b.budget), p.id === "j-roof" ? "Reserves" : "Loan holdback"] };
      })}
    />
  );
}

function Draws() {
  const { state } = useWf();
  const d2 = state.approvals.find((a) => a.id === "ap4");
  return (
    <DataTable
      title={`Draw schedule · ${property("j")!.name} roof replacement`}
      columns={["Draw", "Work completed", "Lien waivers", N("Retainage"), N("Requested"), "Status"]}
      rows={[
        { key: "1", cells: ["Draw 1", "Building 1", <Chip key="w" tone="green">Received</Chip>, fmt.usd(31_000), fmt.usd(310_000), <Chip key="s" tone="green">Funded</Chip>] },
        { key: "2", href: href.project("j-roof"), cells: ["Draw 2", "Building 2", <Chip key="w" tone="amber">1 missing</Chip>, fmt.usd(26_500), fmt.usd(265_000), <Chip key="s" tone={d2?.status === "Approved" ? "green" : d2?.status === "Declined" ? "red" : "amber"}>{d2?.status ?? "Waiting"}</Chip>] },
      ]}
    />
  );
}

const MATURITY: Record<string, string> = { a: "Jun 2029", b: "Mar 2030", c: "Nov 2031", d: "Aug 2029", e: "Feb 2028", f: "Sep 2028", g: "Jan 2030", h: "May 2031", i: "Oct 2029", j: "Jul 2030", k: "Dec 2029", l: "Apr 2031" };

function Loans() {
  return (
    <DataTable
      title="Loans"
      note="DSCR covenant 1.25x"
      columns={["Property", N("Balance"), N("Rate"), N("DSCR"), N("Cushion"), N("Debt yield"), N("LTV"), "Maturity", "Rate cap expiry"]}
      rows={ids().map((id) => {
        const d = debt(id);
        const k = kpis(id);
        return {
          key: id,
          highlight: d.cushion < 0.1,
          href: href.property(id),
          cells: [property(id)!.name, fmt.usd(d.balance), fmt.pct(d.rate, 2), <span key="d" className={d.cushion < 0.1 ? "text-warning" : undefined}>{fmt.x(k.dscr)}</span>, fmt.x(d.cushion), fmt.pct(d.debtYield), fmt.pct(d.ltv), MATURITY[id], id === "f" ? <span key="r" className="text-warning">Expired Sep 2026</span> : "Floating rate hedged"],
        };
      })}
    />
  );
}

function Valuation() {
  return (
    <DataTable
      title="Hold vs. sell vs. refinance"
      columns={["Property", N("NOI (T-12)"), N("Cap rate"), N("Value"), N("Hold IRR"), N("Sell IRR"), N("Refi proceeds")]}
      rows={ids().map((id) => {
        const d = debt(id);
        const ahead = (noiVs(id, "T-12", "Underwriting")?.pct ?? 0) > 0.03;
        return { key: id, highlight: id === "h", href: href.property(id), cells: [property(id)!.name, fmt.usd(d.noi12), fmt.pct(profile(id).cap, 2), fmt.usdShort(d.value), fmt.pct(0.112 + wig(id) * 0.02), fmt.pct(ahead || id === "h" ? 0.138 : 0.094 + wig(`${id}s`) * 0.02), fmt.usdShort(Math.max(0, d.value * 0.65 - d.balance))] };
      })}
    />
  );
}

// ---- Pages ----

interface Tab {
  id: string;
  label: string;
  perProperty?: boolean;
  render: (id: string) => React.ReactNode;
}

export const MODULES: Record<string, { title: string; tabs: Tab[] }> = {
  financials: {
    title: "Financials",
    tabs: [
      { id: "t12", label: "T-12", perProperty: true, render: (id) => <T12 id={id} /> },
      { id: "variance", label: "Budget variance", perProperty: true, render: (id) => <Variance id={id} /> },
      { id: "gl", label: "GL detail", perProperty: true, render: (id) => <Gl id={id} /> },
      { id: "balance", label: "Balance sheet", perProperty: true, render: (id) => <Balance id={id} /> },
      { id: "cash", label: "Cash reconciliation", render: () => <Cash /> },
      { id: "ar", label: "AR aging", render: () => <Ar /> },
      { id: "ap", label: "AP aging", render: () => <Ap /> },
      { id: "reforecast", label: "Reforecast", render: () => <Reforecast /> },
    ],
  },
  leasing: {
    title: "Leasing and revenue",
    tabs: [
      { id: "box", label: "Box score", perProperty: true, render: (id) => <BoxScore id={id} /> },
      { id: "funnel", label: "Leasing funnel", render: () => <Funnel /> },
      { id: "rentroll", label: "Rent roll", perProperty: true, render: (id) => <RentRoll key={id} id={id} /> },
      { id: "expirations", label: "Lease expirations", render: () => <Expirations /> },
      { id: "ltl", label: "Loss to lease", render: () => <Ltl /> },
      { id: "renewals", label: "Renewals", render: () => <Renewals /> },
      { id: "tradeout", label: "Trade-out", render: () => <TradeOut /> },
      { id: "concessions", label: "Concessions", render: () => <Concessions /> },
      { id: "other", label: "Other income", render: () => <OtherIncome /> },
    ],
  },
  operations: {
    title: "Operations",
    tabs: [
      { id: "makeready", label: "Make-ready", render: () => <MakeReady /> },
      { id: "wo", label: "Work orders", render: () => <WorkOrders /> },
      { id: "delinquency", label: "Delinquency", render: () => <Delinquency /> },
      { id: "payroll", label: "Payroll", render: () => <Payroll /> },
      { id: "utilities", label: "Utilities", render: () => <Utilities /> },
      { id: "inspections", label: "Inspections", render: () => <Inspections /> },
    ],
  },
  capital: {
    title: "Capital and debt",
    tabs: [
      { id: "capex", label: "Capex", render: () => <Capex /> },
      { id: "draws", label: "Lender draws", render: () => <Draws /> },
      { id: "loans", label: "Loans", render: () => <Loans /> },
      { id: "valuation", label: "Valuation", render: () => <Valuation /> },
    ],
  },
};

export function ModulePage({ id }: { id: keyof typeof MODULES }) {
  const m = MODULES[id];
  const [tab, setTab] = useState(m.tabs[0].id);
  const [prop, setProp] = useState("a");
  const t = m.tabs.find((x) => x.id === tab)!;
  return (
    <Page title={m.title} subtitle={`${MONTH_LONG[LAST]} 2026 close · ${PROPERTIES.length} properties`}>
      <Tabs value={tab} onChange={setTab} tabs={m.tabs} />
      {t.perProperty && <PropertyPicker value={prop} onChange={setProp} />}
      {t.render(prop)}
      {t.perProperty && <A href={href.property(prop)} className="text-[11px] font-normal text-fg-3">{`Open ${property(prop)!.name}'s scorecard`}</A>}
    </Page>
  );
}
