"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Chart palette (validated with the dataviz validator, light surface):
 * categorical slots in fixed order; ordinal blue ramp for ordered stages;
 * reserved status colours that always ship with a text label.
 */
export const SERIES = ["#2B4ACB", "#eb6834", "#1baf7a"];
export const STAGE_RAMP = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#1c5cab", "#104281", "#0d366b"];
export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b", neutral: "#94a3b8" };

const axis = { fontSize: 12, fill: "#64748b" };
const grid = "#eef2f6";
const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 12px 32px -8px rgb(16 24 40 / 0.18)", fontSize: 12, padding: "8px 10px" },
  labelStyle: { color: "#0E1320", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#3B4352", padding: 0 },
  cursor: { stroke: "#cbd5e1", strokeWidth: 1 },
};

function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function TrendChart({ data, series }: { data: Record<string, string | number>[]; series: { key: string; label: string }[] }) {
  return (
    <div>
      {series.length > 1 && <LegendRow items={series.map((s, i) => ({ label: s.label, color: SERIES[i] }))} />}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={{ stroke: grid }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            {series.map((s, i) => (
              <Area key={s.key} type="monotoneX" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2} fill={SERIES[i]} fillOpacity={0.1} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal funnel: single series, value labelled at the bar tip, conversion in the tooltip. */
export function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  const top = data[0]?.value || 1;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.round((d.value / top) * 100);
        const prev = i > 0 ? data[i - 1].value : null;
        const conv = prev ? Math.round((d.value / Math.max(1, prev)) * 100) : null;
        return (
          <div key={d.label} className="group grid grid-cols-[120px_1fr_64px] items-center gap-3 text-[13px]" title={conv != null ? `${conv}% of previous stage` : undefined}>
            <span className="truncate text-slate-600">{d.label}</span>
            <div className="h-5 rounded bg-slate-50">
              <div className="h-5 rounded-r bg-brand-600 transition-all group-hover:bg-brand-700" style={{ width: `${Math.max(pct, d.value ? 2 : 0)}%`, borderRadius: "0 4px 4px 0" }} />
            </div>
            <span className="text-right tabular-nums text-ink">
              {d.value}
              {conv != null && <span className="ml-1 text-[11px] text-slate-400">{conv}%</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StackedStageBars({ data, stages }: { data: Record<string, string | number>[]; stages: { key: string; label: string }[] }) {
  return (
    <div>
      <LegendRow items={stages.map((s, i) => ({ label: s.label, color: STAGE_RAMP[i] }))} />
      <div style={{ height: Math.max(180, data.length * 40 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid stroke={grid} horizontal={false} />
            <XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="job" tick={axis} tickLine={false} axisLine={false} width={170} tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 25) + "…" : v)} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
            {stages.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={STAGE_RAMP[i]} maxBarSize={22} stroke="#fff" strokeWidth={2} radius={i === stages.length - 1 ? [0, 4, 4, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GroupedBars({ data, keys, categoryKey }: { data: Record<string, string | number>[]; keys: { key: string; label: string }[]; categoryKey: string }) {
  return (
    <div>
      <LegendRow items={keys.map((k, i) => ({ label: k.label, color: SERIES[i] }))} />
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={2}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey={categoryKey} tick={axis} tickLine={false} axisLine={{ stroke: grid }} interval={0} tickFormatter={(v: string) => (v.length > 11 ? v.slice(0, 10) + "…" : v)} />
            <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
            {keys.map((k, i) => (
              <Bar key={k.key} dataKey={k.key} name={k.label} fill={SERIES[i]} maxBarSize={22} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: STATUS.good, NO_ANSWER: STATUS.warning, DECLINED: STATUS.serious, FAILED: STATUS.critical,
  INVITED: STATUS.neutral, SCHEDULED: "#64748b", IN_PROGRESS: "#2B4ACB",
};

/** Interview status distribution: status colours always paired with a text label and value. */
export function StatusBars({ data }: { data: { name: string; value: number; status: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {data.map((d) => (
          <div key={d.status} title={`${d.name}: ${d.value}`} style={{ width: `${(d.value / total) * 100}%`, background: STATUS_COLOR[d.status] ?? STATUS.neutral }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        {data.map((d) => (
          <li key={d.status} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[d.status] ?? STATUS.neutral }} />
              {d.name}
            </span>
            <span className="tabular-nums text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UsageBars({ data, color = SERIES[0] }: { data: { date: string; value: number }[]; color?: string }) {
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={{ stroke: grid }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="value" name="Usage" fill={color} maxBarSize={14} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { Legend };
