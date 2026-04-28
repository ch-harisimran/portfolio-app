"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, TrendingUp, ArrowUpRight } from "lucide-react";
import { stocksApi } from "@/lib/api";
import { formatPKR, formatPercent, formatNumber, cn } from "@/lib/utils";
import type { StockDividend, StockInvestment, StockSearchResult } from "@/types";
import Modal from "@/components/ui/Modal";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import Link from "next/link";

interface AddForm {
  symbol: string; company_name: string; units: number;
  buy_price: number; buy_date: string; broker_commission: number; notes: string;
}

interface StockHoldingRow {
  id: number;
  symbol: string;
  company_name?: string;
  units: number;
  avg_buy_price: number;
  invested_amount: number;
  current_price?: number;
  current_value?: number;
  pnl: number;
  pnl_pct: number;
  latest_date: string;
  trade_count: number;
  dividend_gross: number;
  dividend_tax: number;
  dividend_net: number;
}

const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockInvestment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [dividends, setDividends] = useState<StockDividend[]>([]);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [allStockOptions, setAllStockOptions] = useState<StockSearchResult[]>([]);
  const [searchQ, setSearchQ] = useState("");

  const addForm = useForm<AddForm>({ defaultValues: { broker_commission: 0 } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockRes, dividendRes] = await Promise.all([
        stocksApi.list(tab === "closed"),
        stocksApi.listDividends(),
      ]);
      setStocks(stockRes.data);
      setDividends(dividendRes.data);
    } catch {
      toast.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const loadStockOptions = useCallback(async () => {
    try {
      const { data } = await stocksApi.search("");
      setAllStockOptions(data);
      setSearchResults(data.slice(0, 12));
    } catch {
      setAllStockOptions([]);
    }
  }, []);

  useEffect(() => {
    if (!showAdd || allStockOptions.length > 0) return;
    loadStockOptions();
  }, [showAdd, allStockOptions.length, loadStockOptions]);

  const onSearch = (q: string) => {
    setSearchQ(q);
    addForm.setValue("symbol", q.toUpperCase());
    if (q.length < 1) {
      setSearchResults(allStockOptions.slice(0, 12));
      return;
    }
    const qq = q.toLowerCase();
    setSearchResults(
      allStockOptions.filter((s) =>
        s.symbol.toLowerCase().includes(qq) || (s.company_name || "").toLowerCase().includes(qq)
      ).slice(0, 20)
    );
  };

  const selectStock = (s: StockSearchResult) => {
    addForm.setValue("symbol", s.symbol);
    addForm.setValue("company_name", s.company_name || "");
    if (s.current_price) addForm.setValue("buy_price", s.current_price);
    setSearchResults([]);
    setSearchQ(s.symbol);
  };

  const onAdd = async (data: AddForm) => {
    try {
      await stocksApi.create(data);
      toast.success("Investment added");
      setShowAdd(false);
      addForm.reset({ broker_commission: 0 });
      setSearchQ("");
      setSearchResults([]);
      load();
    } catch {
      toast.error("Failed to add investment");
    }
  };

  const dividendMap = dividends.reduce<Record<string, { gross: number; tax: number; net: number }>>((acc, row) => {
    const current = acc[row.symbol] || { gross: 0, tax: 0, net: 0 };
    acc[row.symbol] = {
      gross: current.gross + row.gross_amount,
      tax: current.tax + row.tax_amount,
      net: current.net + row.net_amount,
    };
    return acc;
  }, {});

  const groupedStocks = Object.values(
    stocks.reduce<Record<string, StockHoldingRow>>((acc, stock) => {
      const existing = acc[stock.symbol];
      const currentValue = stock.current_value ?? stock.invested_amount;
      const pnl = tab === "open" ? (stock.unrealized_pnl ?? 0) : (stock.realized_pnl ?? 0);
      const latestDate = tab === "open" ? stock.buy_date : (stock.sell_date || stock.buy_date);

      if (!existing) {
        const dividendTotals = dividendMap[stock.symbol] || { gross: 0, tax: 0, net: 0 };
        acc[stock.symbol] = {
          id: stock.id,
          symbol: stock.symbol,
          company_name: stock.company_name,
          units: stock.units,
          avg_buy_price: stock.units > 0 ? stock.invested_amount / stock.units : stock.buy_price,
          invested_amount: stock.invested_amount,
          current_price: stock.current_price,
          current_value: currentValue,
          pnl,
          pnl_pct: stock.invested_amount > 0 ? (pnl / stock.invested_amount) * 100 : 0,
          latest_date: latestDate,
          trade_count: 1,
          dividend_gross: dividendTotals.gross,
          dividend_tax: dividendTotals.tax,
          dividend_net: dividendTotals.net,
        };
        return acc;
      }

      const nextUnits = existing.units + stock.units;
      const nextInvested = existing.invested_amount + stock.invested_amount;
      const nextPnl = existing.pnl + pnl;

      acc[stock.symbol] = {
        ...existing,
        company_name: existing.company_name || stock.company_name,
        units: nextUnits,
        avg_buy_price: nextUnits > 0 ? nextInvested / nextUnits : stock.buy_price,
        invested_amount: nextInvested,
        current_price: stock.current_price ?? existing.current_price,
        current_value: (existing.current_value ?? existing.invested_amount) + currentValue,
        pnl: nextPnl,
        pnl_pct: nextInvested > 0 ? (nextPnl / nextInvested) * 100 : 0,
        latest_date: latestDate > existing.latest_date ? latestDate : existing.latest_date,
        trade_count: existing.trade_count + 1,
        dividend_gross: existing.dividend_gross,
        dividend_tax: existing.dividend_tax,
        dividend_net: existing.dividend_net,
      };
      return acc;
    }, {})
  ).sort((a, b) => a.symbol.localeCompare(b.symbol));

  const totalInvested = groupedStocks.reduce((sum, stock) => sum + stock.invested_amount, 0);
  const totalCurrent = groupedStocks.reduce((sum, stock) => sum + (stock.current_value ?? stock.invested_amount), 0);
  const totalPnl = groupedStocks.reduce((sum, stock) => sum + stock.pnl, 0);
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-5 max-w-6xl animate-fade-up">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Invested", val: formatPKR(totalInvested), color: "text-white" },
          { label: "Current Value", val: formatPKR(totalCurrent), color: "text-brand" },
          { label: "P&L", val: `${totalPnl >= 0 ? "+" : ""}${formatPKR(totalPnl)}`, color: totalPnl >= 0 ? "text-profit" : "text-loss", sub: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` },
        ].map(({ label, val, color, sub }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{val}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <ModuleInsights moduleKey="stocks" />

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
          {(["open", "closed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-gradient-brand text-white shadow-glow-brand-sm" : "text-muted hover:text-white"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groupedStocks.length === 0 ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No {tab} stock investments yet</p>
          <p className="text-xs text-muted/60 mt-1">Add your PSX holdings to track performance</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                {["Symbol", "Units", "Avg Buy", "Invested", tab === "open" ? "Current" : "Realized Value", "P&L", "Dividends", "Last Activity", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {groupedStocks.map((stock) => {
                const isProfit = stock.pnl >= 0;
                return (
                  <tr key={`${tab}-${stock.symbol}`} className="hover:bg-surface-elevated/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <Link href={`/stocks/${stock.id}`} className="flex items-center gap-1 group/link">
                        <div>
                          <p className="font-bold text-white group-hover/link:text-brand transition-colors flex items-center gap-1">
                            {stock.symbol}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-[10px] text-muted">{stock.company_name} · {stock.trade_count} trade{stock.trade_count > 1 ? "s" : ""}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium">{formatNumber(stock.units, 0)}</td>
                    <td className="px-4 py-3.5 text-gray-300">Rs {formatNumber(stock.avg_buy_price)}</td>
                    <td className="px-4 py-3.5 text-gray-300">{formatPKR(stock.invested_amount)}</td>
                    <td className="px-4 py-3.5 text-gray-300">
                      {tab === "open"
                        ? (stock.current_price ? `Rs ${formatNumber(stock.current_price)}` : "-")
                        : formatPKR(stock.current_value ?? stock.invested_amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", isProfit ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                        {isProfit ? "+" : ""}{formatPKR(stock.pnl)}
                        <span className="ml-1 opacity-70">({formatPercent(stock.pnl_pct)})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-300">
                      <p>Gross {formatPKR(stock.dividend_gross)}</p>
                      <p className="text-muted">Tax {formatPKR(stock.dividend_tax)}</p>
                      <p className="text-muted">Net {formatPKR(stock.dividend_net)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">{stock.latest_date}</td>
                    <td className="px-4 py-3.5 text-xs text-muted">View history</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset({ broker_commission: 0 }); setSearchQ(""); setSearchResults([]); }} title="Add Stock Investment">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stock Symbol</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={searchQ}
                onFocus={() => onSearch(searchQ)}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all"
                placeholder="Search PSX symbol (e.g. OGDC)"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => selectStock(stock)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated text-left transition-colors"
                  >
                    <span>
                      <span className="font-bold text-white text-sm">{stock.symbol}</span>
                      <span className="text-muted text-xs ml-2">{stock.company_name}</span>
                    </span>
                    {stock.current_price && <span className="text-xs text-gray-300">Rs {formatNumber(stock.current_price)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="hidden" {...addForm.register("symbol", { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Units</label>
              <input type="number" step="1" {...addForm.register("units", { required: true, min: 1 })} className={inputCls} placeholder="100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy Price (Rs)</label>
              <input type="number" step="0.01" {...addForm.register("buy_price", { required: true, min: 0.01 })} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy Date</label>
              <input type="date" {...addForm.register("buy_date", { required: true })} defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Commission (Rs)</label>
              <input type="number" step="0.01" {...addForm.register("broker_commission")} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea {...addForm.register("notes")} rows={2} className={inputCls + " resize-none"} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowAdd(false); addForm.reset({ broker_commission: 0 }); }} className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Add Investment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
