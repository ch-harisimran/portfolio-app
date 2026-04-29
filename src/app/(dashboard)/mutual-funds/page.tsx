"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Landmark, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { fundsApi } from "@/lib/api";
import { formatPKR, formatNumber, formatPercent, cn } from "@/lib/utils";
import type { MutualFundInvestment, FundSearchResult } from "@/types";
import Modal from "@/components/ui/Modal";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import Link from "next/link";

interface AddForm {
  fund_name: string; amc_name: string; fund_type: string;
  units: number; purchase_nav: number; purchase_date: string;
  load_percentage: number; notes: string;
}
interface CloseForm { sell_nav: number; sell_date: string; }
interface ManualNavForm { current_nav: number; }

const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

export default function MutualFundsPage() {
  const [funds, setFunds] = useState<MutualFundInvestment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [closing, setClosing] = useState<MutualFundInvestment | null>(null);
  const [pricing, setPricing] = useState<MutualFundInvestment | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([]);
  const [allFundOptions, setAllFundOptions] = useState<FundSearchResult[]>([]);
  const [searchQ, setSearchQ] = useState("");

  const addForm = useForm<AddForm>({ defaultValues: { load_percentage: 0 } });
  const closeForm = useForm<CloseForm>();
  const manualNavForm = useForm<ManualNavForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fundsApi.list(tab === "closed");
      setFunds(data);
    } catch { toast.error("Failed to load funds"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const loadFundOptions = useCallback(async () => {
    try {
      const { data } = await fundsApi.search("");
      setAllFundOptions(data);
    } catch { setAllFundOptions([]); }
  }, []);

  useEffect(() => { loadFundOptions(); }, [loadFundOptions]);

  const onSearch = (q: string) => {
    setSearchQ(q);
    if (q.length < 1) { setSearchResults(allFundOptions.slice(0, 12)); return; }
    const qq = q.toLowerCase();
    setSearchResults(allFundOptions.filter((f) =>
      f.fund_name.toLowerCase().includes(qq) || (f.amc_name || "").toLowerCase().includes(qq)
    ).slice(0, 20));
  };

  const selectFund = (f: FundSearchResult) => {
    addForm.setValue("fund_name", f.fund_name);
    addForm.setValue("amc_name", f.amc_name || "");
    addForm.setValue("fund_type", f.fund_type || "");
    if (f.current_nav) addForm.setValue("purchase_nav", f.current_nav);
    setSearchResults([]);
    setSearchQ(f.fund_name);
  };

  const onAdd = async (data: AddForm) => {
    try {
      await fundsApi.create(data);
      toast.success("Fund investment added");
      setShowAdd(false); addForm.reset(); setSearchQ(""); load();
    } catch { toast.error("Failed to add fund"); }
  };

  const onClose = async (data: CloseForm) => {
    if (!closing) return;
    try {
      await fundsApi.close(closing.id, data);
      toast.success("Investment closed");
      setClosing(null); closeForm.reset(); load();
    } catch { toast.error("Failed to close"); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this mutual fund trade?")) return;
    try { await fundsApi.delete(id); toast.success("Trade deleted"); load(); }
    catch { toast.error("Failed to delete trade"); }
  };

  const onSetManualNav = async (data: ManualNavForm) => {
    if (!pricing) return;
    try {
      await fundsApi.setManualNav({
        fund_name: pricing.fund_name,
        current_nav: data.current_nav,
        amc_name: pricing.amc_name,
        fund_type: pricing.fund_type,
        nav_date: new Date().toISOString().slice(0, 10),
      });
      toast.success("Current NAV updated");
      setPricing(null); manualNavForm.reset(); load(); loadFundOptions();
    } catch { toast.error("Failed to update NAV"); }
  };

  const totalInvested = funds.reduce((a, f) => a + f.invested_amount, 0);
  const totalCurrent = funds.reduce((a, f) => a + (f.current_value ?? f.invested_amount), 0);
  const totalPnl = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-5 max-w-6xl animate-fade-up">
      {/* Summary strip */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Invested", val: formatPKR(totalInvested), color: "text-white" },
          { label: "Current Value", val: formatPKR(totalCurrent), color: "text-brand" },
          { label: "P&L", val: `${totalPnl >= 0 ? "+" : ""}${formatPKR(totalPnl)}`, color: totalPnl >= 0 ? "text-profit" : "text-loss", sub: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` },
        ].map(({ label, val, color, sub }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">{label}</p>
            <p className={cn("text-lg sm:text-xl font-bold break-words", color)}>{val}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <ModuleInsights moduleKey="mutual_funds" />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          className="flex items-center justify-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all">
          <Plus className="w-4 h-4" /> Add Fund
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : funds.length === 0 ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No {tab} mutual fund investments yet</p>
          <p className="text-xs text-muted/60 mt-1">Add your MUFAP fund holdings to track NAV performance</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                {["Fund", "Units", "NAV (Buy)", "Invested", tab === "open" ? "Current NAV" : "Redemption NAV", "P&L", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {funds.map((f) => {
                const pnl = tab === "open" ? (f.unrealized_pnl ?? 0) : (f.realized_pnl ?? 0);
                const isProfit = pnl >= 0;
                return (
                  <tr key={f.id} className="hover:bg-surface-elevated/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <Link href={`/mutual-funds/${f.id}`} className="group/link">
                        <p className="font-bold text-white text-xs leading-tight group-hover/link:text-brand transition-colors flex items-center gap-1">
                          {f.fund_name}
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-[10px] text-muted">{f.amc_name} · {f.fund_type}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium">{formatNumber(f.units, 4)}</td>
                    <td className="px-4 py-3.5 text-gray-300">₨{formatNumber(f.purchase_nav)}</td>
                    <td className="px-4 py-3.5 text-gray-300">{formatPKR(f.invested_amount)}</td>
                    <td className="px-4 py-3.5 text-gray-300">
                      {tab === "open" ? (f.current_nav ? `₨${formatNumber(f.current_nav)}` : "—") : `₨${formatNumber(f.sell_nav ?? 0)}`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", isProfit ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                        {isProfit ? "+" : ""}{formatPKR(pnl)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">{tab === "open" ? f.purchase_date : f.sell_date}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {tab === "open" && (
                          <button onClick={() => { setClosing(f); closeForm.setValue("sell_date", new Date().toISOString().slice(0, 10)); }}
                            className="px-2.5 py-1 text-xs bg-brand/10 text-brand hover:bg-brand/20 rounded-lg transition-colors font-medium">Redeem</button>
                        )}
                        <button
                          onClick={() => { setPricing(f); manualNavForm.setValue("current_nav", f.current_nav || f.purchase_nav); }}
                          className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(f.id)} className="p-1.5 text-muted hover:text-loss hover:bg-loss/10 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset(); setSearchQ(""); setSearchResults([]); }} title="Add Mutual Fund Investment">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fund Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input value={searchQ} onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all"
                placeholder="Search fund name or AMC..." />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((f) => (
                  <button key={f.fund_name} type="button" onClick={() => selectFund(f)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated text-left transition-colors">
                    <span>
                      <span className="font-semibold text-white text-xs">{f.fund_name}</span>
                      <span className="text-muted text-xs ml-2">{f.amc_name}</span>
                    </span>
                    {f.current_nav && <span className="text-xs text-gray-300">NAV ₨{formatNumber(f.current_nav)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="hidden" {...addForm.register("fund_name", { required: true })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Units</label>
              <input type="number" step="0.0001" {...addForm.register("units", { required: true })} className={inputCls} placeholder="0.0000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Purchase NAV (₨)</label>
              <input type="number" step="0.0001" {...addForm.register("purchase_nav", { required: true })} className={inputCls} placeholder="0.0000" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
              <input type="date" {...addForm.register("purchase_date", { required: true })}
                defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Load % (optional)</label>
              <input type="number" step="0.01" {...addForm.register("load_percentage")} className={inputCls} placeholder="0.00" />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => { setShowAdd(false); addForm.reset(); }}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Add Investment</button>
          </div>
        </form>
      </Modal>

      {/* Manual NAV Modal */}
      <Modal open={!!pricing} onClose={() => setPricing(null)} title={`Set Current NAV — ${pricing?.fund_name || ""}`} size="sm">
        <form onSubmit={manualNavForm.handleSubmit(onSetManualNav)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current NAV (₨)</label>
            <input type="number" step="0.0001" {...manualNavForm.register("current_nav", { required: true, min: 0.0001 })} className={inputCls} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setPricing(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Save Price</button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal open={!!closing} onClose={() => setClosing(null)} title="Redeem Fund" size="sm">
        <form onSubmit={closeForm.handleSubmit(onClose)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Redemption NAV (₨)</label>
            <input type="number" step="0.0001" {...closeForm.register("sell_nav", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Redemption Date</label>
            <input type="date" {...closeForm.register("sell_date", { required: true })} className={inputCls} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setClosing(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-profit hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-profit transition-all">Redeem</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
