"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { stocksApi } from "@/lib/api";
import { formatPKR, formatNumber, formatPercent, pnlColor, cn } from "@/lib/utils";
import PortfolioChart from "@/components/charts/PortfolioChart";
import Modal from "@/components/ui/Modal";
import type { StockDividend, StockInvestment } from "@/types";
import toast from "react-hot-toast";

interface SellForm {
  units: number;
  sell_price: number;
  sell_date: string;
  sell_commission: number;
  notes: string;
}

interface EditTradeForm {
  units: number;
  buy_price: number;
  buy_date: string;
  broker_commission: number;
  notes: string;
  sell_price?: number;
  sell_date?: string;
  sell_commission?: number;
}

interface DividendForm {
  shares: number;
  dividend_per_share: number;
  tax_percent: number;
  dividend_date: string;
  notes: string;
}

export default function StockDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [stock, setStock] = useState<StockInvestment | null>(null);
  const [history, setHistory] = useState<StockInvestment[]>([]);
  const [dividends, setDividends] = useState<StockDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSell, setShowSell] = useState(false);
  const [showDividend, setShowDividend] = useState(false);
  const [editingTrade, setEditingTrade] = useState<StockInvestment | null>(null);
  const sellForm = useForm<SellForm>({
    defaultValues: {
      sell_commission: 0,
      sell_date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });
  const editTradeForm = useForm<EditTradeForm>();
  const dividendForm = useForm<DividendForm>({
    defaultValues: {
      tax_percent: 0,
      dividend_date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await stocksApi.get(Number(id));
      setStock(data);
      const [openTrades, closedTrades, dividendRes] = await Promise.all([
        stocksApi.list(false),
        stocksApi.list(true),
        stocksApi.listDividends(data.symbol),
      ]);
      setHistory(
        [...openTrades.data, ...closedTrades.data]
          .filter((trade) => trade.symbol === data.symbol)
          .sort((a, b) => (b.sell_date || b.buy_date).localeCompare(a.sell_date || a.buy_date))
      );
      setDividends(dividendRes.data);
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
  const totalDividendGross = dividends.reduce((sum, row) => sum + row.gross_amount, 0);
  const totalDividendTax = dividends.reduce((sum, row) => sum + row.tax_amount, 0);
  const totalDividendNet = dividends.reduce((sum, row) => sum + row.net_amount, 0);
  const avgBuyPrice = totalUnits > 0 ? totalInvested / totalUnits : stock.buy_price;
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

  const onEditTrade = async (data: EditTradeForm) => {
    if (!editingTrade) return;
    try {
      await stocksApi.update(editingTrade.id, {
        units: data.units,
        buy_price: data.buy_price,
        buy_date: data.buy_date,
        broker_commission: data.broker_commission,
        notes: data.notes || undefined,
        sell_price: editingTrade.is_closed ? data.sell_price : undefined,
        sell_date: editingTrade.is_closed ? data.sell_date : undefined,
        sell_commission: editingTrade.is_closed ? data.sell_commission : undefined,
      });
      toast.success("Trade updated");
      setEditingTrade(null);
      await load();
    } catch {
      toast.error("Failed to update trade");
    }
  };

  const onAddDividend = async (data: DividendForm) => {
    try {
      await stocksApi.addDividend(Number(id), data);
      toast.success("Dividend added");
      setShowDividend(false);
      dividendForm.reset({
        tax_percent: 0,
        dividend_date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await load();
    } catch {
      toast.error("Failed to add dividend");
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
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    dividendForm.reset({
                      shares: totalUnits,
                      dividend_per_share: 0,
                      tax_percent: 0,
                      dividend_date: new Date().toISOString().slice(0, 10),
                      notes: "",
                    });
                    setShowDividend(true);
                  }}
                  className="bg-brand/15 hover:bg-brand/25 text-brand rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                >
                  Add Dividend
                </button>
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
                  className="bg-gradient-profit hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                >
                  Sell Shares
                </button>
              </div>
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
          { label: "Dividend Gross", value: formatPKR(totalDividendGross) },
          { label: "Dividend Tax", value: formatPKR(totalDividendTax) },
          { label: "Dividend Net", value: formatPKR(totalDividendNet) },
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
                {["Trade Date", "Units", "Buy Price", "Invested", "Status", "P&L", "Notes", ""].map((heading) => (
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
                    <td className="px-3 py-3">
                      <button
                        onClick={() => {
                          setEditingTrade(trade);
                          editTradeForm.reset({
                            units: trade.units,
                            buy_price: trade.buy_price,
                            buy_date: trade.buy_date,
                            broker_commission: trade.broker_commission,
                            notes: trade.notes || "",
                            sell_price: trade.sell_price,
                            sell_date: trade.sell_date,
                            sell_commission: trade.sell_commission,
                          });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Dividends</h2>
          <button
            onClick={() => {
              dividendForm.reset({
                shares: totalUnits,
                dividend_per_share: 0,
                tax_percent: 0,
                dividend_date: new Date().toISOString().slice(0, 10),
                notes: "",
              });
              setShowDividend(true);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand/15 text-brand hover:bg-brand/25"
          >
            Add Dividend
          </button>
        </div>
        {dividends.length === 0 ? (
          <p className="text-sm text-muted">No dividends recorded for this stock yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {["Date", "Shares", "Per Share", "Gross", "Tax", "Net", "Notes"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {dividends.map((dividend) => (
                  <tr key={dividend.id}>
                    <td className="px-3 py-3 text-muted">{dividend.dividend_date}</td>
                    <td className="px-3 py-3 text-white">{formatNumber(dividend.shares, 0)}</td>
                    <td className="px-3 py-3 text-white">Rs {formatNumber(dividend.dividend_per_share)}</td>
                    <td className="px-3 py-3 text-white">{formatPKR(dividend.gross_amount)}</td>
                    <td className="px-3 py-3 text-white">{formatPKR(dividend.tax_amount)} ({formatPercent(dividend.tax_percent)})</td>
                    <td className="px-3 py-3 text-white">{formatPKR(dividend.net_amount)}</td>
                    <td className="px-3 py-3 text-muted">{dividend.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <Modal open={!!editingTrade} onClose={() => setEditingTrade(null)} title={`Edit ${editingTrade?.symbol || stock.symbol} Trade`} size="sm">
        <form onSubmit={editTradeForm.handleSubmit(onEditTrade)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Units</label>
            <input type="number" step="1" {...editTradeForm.register("units", { required: true, min: 1 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy price (Rs)</label>
            <input type="number" step="0.01" {...editTradeForm.register("buy_price", { required: true, min: 0.01 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy date</label>
            <input type="date" {...editTradeForm.register("buy_date", { required: true })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Commission (Rs)</label>
            <input type="number" step="0.01" {...editTradeForm.register("broker_commission")} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          {editingTrade?.is_closed && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell price (Rs)</label>
                <input type="number" step="0.01" {...editTradeForm.register("sell_price", { min: 0.01 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell date</label>
                <input type="date" {...editTradeForm.register("sell_date")} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell commission (Rs)</label>
                <input type="number" step="0.01" {...editTradeForm.register("sell_commission")} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
            <textarea {...editTradeForm.register("notes")} rows={2} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setEditingTrade(null)} className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDividend} onClose={() => setShowDividend(false)} title={`Add Dividend · ${stock.symbol}`} size="sm">
        <form onSubmit={dividendForm.handleSubmit(onAddDividend)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Shares</label>
            <input type="number" step="1" {...dividendForm.register("shares", { required: true, min: 1 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dividend per share (Rs)</label>
            <input type="number" step="0.0001" {...dividendForm.register("dividend_per_share", { required: true, min: 0.0001 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tax %</label>
            <input type="number" step="0.01" {...dividendForm.register("tax_percent", { min: 0 })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dividend date</label>
            <input type="date" {...dividendForm.register("dividend_date", { required: true })} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea {...dividendForm.register("notes")} rows={2} className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowDividend(false)} className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">Add Dividend</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
