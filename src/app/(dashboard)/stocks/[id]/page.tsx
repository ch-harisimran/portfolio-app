"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { stocksApi } from "@/lib/api";
import { formatPKR, formatNumber, formatPercent, pnlColor } from "@/lib/utils";
import PortfolioChart from "@/components/charts/PortfolioChart";
import type { StockInvestment } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function StockDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [stock, setStock] = useState<StockInvestment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stocksApi.get(Number(id)).then(({ data }) => setStock(data)).catch(() => toast.error("Not found")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!stock) return <div className="text-muted">Investment not found</div>;

  const pnl = stock.is_closed ? (stock.realized_pnl ?? 0) : (stock.unrealized_pnl ?? 0);
  const chartData = [
    { date: stock.buy_date, invested: stock.invested_amount, current: stock.invested_amount },
    ...(stock.current_value ? [{ date: new Date().toISOString().slice(0, 10), invested: stock.invested_amount, current: stock.current_value }] : []),
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{stock.symbol}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", stock.is_closed ? "bg-muted/20 text-muted" : "bg-profit/10 text-profit")}>
                {stock.is_closed ? "Closed" : "Active"}
              </span>
            </div>
            <p className="text-muted">{stock.company_name} {stock.sector && `· ${stock.sector}`}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {stock.is_closed ? `₨${formatNumber(stock.sell_price ?? 0)}` : (stock.current_price ? `₨${formatNumber(stock.current_price)}` : "—")}
            </p>
            <p className={cn("text-sm font-medium mt-0.5", pnlColor(pnl))}>
              {pnl >= 0 ? "+" : ""}{formatPKR(pnl)}
              {!stock.is_closed && stock.unrealized_pnl_pct !== undefined && ` (${formatPercent(stock.unrealized_pnl_pct)})`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Units", value: formatNumber(stock.units, 0) },
          { label: "Buy Price", value: `₨${formatNumber(stock.buy_price)}` },
          { label: "Invested", value: formatPKR(stock.invested_amount) },
          { label: "Current Value", value: stock.current_value ? formatPKR(stock.current_value) : "—" },
          { label: "Buy Date", value: stock.buy_date },
          { label: stock.is_closed ? "Sell Date" : "Holding Period", value: stock.sell_date || "Active" },
          { label: "Commission", value: `₨${formatNumber(stock.broker_commission)}` },
          { label: "P&L", value: `${pnl >= 0 ? "+" : ""}${formatPKR(pnl)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Value History</h2>
          <PortfolioChart data={chartData} height={240} />
        </div>
      )}

      {stock.notes && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Notes</p>
          <p className="text-gray-300 text-sm">{stock.notes}</p>
        </div>
      )}
    </div>
  );
}
