"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { goalsApi } from "@/lib/api";
import { formatPKR, formatNumber } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Goal } from "@/types";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function GoalDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goalsApi.get(Number(id)).then(({ data }) => setGoal(data)).catch(() => toast.error("Not found")).finally(() => setLoading(false));
  }, [id]);

  const deleteContrib = async (cId: number) => {
    if (!goal) return;
    try { await goalsApi.deleteContribution(goal.id, cId); const { data } = await goalsApi.get(goal.id); setGoal(data); toast.success("Removed"); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!goal) return <div className="text-muted">Goal not found</div>;

  const chartData = [...goal.contributions].reverse().map((c) => ({ date: c.date, amount: c.amount }));

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{goal.name}</h1>
            {goal.deadline && <p className="text-muted text-sm">Deadline: {goal.deadline}</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{formatPKR(goal.total_saved)}</p>
            <p className="text-muted text-sm">of {formatPKR(goal.target_amount)}</p>
          </div>
        </div>
        <ProgressBar value={goal.total_saved} max={goal.target_amount} color={goal.color} />
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-sm mt-2">
          <span className="text-muted">{goal.progress_percent.toFixed(1)}% complete</span>
          <span className="text-muted">{formatPKR(goal.remaining_amount)} remaining</span>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white mb-4">Contribution History</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}K`} width={55} />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v: number) => [formatPKR(v), "Amount"]}
              />
              <Bar dataKey="amount" fill={goal.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Contributions ({goal.contributions.length})</h2>
        </div>
        {goal.contributions.length === 0 ? (
          <p className="text-center py-8 text-muted text-sm">No contributions yet</p>
        ) : (
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="border-b border-surface-border">
              {["Date", "Amount", "Note", ""].map((h) => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-border">
              {goal.contributions.map((c) => (
                <tr key={c.id} className="hover:bg-surface-elevated/50 group">
                  <td className="px-6 py-3 text-muted">{c.date}</td>
                  <td className="px-6 py-3 font-semibold text-white">{formatPKR(c.amount)}</td>
                  <td className="px-6 py-3 text-muted">{c.note || "—"}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => deleteContrib(c.id)} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-muted hover:text-loss transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
