"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, CreditCard, Trash2, ArrowUpRight } from "lucide-react";
import { loansApi } from "@/lib/api";
import { formatPKR, cn } from "@/lib/utils";
import type { Loan } from "@/types";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import Link from "next/link";

interface AddLoanForm {
  lender_name: string; description: string; principal_amount: number;
  interest_rate: number; start_date: string; due_date: string; notes: string;
}
interface RepayForm { amount: number; date: string; note: string; }

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [repaying, setRepaying] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  const addForm = useForm<AddLoanForm>({ defaultValues: { interest_rate: 0 } });
  const repayForm = useForm<RepayForm>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await loansApi.list(); setLoans(data); }
    catch { toast.error("Failed to load loans"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (data: AddLoanForm) => {
    try {
      await loansApi.create({
        lender_name: data.lender_name,
        description: data.description?.trim() || undefined,
        principal_amount: Number(data.principal_amount),
        interest_rate: Number(data.interest_rate || 0),
        start_date: data.start_date,
        due_date: data.due_date || undefined,
        notes: data.notes?.trim() || undefined,
      });
      toast.success("Loan added");
      setShowAdd(false);
      addForm.reset();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string | { msg?: string }[] } } })?.response?.data?.detail;
      if (Array.isArray(msg) && msg[0]?.msg) toast.error(msg[0].msg);
      else if (typeof msg === "string") toast.error(msg);
      else toast.error("Failed to add loan");
    }
  };

  const onRepay = async (data: RepayForm) => {
    if (!repaying) return;
    try {
      await loansApi.addRepayment(repaying.id, data);
      toast.success("Repayment recorded");
      setRepaying(null);
      repayForm.reset();
      load();
    }
    catch { toast.error("Failed to record repayment"); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this loan?")) return;
    try { await loansApi.delete(id); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const completedLoans = loans.filter((loan) => loan.progress_percent >= 100 || loan.remaining_balance <= 0);
  const activeLoans = loans.filter((loan) => loan.progress_percent < 100 && loan.remaining_balance > 0);

  const totalDebt = activeLoans.reduce((a, l) => a + l.principal_amount, 0);
  const totalRemaining = activeLoans.reduce((a, l) => a + l.remaining_balance, 0);
  const totalPaid = activeLoans.reduce((a, l) => a + l.total_paid, 0);

  const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

  const renderLoanCard = (l: Loan, isCompleted = false) => (
    <div
      key={l.id}
      className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand/30 hover:shadow-glow-brand-sm transition-all duration-300 group shadow-card"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <Link
            href={`/loans/${l.id}`}
            className="font-semibold text-white hover:text-brand transition-colors flex items-center gap-1"
          >
            {l.lender_name}
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          {l.description && <p className="text-xs text-muted mt-0.5">{l.description}</p>}
          {l.interest_rate > 0 && (
            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
              {l.interest_rate}% p.a.
            </span>
          )}
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-bold", isCompleted ? "text-profit" : "text-white")}>
            {isCompleted ? "Paid Off" : formatPKR(l.remaining_balance)}
          </p>
          <p className="text-[10px] text-muted font-medium uppercase tracking-wide">{isCompleted ? "completed" : "remaining"}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted font-medium">Repaid {l.progress_percent.toFixed(1)}%</span>
          <span className="text-gray-400">{formatPKR(l.total_paid)} / {formatPKR(l.principal_amount)}</span>
        </div>
        <ProgressBar value={l.total_paid} max={l.principal_amount} color="#10b981" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Started {l.start_date}</span>
          {l.due_date && <span className={isCompleted ? "text-profit" : "text-warning"}>{isCompleted ? `Closed ${l.due_date}` : `Due ${l.due_date}`}</span>}
        </div>
        <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!isCompleted && (
            <button
              onClick={() => { setRepaying(l); repayForm.reset({ date: new Date().toISOString().slice(0, 10) }); }}
              className="px-3 py-1.5 bg-profit/10 text-profit hover:bg-profit/20 rounded-lg text-xs font-semibold transition-colors"
            >
              + Repayment
            </button>
          )}
          <button
            onClick={() => onDelete(l.id)}
            className="p-1.5 text-muted hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl animate-fade-up">
      {/* Summary strip */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Total Debt", val: formatPKR(totalDebt), color: "text-white" },
          { label: "Total Paid", val: formatPKR(totalPaid), color: "text-profit" },
          { label: "Remaining", val: formatPKR(totalRemaining), color: "text-loss" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">{label}</p>
            <p className={cn("text-lg sm:text-xl font-bold break-words", color)}>{val}</p>
          </div>
        ))}
      </div>

      <ModuleInsights moduleKey="loans" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-white">Loans</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loans.length === 0 ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No loans added yet</p>
          <p className="text-xs text-muted/60 mt-1">Track your borrowings and repayments here</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Active</h3>
              <span className="text-xs text-muted">{activeLoans.length} loan{activeLoans.length === 1 ? "" : "s"}</span>
            </div>
            {activeLoans.length === 0 ? (
              <div className="text-center py-10 text-muted bg-surface-card border border-surface-border rounded-2xl">
                <p className="text-sm">No active loans</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => renderLoanCard(loan))}
              </div>
            )}
          </section>

          {completedLoans.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Completed</h3>
                <span className="text-xs text-profit">{completedLoans.length} completed</span>
              </div>
              <div className="space-y-3">
                {completedLoans.map((loan) => renderLoanCard(loan, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Add Loan Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset(); }} title="Add Loan">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lender / Source</label>
            <input {...addForm.register("lender_name", { required: true })} className={inputCls} placeholder="Bank, Friend, Family..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description (optional)</label>
            <input {...addForm.register("description")} className={inputCls} placeholder="What was the loan for..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Principal (₨)</label>
              <input type="number" step="0.01" {...addForm.register("principal_amount", { required: true })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interest % p.a.</label>
              <input type="number" step="0.01" {...addForm.register("interest_rate")} className={inputCls} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Date</label>
              <input type="date" {...addForm.register("start_date", { required: true })}
                defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Due Date (optional)</label>
              <input type="date" {...addForm.register("due_date")} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">
              Add Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal open={!!repaying} onClose={() => setRepaying(null)} title={`Repayment — ${repaying?.lender_name}`} size="sm">
        <form onSubmit={repayForm.handleSubmit(onRepay)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (₨)</label>
            <input type="number" step="0.01" {...repayForm.register("amount", { required: true, min: 1 })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
            <input type="date" {...repayForm.register("date", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <input {...repayForm.register("note")} className={inputCls} placeholder="Monthly installment..." />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={() => setRepaying(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-gradient-profit hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-profit transition-all">
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
