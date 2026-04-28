"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fundsApi } from "@/lib/api";
import { formatPKR, formatNumber, pnlColor } from "@/lib/utils";
import PortfolioChart from "@/components/charts/PortfolioChart";
import type { MutualFundInvestment } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function FundDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [fund, setFund] = useState<MutualFundInvestment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fundsApi.get(Number(id)).then(({ data }) => setFund(data)).catch(() => toast.error("Not found")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!fund) return <div className="text-muted">Fund not found</div>;

  const pnl = fund.is_closed ? (fund.realized_pnl ?? 0) : (fund.unrealized_pnl ?? 0);
  const chartData = [
    { date: fund.purchase_date, invested: fund.invested_amount, current: fund.invested_amount },
    ...(fund.current_value ? [{ date: new Date().toISOString().slice(0, 10), invested: fund.invested_amount, current: fund.current_value }] : []),
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">{fund.fund_name}</h1>
            <p className="text-muted text-sm">{fund.amc_name} · {fund.fund_type}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {fund.current_nav ? `₨${formatNumber(fund.current_nav, 4)}` : "—"}
            </p>
            <p className={cn("text-sm font-medium mt-0.5", pnlColor(pnl))}>
              {pnl >= 0 ? "+" : ""}{formatPKR(pnl)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Units", value: formatNumber(fund.units, 4) },
          { label: "Purchase NAV", value: `₨${formatNumber(fund.purchase_nav, 4)}` },
          { label: "Invested", value: formatPKR(fund.invested_amount) },
          { label: "Current Value", value: fund.current_value ? formatPKR(fund.current_value) : "—" },
          { label: "Purchase Date", value: fund.purchase_date },
          { label: fund.is_closed ? "Redemption Date" : "Status", value: fund.sell_date || "Active" },
          { label: "Load %", value: `${fund.load_percentage}%` },
          { label: "P&L", value: `${pnl >= 0 ? "+" : ""}${formatPKR(pnl)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Value History</h2>
          <PortfolioChart data={chartData} height={240} />
        </div>
      )}
    </div>
  );
}
