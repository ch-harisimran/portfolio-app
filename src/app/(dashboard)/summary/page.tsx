"use client";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { formatPKR } from "@/lib/utils";
import type { PeriodSummaryResponse, PeriodSummaryItem } from "@/types";

function SummaryTable({ title, rows }: { title: string; rows: PeriodSummaryItem[] }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-sm text-muted text-center">No data yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                {["Period", "PSX Stocks", "Mutual Funds", "Goals Saved", "Loans Repaid", "Total"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((r) => (
                <tr key={`${title}-${r.period}`} className="hover:bg-surface-elevated/30 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-brand">{r.period}</td>
                  <td className="px-4 py-3.5 text-gray-300">{formatPKR(r.stocks_invested)}</td>
                  <td className="px-4 py-3.5 text-gray-300">{formatPKR(r.mutual_funds_invested)}</td>
                  <td className="px-4 py-3.5 text-gray-300">{formatPKR(r.goals_saved)}</td>
                  <td className="px-4 py-3.5 text-gray-300">{formatPKR(r.loans_repaid)}</td>
                  <td className="px-4 py-3.5 text-white font-bold">{formatPKR(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SummaryPage() {
  const [data, setData] = useState<PeriodSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const { data } = await dashboardApi.periodSummary(); setData(data); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-muted">Failed to load summary</div>;

  return (
    <div className="space-y-5 max-w-7xl animate-fade-up">
      {/* Page header */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 relative overflow-hidden shadow-card">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-brand-sm">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Period Summary</h1>
            <p className="text-xs text-muted mt-0.5">PSX invested, mutual funds, goals saved, and loans repaid — by month and year.</p>
          </div>
        </div>
      </div>

      <SummaryTable title="Monthly Summary" rows={data.monthly} />
      <SummaryTable title="Yearly Summary" rows={data.yearly} />
    </div>
  );
}
