"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { loansApi } from "@/lib/api";
import { formatPKR } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Loan } from "@/types";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function LoanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loansApi.get(Number(id)).then(({ data }) => setLoan(data)).catch(() => toast.error("Not found")).finally(() => setLoading(false));
  }, [id]);

  const deleteRepayment = async (rId: number) => {
    if (!loan) return;
    try { await loansApi.deleteRepayment(loan.id, rId); const { data } = await loansApi.get(loan.id); setLoan(data); toast.success("Removed"); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!loan) return <div className="text-muted">Loan not found</div>;

  const chartData = [...loan.repayments].reverse().map((r) => ({ date: r.date, amount: r.amount }));

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{loan.lender_name}</h1>
            {loan.description && <p className="text-muted text-sm">{loan.description}</p>}
            {loan.interest_rate > 0 && <p className="text-warning text-sm mt-1">{loan.interest_rate}% p.a. interest</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-loss">{formatPKR(loan.remaining_balance)}</p>
            <p className="text-muted text-sm">remaining</p>
          </div>
        </div>
        <ProgressBar value={loan.total_paid} max={loan.principal_amount} color="#10b981" />
        <div className="flex justify-between text-sm mt-2">
          <span className="text-muted">{loan.progress_percent.toFixed(1)}% paid</span>
          <span className="text-muted">{formatPKR(loan.total_paid)} paid of {formatPKR(loan.principal_amount)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Principal", value: formatPKR(loan.principal_amount) },
          { label: "Total Paid", value: formatPKR(loan.total_paid) },
          { label: "Remaining", value: formatPKR(loan.remaining_balance) },
          { label: "Start Date", value: loan.start_date },
          { label: "Due Date", value: loan.due_date || "—" },
          { label: "Interest Rate", value: `${loan.interest_rate}%` },
          { label: "Repayments", value: loan.repayments.length.toString() },
          { label: "Status", value: loan.remaining_balance <= 0 ? "Paid Off" : "Active" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Repayment History</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}K`} width={55} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} labelStyle={{ color: "#9ca3af" }} formatter={(v: number) => [formatPKR(v), "Amount"]} />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Repayments ({loan.repayments.length})</h2>
        </div>
        {loan.repayments.length === 0 ? (
          <p className="text-center py-8 text-muted text-sm">No repayments recorded yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-border">
              {["Date", "Amount", "Note", ""].map((h) => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-border">
              {loan.repayments.map((r) => (
                <tr key={r.id} className="hover:bg-surface-elevated/50 group">
                  <td className="px-6 py-3 text-muted">{r.date}</td>
                  <td className="px-6 py-3 font-semibold text-profit">{formatPKR(r.amount)}</td>
                  <td className="px-6 py-3 text-muted">{r.note || "—"}</td>
                  <td className="px-6 py-3">
                    <button onClick={() => deleteRepayment(r.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-loss transition-all">
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
