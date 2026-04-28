"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { stocksApi } from "@/lib/api";
import { formatPKR, formatNumber, formatPercent, pnlColor, cn } from "@/lib/utils";
import PortfolioChart from "@/components/charts/PortfolioChart";
import Modal from "@/components/ui/Modal";
import type { StockInvestment } from "@/types";
import toast from "react-hot-toast";

interface SellForm {
  units: number;
  sell_price: number;
  sell_date: string;
  sell_commission: number;
  notes: string;
}

export default function StockDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [stock, setStock] = useState<StockInvestment | null>(null);
  const [history, setHistory] = useState<StockInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSell, setShowSell] = useState(false);
  const sellForm = useForm<SellForm>({
    defaultValues: {
      sell_commission: 0,
      sell_date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await stocksApi.get(Number(id));
      setStock(data);
      const [openTrades, closedTrades] = await Promise.all([stocksApi.list(false), stocksApi.list(true)]);
      setHistory(
        [...openTrades.data, ...closedTrades.data]
          .filter((trade) => trade.symbol === data.symbol)
          .sort((a, b) => (b.sell_date || b.buy_date).localeCompare(a.sell_date || a.buy_date))
      );
    } catch {
      toast.error("Not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!stock) return <div className="text-muted">Investment not found</div>;

  const openTrades = history.filter((trade) => !trade.is_closed);
  const totalUnits = openTrades.reduce((sum, trade) => sum + trade.units, 0);
  const totalInvested = openTrades.reduce((sum, trade) => sum + trade.invested_amount, 0);
  const totalCurrent = openTrades.reduce((sum, trade) => sum + (trade.current_value ?? trade.invested_amount), 0);
  const totalUnrealized = totalCurrent - totalInvested;
  const totalUnrealizedPct = totalInvested > 0 ? (totalUnrealized / totalInvested) * 100 : 0;
  const totalRealized = history.filter((trade) => trade.is_closed).reduce((sum, trade) => sum + (trade.realized_pnl ?? 0), 0);
  const avgBuyPrice = totalUnits > 0
    ? openTrades.reduce((sum, trade) => sum + (trade.buy_price * trade.units), 0) / totalUnits
    : stock.buy_price;
  const chartData = history
    .slice()
    .sort((a, b) => a.buy_date.localeCompare(b.buy_date))
    .map((trade, index, rows) => ({
      date: trade.buy_date,
      invested: rows.slice(0, index + 1).reduce((sum, row) => sum + row.invested_amount, 0),
      current: rows.slice(0, index + 1).reduce((sum, row) => sum + (row.current_value ?? row.invested_amount), 0),
    }));

  const onSell = async (data: SellForm) => {
    try {
      await stocksApi.sell(Number(id), data);
      toast.success(`Sold ${data.units} shares`);
      setShowSell(false);
      sellForm.reset({
        sell_commission: 0,
        sell_date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await load();
    } catch {
      toast.error("Failed to sell shares");
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{stock.symbol}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", openTrades.length > 0 ? "bg-profit/10 text-profit" : "bg-muted/20 text-muted")}>
                {openTrades.length > 0 ? `${openTrades.length} Active` : "Closed"}
              </span>
            </div>
            <p className="text-muted">{stock.company_name} {stock.sector && `· ${stock.sector}`}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {stock.current_price ? `Rs ${formatNumber(stock.current_price)}` : "-"}
            </p>
            <p className={cn("text-sm font-medium mt-0.5", pnlColor(totalUnrealized))}>
              {totalUnrealized >= 0 ? "+" : ""}{formatPKR(totalUnrealized)} ({formatPercent(totalUnrealizedPct)})
            </p>
            {totalUnits > 0 && (
              <button
                onClick={() => {
                  sellForm.reset({
                    units: Math.min(totalUnits, 1),
                    sell_price: stock.current_price || avgBuyPrice,
                    sell_date: new Date().toISOString().slice(0, 10),
                    sell_commission: 0,
                    notes: "",
                  });
                  setShowSell(true);
                }}
                className="mt-3 bg-gradient-profit hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all"
              >
                Sell Shares
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Units", value: formatNumber(totalUnits, 0) },
          { label: "Avg Buy Price", value: `Rs ${formatNumber(avgBuyPrice)}` },
          { label: "Open Invested", value: formatPKR(totalInvested) },
          { label: "Current Value", value: totalCurrent ? formatPKR(totalCurrent) : "-" },
          { label: "Total Trades", value: history.length.toString() },
          { label: "Closed P&L", value: `${totalRealized >= 0 ? "+" : ""}${formatPKR(totalRealized)}` },
          { label: "Total Commission", value: `Rs ${formatNumber(history.reduce((sum, trade) => sum + trade.broker_commission + (trade.sell_commission ?? 0), 0))}` },
          { label: "Open P&L", value: `${totalUnrealized >= 0 ? "+" : ""}${formatPKR(totalUnrealized)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Position History</h2>
          <PortfolioChart data={chartData} height={240} />
        </div>
      )}

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Trade History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {["Trade Date", "Units", "Buy Price", "Invested", "Status", "P&L", "Notes"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {history.map((trade) => {
                const tradePnl = trade.is_closed ? (trade.realized_pnl ?? 0) : (trade.unrealized_pnl ?? 0);
                return (
                  <tr key={trade.id}>
                    <td className="px-3 py-3 text-muted">{trade.buy_date}</td>
                    <td className="px-3 py-3 text-white">{formatNumber(trade.units, 0)}</td>
                    <td className="px-3 py-3 text-white">Rs {formatNumber(trade.buy_price)}</td>
                    <td className="px-3 py-3 text-white">{formatPKR(trade.invested_amount)}</td>
                    <td className="px-3 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", trade.is_closed ? "bg-muted/20 text-muted" : "bg-profit/10 text-profit")}>
                        {trade.is_closed ? `Closed ${trade.sell_date || ""}`.trim() : "Open"}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3", pnlColor(tradePnl))}>{tradePnl >= 0 ? "+" : ""}{formatPKR(tradePnl)}</td>
                    <td className="px-3 py-3 text-muted">{trade.notes || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showSell} onClose={() => setShowSell(false)} title={`Sell ${stock.symbol}`} size="sm">
        <form onSubmit={sellForm.handleSubmit(onSell)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Units to sell</label>
            <input type="number" step="1" max={totalUnits} {...sellForm.register("units", { required: true, min: 1, max: totalUnits })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
            <p className="text-xs text-muted mt-1">Open units available: {formatNumber(totalUnits, 0)}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell price (Rs)</label>
            <input type="number" step="0.01" {...sellForm.register("sell_price", { required: true, min: 0.01 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell date</label>
            <input type="date" {...sellForm.register("sell_date", { required: true })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Commission (Rs)</label>
            <input type="number" step="0.01" {...sellForm.register("sell_commission")} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea {...sellForm.register("notes")} rows={2} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowSell(false)} className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-profit hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">Sell Shares</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
