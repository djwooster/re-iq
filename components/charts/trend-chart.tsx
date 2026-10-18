"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth } from "@/lib/dates";

export interface SeriesDef {
  key: string;
  label: string;
  /** "data" is the cyan actual line; "reference" is the quiet dashed comparison. */
  style: "data" | "reference" | "data-secondary";
}

const STROKES: Record<SeriesDef["style"], { stroke: string; dash?: string; width: number }> = {
  data: { stroke: "var(--data)", width: 2 },
  "data-secondary": { stroke: "var(--data)", dash: "2 3", width: 2 },
  reference: { stroke: "var(--text-muted)", dash: "4 4", width: 1.5 },
};

export function ChartLegend({ series }: { series: SeriesDef[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => {
        const st = STROKES[s.style];
        return (
          <li key={s.key} className="flex items-center gap-1.5 text-[11px] text-fg-2">
            <svg width="14" height="6" aria-hidden>
              <line x1="0" y1="3" x2="14" y2="3" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinecap="round" />
            </svg>
            {s.label}
          </li>
        );
      })}
    </ul>
  );
}

interface TooltipPayload {
  dataKey: string;
  value: number | null;
}

function TrendTooltip({
  active,
  payload,
  label,
  series,
  format,
  footnote,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  series: SeriesDef[];
  format: (v: number) => string;
  footnote?: (month: string) => string | null;
}) {
  if (!active || !payload?.length || !label) return null;
  const note = footnote?.(label);
  return (
    <div className="min-w-[160px] rounded-md bg-inverted px-2.5 py-2 text-inverted-fg shadow-overlay">
      <div className="num mb-1.5 text-[10px] tracking-[0.08em] text-inverted-muted uppercase">{formatMonth(label, "long")}</div>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center justify-between gap-4 text-[11px] leading-5">
            <span className="text-inverted-muted">{s.label}</span>
            <span className="num">{p?.value === null || p?.value === undefined ? "No data" : format(p.value)}</span>
          </div>
        );
      })}
      {note && <div className="mt-1.5 max-w-[220px] border-t border-inverted-fg/15 pt-1.5 text-[10px] text-inverted-muted">{note}</div>}
    </div>
  );
}

export function TrendChart<T extends { month: string }>({
  data,
  series,
  format,
  axisFormat,
  height = 200,
  domain,
  footnote,
}: {
  data: T[];
  series: SeriesDef[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  height?: number;
  domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  footnote?: (month: string) => string | null;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`${series.map((s) => s.label).join(" and ")} by month`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonth(m, "tiny")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            interval="preserveStartEnd"
            minTickGap={16}
            dy={6}
          />
          <YAxis
            tickFormatter={axisFormat ?? format}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={domain ?? ["auto", "auto"]}
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            tickCount={4}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={<TrendTooltip series={series} format={format} footnote={footnote} />}
            isAnimationActive={false}
          />
          {series.map((s) => {
            const st = STROKES[s.style];
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={st.stroke}
                strokeWidth={st.width}
                strokeDasharray={st.dash}
                dot={false}
                activeDot={s.style === "reference" ? false : { r: 4, fill: "var(--data)", stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
