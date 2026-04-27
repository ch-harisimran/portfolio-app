"use client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { formatPKR } from "@/lib/utils";

interface DataPoint {
  date: string;
  invested?: number;
  current?: number;
  value?: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 shadow-card text-sm min-w-[160px]">
      <p className="text-muted text-xs mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-white text-xs">{formatPKR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function PortfolioChart({ data, height = 260 }: Props) {
  const hasCurrent = data.some((d) => d.current !== undefined);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="grad-invested" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-current" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-value" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.8)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="transparent"
          tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 500 }}
          tickFormatter={(v) => v.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="transparent"
          tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 500 }}
          tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}K`}
          width={52}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(59,130,246,0.2)", strokeWidth: 1 }} />
        {hasCurrent ? (
          <>
            <Area
              type="monotone"
              dataKey="invested"
              name="Invested"
              stroke="#3b82f6"
              fill="url(#grad-invested)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#1f2937", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="current"
              name="Current Value"
              stroke="#10b981"
              fill="url(#grad-current)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#10b981", stroke: "#1f2937", strokeWidth: 2 }}
            />
          </>
        ) : (
          <Area
            type="monotone"
            dataKey="value"
            name="Net Worth"
            stroke="#10b981"
            fill="url(#grad-value)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#10b981", stroke: "#1f2937", strokeWidth: 2 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
