"use client";
import { useEffect, useState } from "react";
import { History, TrendingUp, Landmark } from "lucide-react";
import { stocksApi, fundsApi } from "@/lib/api";
import { formatPKR, formatNumber, cn } from "@/lib/utils";
import type { StockInvestment, MutualFundInvestment } from "@/types";

export default function HistoryPage() {
  const [stocks, setStocks] = useState<StockInvestment[]>([]);
  const [funds, setFunds] = useState<MutualFundInvestment[]>([]);
  const [tab, setTab] = useState<"stocks" | "funds">("stocks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, f] = await Promise.all([stocksApi.list(true), fundsApi.list(true)]);
        setStocks(s.data);
        setFunds(f.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalStockPnl = stocks.reduce((a, s) => a + (s.realized_pnl ?? 0), 0);
  const totalFundPnl = funds.reduce((a, f) => a + (f.realized_pnl ?? 0), 0);
  const totalPnl = totalStockPnl + totalFundPnl;

  return (
    <div className="space-y-5 max-w-6xl animate-fade-up">
      {/* Summary strip */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Closed Stock Trades", val: stocks.length.toString(), color: "text-white" },
          { label: "Closed Fund Investments", val: funds.length.toString(), color: "text-brand" },
          { label: "Total Realized P&L", val: `${totalPnl >= 0 ? "+" : ""}${formatPKR(totalPnl)}`, color: totalPnl >= 0 ? "text-profit" : "text-loss" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">{label}</p>
            <p className={cn("text-lg sm:text-xl font-bold break-words", color)}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-surface-card border border-surface-border rounded-xl p-1 w-full sm:w-fit">
        {[
          { key: "stocks" as const, label: "Stocks", icon: TrendingUp, count: stocks.length },
          { key: "funds" as const, label: "Funds", icon: Landmark, count: funds.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === key ? "bg-gradient-brand text-white shadow-glow-brand-sm" : "text-muted hover:text-white")}>
            <Icon className="w-4 h-4" />
            {label}
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold", tab === key ? "bg-white/20" : "bg-surface-elevated")}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "stocks" ? (
        stocks.length === 0 ? (
          <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No closed stock trades yet</p>
          </div>
        ) : (
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface/50">
                  {["Symbol", "Units", "Buy Price", "Sell Price", "Invested", "Realized P&L", "Buy Date", "Sell Date", "Duration"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {stocks.map((s) => {
                  const pnl = s.realized_pnl ?? 0;
                  const buyD = new Date(s.buy_date);
                  const sellD = s.sell_date ? new Date(s.sell_date) : new Date();
                  const days = Math.round((sellD.getTime() - buyD.getTime()) / 86400000);
                  return (
                    <tr key={s.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-white">{s.symbol}</p>
                        <p className="text-[10px] text-muted">{s.company_name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 font-medium">{formatNumber(s.units, 0)}</td>
                      <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(s.buy_price)}</td>
                      <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(s.sell_price ?? 0)}</td>
                      <td className="px-4 py-3.5 text-gray-300">{formatPKR(s.invested_amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", pnl >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                          {pnl >= 0 ? "+" : ""}{formatPKR(pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted text-xs">{s.buy_date}</td>
                      <td className="px-4 py-3.5 text-muted text-xs">{s.sell_date}</td>
                      <td className="px-4 py-3.5 text-muted text-xs">{days}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )
      ) : (
        funds.length === 0 ? (
          <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No closed fund investments yet</p>
          </div>
        ) : (
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface/50">
                  {["Fund", "Units", "Buy NAV", "Sell NAV", "Invested", "Realized P&L", "Buy Date", "Sell Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {funds.map((f) => {
                  const pnl = f.realized_pnl ?? 0;
                  return (
                    <tr key={f.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-white text-xs">{f.fund_name}</p>
                        <p className="text-[10px] text-muted">{f.amc_name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 font-medium">{formatNumber(f.units, 4)}</td>
                      <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(f.purchase_nav, 4)}</td>
                      <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(f.sell_nav ?? 0, 4)}</td>
                      <td className="px-4 py-3.5 text-gray-300">{formatPKR(f.invested_amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", pnl >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                          {pnl >= 0 ? "+" : ""}{formatPKR(pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted text-xs">{f.purchase_date}</td>
                      <td className="px-4 py-3.5 text-muted text-xs">{f.sell_date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
