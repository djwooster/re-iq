"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Prototype charts: one axis, faint horizontal grid, custom legend, inverted tooltip, 2px lines. */

export interface Series {
  key: string;
  label: string;
  style: "data" | "reference" | "muted";
}

const STROKE: Record<Series["style"], { stroke: string; dash?: string; width: number }> = {
  data: { stroke: "var(--data)", width: 2 },
  reference: { stroke: "var(--text-muted)", dash: "4 4", width: 1.5 },
  muted: { stroke: "var(--border-strong)", width: 2 },
};

const TICK = { fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-geist-sans)" };

export function Legend({ series, threshold }: { series: Series[]; threshold?: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => {
        const st = STROKE[s.style];
        return (
          <li key={s.key} className="flex items-center gap-1.5 text-[11px] text-fg-2">
            <svg width="14" height="6" aria-hidden>
              <line x1="0" y1="3" x2="14" y2="3" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinecap="round" />
            </svg>
            {s.label}
          </li>
        );
      })}
      {threshold && (
        <li className="flex items-center gap-1.5 text-[11px] text-fg-2">
          <svg width="14" height="6" aria-hidden>
            <line x1="0" y1="3" x2="14" y2="3" stroke="var(--unfavorable)" strokeWidth={1} strokeDasharray="2 3" />
          </svg>
          {threshold}
        </li>
      )}
    </ul>
  );
}

interface TipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number | null }[];
  label?: string;
}

function Tip({ active, payload, label, series, format }: TipProps & { series: Series[]; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-md bg-inverted px-2.5 py-2 text-inverted-fg shadow-overlay">
      <div className="num mb-1.5 text-[10px] tracking-[0.08em] text-inverted-muted uppercase">{label}</div>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center justify-between gap-4 text-[11px] leading-5">
            <span className="text-inverted-muted">{s.label}</span>
            <span className="num">{p?.value === null || p?.value === undefined ? "Not reported" : format(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TrendChart({
  data,
  series,
  format,
  axisFormat,
  threshold,
  height = 200,
}: {
  data: Record<string, string | number | null>[];
  series: Series[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  threshold?: { value: number; label: string };
  height?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Legend series={series} threshold={threshold?.label} />
      <div style={{ height }} className="w-full" role="img" aria-label={`${series.map((s) => s.label).join(" and ")} by month`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" minTickGap={12} dy={6} />
            <YAxis tickFormatter={axisFormat ?? format} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} tick={TICK} tickCount={4} />
            <Tooltip cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} content={<Tip series={series} format={format} />} isAnimationActive={false} />
            {threshold && <ReferenceLine y={threshold.value} stroke="var(--unfavorable)" strokeDasharray="2 3" strokeWidth={1} ifOverflow="extendDomain" />}
            {series.map((s) => {
              const st = STROKE[s.style];
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={st.stroke}
                  strokeWidth={st.width}
                  strokeDasharray={st.dash}
                  dot={false}
                  activeDot={s.style === "data" ? { r: 4, fill: "var(--data)", stroke: "var(--surface)", strokeWidth: 2 } : false}
                  connectNulls={false}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal bars, for funnels and breakdowns. One highlighted bar at most. */
export function Bars({ data, format, highlight, height = 180 }: { data: { label: string; value: number }[]; format: (v: number) => string; highlight?: string; height?: number }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={96} tick={{ ...TICK, fontFamily: "var(--font-geist-sans)", fontSize: 11 }} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14} label={{ position: "right", formatter: (v: unknown) => format(Number(v)), fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-geist-sans)" }} animationDuration={500}>
            {data.map((d) => (
              <Cell key={d.label} fill={highlight === undefined || d.label === highlight ? "var(--data)" : "var(--data-soft)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
