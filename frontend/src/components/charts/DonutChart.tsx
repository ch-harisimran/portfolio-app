"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatPKR } from "@/lib/utils";

interface Props {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string; percent: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-sm">
      <p className="text-white font-medium">{item.name}</p>
      <p className="text-muted">{formatPKR(item.value)}</p>
    </div>
  );
};

export default function DonutChart({ data, height = 220 }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-muted text-sm">
        No data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ color: "#9ca3af", fontSize: "12px" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
