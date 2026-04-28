"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Target, Calendar, Trash2 } from "lucide-react";
import { goalsApi } from "@/lib/api";
import { formatPKR, cn } from "@/lib/utils";
import type { Goal } from "@/types";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import ModuleInsights from "@/components/reports/ModuleInsights";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { differenceInDays, format } from "date-fns";

interface AddForm { name: string; description: string; target_amount: number; deadline: string; color: string; }
interface ContribForm { amount: number; date: string; note: string; }

const GOAL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand focus:shadow-glow-brand-sm transition-all";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const addForm = useForm<AddForm>({ defaultValues: { color: "#3b82f6" } });
  const contribForm = useForm<ContribForm>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await goalsApi.list(); setGoals(data); }
    catch { toast.error("Failed to load goals"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (data: AddForm) => {
    try { await goalsApi.create(data); toast.success("Goal created"); setShowAdd(false); addForm.reset(); load(); }
    catch { toast.error("Failed to create goal"); }
  };

  const onContribute = async (data: ContribForm) => {
    if (!contributing) return;
    try { await goalsApi.addContribution(contributing.id, data); toast.success("Contribution added!"); setContributing(null); contribForm.reset(); load(); }
    catch { toast.error("Failed to add contribution"); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this goal?")) return;
    try { await goalsApi.delete(id); toast.success("Goal deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0);
  const totalSaved = goals.reduce((a, g) => a + g.total_saved, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-5 max-w-5xl animate-fade-up">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Goals", val: goals.length.toString(), color: "text-white" },
          { label: "Total Target", val: formatPKR(totalTarget), color: "text-brand" },
          { label: "Total Saved", val: formatPKR(totalSaved), color: "text-profit", sub: `${overallPct.toFixed(1)}% of target` },
        ].map(({ label, val, color, sub }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-2xl p-4 relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1.5">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{val}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <ModuleInsights moduleKey="goals" />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your Goals</h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gradient-brand hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-glow-brand-sm transition-all">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20 text-muted bg-surface-card border border-surface-border rounded-2xl">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No goals yet</p>
          <p className="text-xs text-muted/60 mt-1">Create your first savings goal to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const daysLeft = g.deadline ? differenceInDays(new Date(g.deadline), new Date()) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0;
            const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 30;
            return (
              <div key={g.id}
                className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand/30 hover:shadow-glow-brand-sm transition-all duration-300 group shadow-card relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, transparent, ${g.color}60, transparent)` }} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${g.color}20`, border: `1px solid ${g.color}30` }}>
                      <Target className="w-5 h-5" style={{ color: g.color }} />
                    </div>
                    <div>
                      <Link href={`/goals/${g.id}`} className="font-semibold text-white hover:text-brand transition-colors text-sm">{g.name}</Link>
                      {g.deadline && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#6b7280" }}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(g.deadline), "dd MMM yyyy")}
                          {daysLeft !== null && (
                            <span className="ml-1">{isOverdue ? "Overdue" : `${daysLeft}d left`}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => onDelete(g.id)} className="p-1.5 rounded-lg text-muted hover:text-loss hover:bg-loss/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted font-medium">Progress</span>
                    <span className="font-bold text-white">{g.progress_percent.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={g.total_saved} max={g.target_amount} color={g.color} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-sm">{formatPKR(g.total_saved)}</span>
                    <span className="text-muted text-xs"> / {formatPKR(g.target_amount)}</span>
                    {g.remaining_amount > 0 && (
                      <p className="text-xs text-muted/70 mt-0.5">{formatPKR(g.remaining_amount)} remaining</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setContributing(g); contribForm.reset({ date: new Date().toISOString().slice(0, 10) }); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                    style={{ background: `${g.color}15`, color: g.color }}
                  >
                    + Add Funds
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset(); }} title="Create New Goal">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Goal Name</label>
            <input {...addForm.register("name", { required: true })} className={inputCls}
              placeholder="e.g. Emergency Fund, Car, Hajj..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Amount (₨)</label>
              <input type="number" {...addForm.register("target_amount", { required: true })} className={inputCls} placeholder="500000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deadline (optional)</label>
              <input type="date" {...addForm.register("deadline")} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Color</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => addForm.setValue("color", c)}
                  className={cn("w-7 h-7 rounded-full transition-all", addForm.watch("color") === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105")}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-brand hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-brand-sm transition-all">Create Goal</button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal open={!!contributing} onClose={() => setContributing(null)} title={`Add to: ${contributing?.name}`} size="sm">
        <form onSubmit={contribForm.handleSubmit(onContribute)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (₨)</label>
            <input type="number" step="0.01" {...contribForm.register("amount", { required: true, min: 1 })} className={inputCls} placeholder="10000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
            <input type="date" {...contribForm.register("date", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <input {...contribForm.register("note")} className={inputCls} placeholder="Monthly savings..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setContributing(null)}
              className="flex-1 border border-surface-border rounded-xl py-2.5 text-sm text-gray-400 hover:bg-surface-elevated transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-gradient-profit hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-semibold shadow-glow-profit transition-all">Add Contribution</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
