"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, TrendingUp, ArrowUpRight } from "lucide-react";
import { settingsApi, stocksApi } from "@/lib/api";
import { formatPKR, formatPercent, formatNumber, cn } from "@/lib/utils";
import type { StockInvestment, StockSearchResult } from "@/types";
import Modal from "@/components/ui/Modal";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import Link from "next/link";

interface AddForm {
  symbol: string; company_name: string; units: number;
  buy_price: number; buy_date: string; broker_commission: number; notes: string;
}
interface CloseForm { sell_price: number; sell_date: string; sell_commission: number; }

const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockInvestment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [closing, setClosing] = useState<StockInvestment | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [allStockOptions, setAllStockOptions] = useState<StockSearchResult[]>([]);
  const [searchQ, setSearchQ] = useState("");

  const addForm = useForm<AddForm>({ defaultValues: { broker_commission: 0 } });
  const closeForm = useForm<CloseForm>({ defaultValues: { sell_commission: 0 } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await stocksApi.list(tab === "closed");
      setStocks(data);
    } catch { toast.error("Failed to load stocks"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const loadStockOptions = useCallback(async () => {
    try {
      const { data } = await stocksApi.search("");
      setAllStockOptions(data);
    } catch { setAllStockOptions([]); }
  }, []);

  useEffect(() => { loadStockOptions(); }, [loadStockOptions]);

  useEffect(() => {
    const refresh = async () => {
      try { await settingsApi.refreshPSX(); } catch { /* ignore */ }
      finally { load(); loadStockOptions(); }
    };
    refresh();
  }, [load, loadStockOptions]);

  const onSearch = (q: string) => {
    setSearchQ(q);
    addForm.setValue("symbol", q.toUpperCase());
    if (q.length < 1) { setSearchResults(allStockOptions.slice(0, 12)); return; }
    const qq = q.toLowerCase();
    setSearchResults(allStockOptions.filter((s) =>
      s.symbol.toLowerCase().includes(qq) || (s.company_name || "").toLowerCase().includes(qq)
    ).slice(0, 20));
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
      setShowAdd(false); addForm.reset(); setSearchQ(""); load();
    } catch { toast.error("Failed to add investment"); }
  };

  const onClose = async (data: CloseForm) => {
    if (!closing) return;
    try {
      await stocksApi.close(closing.id, data);
      toast.success("Trade closed");
      setClosing(null); closeForm.reset(); load();
    } catch { toast.error("Failed to close trade"); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this investment?")) return;
    try { await stocksApi.delete(id); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const totalInvested = stocks.reduce((a, s) => a + s.invested_amount, 0);
  const totalCurrent = stocks.reduce((a, s) => a + (s.current_value ?? s.invested_amount), 0);
  const totalPnl = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-5 max-w-6xl animate-fade-up">
      {/* Summary strip */}
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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
          {(["open", "closed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-gradient-brand text-white shadow-glow-brand-sm" : "text-muted hover:text-white"
              )}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all">
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stocks.length === 0 ? (
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
                {["Symbol", "Units", "Buy Price", "Invested", tab === "open" ? "Current" : "Sold At", "P&L", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {stocks.map((s) => {
                const pnl = tab === "open" ? (s.unrealized_pnl ?? 0) : (s.realized_pnl ?? 0);
                const isProfit = pnl >= 0;
                return (
                  <tr key={s.id} className="hover:bg-surface-elevated/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <Link href={`/stocks/${s.id}`} className="flex items-center gap-1 group/link">
                        <div>
                          <p className="font-bold text-white group-hover/link:text-brand transition-colors flex items-center gap-1">
                            {s.symbol}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-[10px] text-muted">{s.company_name}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium">{formatNumber(s.units, 0)}</td>
                    <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(s.buy_price)}</td>
                    <td className="px-4 py-3.5 text-gray-300">{formatPKR(s.invested_amount)}</td>
                    <td className="px-4 py-3.5 text-gray-300">
                      {tab === "open" ? (s.current_price ? `₨${formatNumber(s.current_price)}` : "—") : `₨${formatNumber(s.sell_price ?? 0)}`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", isProfit ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                        {isProfit ? "+" : ""}{formatPKR(pnl)}
                        {tab === "open" && s.unrealized_pnl_pct !== undefined && (
                          <span className="ml-1 opacity-70">({formatPercent(s.unrealized_pnl_pct)})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">{tab === "open" ? s.buy_date : s.sell_date}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {tab === "open" && (
                          <button onClick={() => { setClosing(s); closeForm.setValue("sell_date", new Date().toISOString().slice(0, 10)); }}
                            className="px-2.5 py-1 text-xs bg-brand/10 text-brand hover:bg-brand/20 rounded-lg transition-colors font-medium">
                            Close
                          </button>
                        )}
                        <button onClick={() => onDelete(s.id)} className="px-2.5 py-1 text-xs bg-loss/10 text-loss hover:bg-loss/20 rounded-lg transition-colors font-medium">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset(); setSearchQ(""); setSearchResults([]); }} title="Add Stock Investment">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stock Symbol</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input value={searchQ} onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all"
                placeholder="Search PSX symbol (e.g. OGDC)" />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden">
                {searchResults.map((s) => (
                  <button key={s.symbol} type="button" onClick={() => selectStock(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated text-left transition-colors">
                    <span>
                      <span className="font-bold text-white text-sm">{s.symbol}</span>
                      <span className="text-muted text-xs ml-2">{s.company_name}</span>
                    </span>
                    {s.current_price && <span className="text-xs text-gray-300">₨{formatNumber(s.current_price)}</span>}
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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy Price (₨)</label>
              <input type="number" step="0.01" {...addForm.register("buy_price", { required: true, min: 0.01 })} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Buy Date</label>
              <input type="date" {...addForm.register("buy_date", { required: true })}
                defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Commission (₨)</label>
              <input type="number" step="0.01" {...addForm.register("broker_commission")} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea {...addForm.register("notes")} rows={2} className={inputCls + " resize-none"} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowAdd(false); addForm.reset(); }}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Add Investment</button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal open={!!closing} onClose={() => setClosing(null)} title={`Close ${closing?.symbol}`} size="sm">
        <form onSubmit={closeForm.handleSubmit(onClose)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell Price (₨)</label>
            <input type="number" step="0.01" {...closeForm.register("sell_price", { required: true, min: 0.01 })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sell Date</label>
            <input type="date" {...closeForm.register("sell_date", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Commission (₨)</label>
            <input type="number" step="0.01" {...closeForm.register("sell_commission")} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setClosing(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-profit hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-profit transition-all">Close Trade</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
