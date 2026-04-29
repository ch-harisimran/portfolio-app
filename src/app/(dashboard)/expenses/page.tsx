"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { expensesApi } from "@/lib/api";
import { formatPKR, cn } from "@/lib/utils";
import type { IncomeEntry, ExpenseSummaryResponse } from "@/types";
import Modal from "@/components/ui/Modal";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

interface IncomeForm {
  income_type: string; source_name: string; amount: number; date: string; note: string;
}
interface ExpenseForm {
  category: string; amount: number; date: string; note: string;
}

const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

export default function ExpensesPage() {
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryResponse | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [expenseFor, setExpenseFor] = useState<IncomeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const incomeForm = useForm<IncomeForm>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });
  const expenseForm = useForm<ExpenseForm>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incomeRes, summaryRes] = await Promise.all([expensesApi.listIncomes(), expensesApi.summary()]);
      setIncomes(incomeRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error("Failed to load expenses module");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onCreateIncome = async (data: IncomeForm) => {
    try {
      await expensesApi.createIncome({
        income_type: data.income_type,
        source_name: data.source_name?.trim() || undefined,
        amount: Number(data.amount),
        date: data.date,
        note: data.note?.trim() || undefined,
      });
      toast.success("Income added");
      setShowIncomeModal(false);
      incomeForm.reset({ date: new Date().toISOString().slice(0, 10) });
      load();
    } catch { toast.error("Failed to add income"); }
  };

  const onAddExpense = async (data: ExpenseForm) => {
    if (!expenseFor) return;
    try {
      await expensesApi.addExpense(expenseFor.id, {
        category: data.category,
        amount: Number(data.amount),
        date: data.date,
        note: data.note?.trim() || undefined,
      });
      toast.success("Expense added");
      setExpenseFor(null);
      expenseForm.reset({ date: new Date().toISOString().slice(0, 10) });
      load();
    } catch { toast.error("Failed to add expense"); }
  };

  const deleteIncome = async (id: number) => {
    if (!confirm("Delete this income and its linked expenses?")) return;
    try { await expensesApi.deleteIncome(id); toast.success("Income deleted"); load(); }
    catch { toast.error("Failed to delete income"); }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    try { await expensesApi.deleteExpense(id); toast.success("Expense deleted"); load(); }
    catch { toast.error("Failed to delete expense"); }
  };

  const monthNow = summary?.monthly[summary.monthly.length - 1];
  const yearNow = summary?.yearly[summary.yearly.length - 1];

  return (
    <div className="space-y-5 max-w-7xl animate-fade-up">
      {/* Page header */}
      <div className="bg-surface-card border border-brand/20 rounded-2xl p-5 relative overflow-hidden shadow-card">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand/5 rounded-full blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-brand-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-brand uppercase tracking-widest font-semibold mb-0.5">Separate Module</p>
              <h1 className="text-xl font-bold text-white">Expense Tracking</h1>
              <p className="text-xs text-muted mt-0.5">Track income sources, expenses, and savings month by month.</p>
            </div>
          </div>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center justify-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Income
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: `Month (${monthNow?.period || "—"})`, val: formatPKR(monthNow?.net_savings || 0), icon: monthNow && monthNow.net_savings >= 0 ? TrendingUp : TrendingDown, color: (monthNow?.net_savings || 0) >= 0 ? "text-profit" : "text-loss", sub: `In: ${formatPKR(monthNow?.income_total || 0)}` },
          { label: "Month Expenses", val: formatPKR(monthNow?.expense_total || 0), icon: DollarSign, color: "text-warning", sub: "This month" },
          { label: `Year (${yearNow?.period || "—"})`, val: formatPKR(yearNow?.net_savings || 0), icon: yearNow && yearNow.net_savings >= 0 ? TrendingUp : TrendingDown, color: (yearNow?.net_savings || 0) >= 0 ? "text-profit" : "text-loss", sub: `In: ${formatPKR(yearNow?.income_total || 0)}` },
          { label: "Year Expenses", val: formatPKR(yearNow?.expense_total || 0), icon: DollarSign, color: "text-loss", sub: "This year" },
        ].map(({ label, val, icon: Icon, color, sub }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">{label}</p>
              <Icon className={cn("w-3.5 h-3.5", color)} />
            </div>
            <p className={cn("text-lg font-bold", color)}>{val}</p>
            <p className="text-[10px] text-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Income entries */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Income Entries</h2>
            {incomes.length === 0 ? (
              <div className="bg-surface-card border border-surface-border rounded-2xl p-10 text-center text-muted">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No income entries yet</p>
                <p className="text-xs text-muted/60 mt-1">Add your first income source to start tracking</p>
              </div>
            ) : incomes.map((income) => (
              <div key={income.id} className="bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-brand/20 transition-all shadow-card group">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{income.income_type}</p>
                    <p className="text-xs text-muted">{income.source_name || "General"} · {income.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatPKR(income.amount)}</p>
                    <p className={cn("text-xs font-medium", income.remaining >= 0 ? "text-profit" : "text-loss")}>
                      {formatPKR(income.remaining)} left
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <button
                    onClick={() => { setExpenseFor(income); expenseForm.setValue("date", new Date().toISOString().slice(0, 10)); }}
                    className="px-3 py-1.5 text-xs bg-brand/10 text-brand hover:bg-brand/20 rounded-lg transition-colors font-semibold"
                  >
                    + Add Expense
                  </button>
                  <button
                    onClick={() => deleteIncome(income.id)}
                    className="px-3 py-1.5 text-xs bg-loss/10 text-loss hover:bg-loss/20 rounded-lg transition-colors font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-1.5">
                  {income.expenses.length === 0 ? (
                    <p className="text-xs text-muted/70 italic">No expenses linked yet.</p>
                  ) : income.expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs bg-surface rounded-lg px-3 py-2 group/exp">
                      <span className="text-gray-400">{e.category} · {e.date}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-white font-medium">{formatPKR(e.amount)}</span>
                        <button onClick={() => deleteExpense(e.id)} className="text-muted hover:text-loss transition-colors opacity-0 group-hover/exp:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right column: insights + tables */}
          <div className="space-y-5">
            <ModuleInsights moduleKey="expenses" />

            {/* Monthly summary table */}
            <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-white">Monthly Summary</h3>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-card">
                    <tr className="border-b border-surface-border">
                      {["Month", "Income", "Expense", "Savings"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.monthly || []).map((r) => (
                      <tr key={r.period} className="border-b border-surface-border/40 hover:bg-surface-elevated/30 transition-colors">
                        <td className="px-3 py-2.5 text-white font-medium">{r.period}</td>
                        <td className="px-3 py-2.5 text-gray-300">{formatPKR(r.income_total)}</td>
                        <td className="px-3 py-2.5 text-gray-300">{formatPKR(r.expense_total)}</td>
                        <td className={cn("px-3 py-2.5 font-semibold", r.net_savings >= 0 ? "text-profit" : "text-loss")}>
                          {formatPKR(r.net_savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Yearly summary table */}
            <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-white">Yearly Summary</h3>
              </div>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-card">
                    <tr className="border-b border-surface-border">
                      {["Year", "Income", "Expense", "Savings"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.yearly || []).map((r) => (
                      <tr key={r.period} className="border-b border-surface-border/40 hover:bg-surface-elevated/30 transition-colors">
                        <td className="px-3 py-2.5 text-white font-medium">{r.period}</td>
                        <td className="px-3 py-2.5 text-gray-300">{formatPKR(r.income_total)}</td>
                        <td className="px-3 py-2.5 text-gray-300">{formatPKR(r.expense_total)}</td>
                        <td className={cn("px-3 py-2.5 font-semibold", r.net_savings >= 0 ? "text-profit" : "text-loss")}>
                          {formatPKR(r.net_savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      <Modal open={showIncomeModal} onClose={() => setShowIncomeModal(false)} title="Add Income">
        <form onSubmit={incomeForm.handleSubmit(onCreateIncome)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Income Type</label>
              <input {...incomeForm.register("income_type", { required: true })} className={inputCls}
                placeholder="Salary, Business, Freelance..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source Name (optional)</label>
              <input {...incomeForm.register("source_name")} className={inputCls} placeholder="Company/Client name" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (₨)</label>
              <input type="number" step="0.01" {...incomeForm.register("amount", { required: true, min: 0.01 })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
              <input type="date" {...incomeForm.register("date", { required: true })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <input {...incomeForm.register("note")} className={inputCls} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setShowIncomeModal(false)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Save Income</button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={!!expenseFor} onClose={() => setExpenseFor(null)} title={`Add Expense — ${expenseFor?.income_type || ""}`} size="sm">
        <form onSubmit={expenseForm.handleSubmit(onAddExpense)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
            <input {...expenseForm.register("category", { required: true })} className={inputCls}
              placeholder="Food, Travel, Bills..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (₨)</label>
              <input type="number" step="0.01" {...expenseForm.register("amount", { required: true, min: 0.01 })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
              <input type="date" {...expenseForm.register("date", { required: true })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <input {...expenseForm.register("note")} className={inputCls} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setExpenseFor(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Save Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
