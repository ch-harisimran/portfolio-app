"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Landmark, Target, CreditCard,
  Activity, BarChart3, ArrowUpRight, ArrowDownRight, Wallet2, Building2
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import PortfolioChart from "@/components/charts/PortfolioChart";
import DonutChart from "@/components/charts/DonutChart";
import { dashboardApi } from "@/lib/api";
import { formatPKR, formatPercent, pnlColor } from "@/lib/utils";
import type { DashboardSummary } from "@/types";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl animate-pulse">
      <div className="h-40 rounded-2xl bg-surface-elevated shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-surface-elevated shimmer" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-surface-elevated shimmer" />
        <div className="h-72 rounded-2xl bg-surface-elevated shimmer" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allocation, setAllocation] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, allocRes] = await Promise.all([
          dashboardApi.summary(),
          dashboardApi.allocation(),
        ]);
        setSummary(sumRes.data);
        setAllocation(allocRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!summary) return <div className="text-muted">Failed to load dashboard</div>;

  const pnlPositive = summary.total_pnl >= 0;

  return (
    <div className="space-y-5 max-w-7xl animate-fade-up">

      {/* Hero — Net Worth */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-surface-card to-surface-card p-4 sm:p-6 shadow-card">
        {/* Background rings */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full border border-brand/10 opacity-50" />
        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full border border-brand/15 opacity-40" />
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-brand/5 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Total Net Worth</p>
            <p className="text-3xl sm:text-5xl font-bold text-white tracking-tight break-words">
              {formatPKR(summary.total_net_worth)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                pnlPositive ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
              )}>
                {pnlPositive
                  ? <ArrowUpRight className="w-3.5 h-3.5" />
                  : <ArrowDownRight className="w-3.5 h-3.5" />}
                {pnlPositive ? "+" : ""}{formatPKR(summary.total_pnl)} ({formatPercent(summary.total_pnl_percent)})
              </div>
              <span className="text-xs text-muted">All-time P&L</span>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 sm:text-right w-full sm:w-auto">
            <div className="bg-surface-elevated/60 rounded-xl px-4 py-2.5">
              <p className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-0.5">Invested</p>
              <p className="text-sm font-bold text-white">{formatPKR(summary.total_invested)}</p>
            </div>
            <div className="bg-surface-elevated/60 rounded-xl px-4 py-2.5">
              <p className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-0.5">Loans</p>
              <p className="text-sm font-bold text-loss">{formatPKR(summary.total_loans_remaining)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset cards */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="PSX Stocks"
          value={formatPKR(summary.stocks_value)}
          sub={`Invested ${formatPKR(summary.stocks_invested)}`}
          icon={TrendingUp}
          accentColor="brand"
        />
        <StatCard
          label="Mutual Funds"
          value={formatPKR(summary.mutual_funds_value)}
          sub={`Invested ${formatPKR(summary.mutual_funds_invested)}`}
          icon={Landmark}
          accentColor="profit"
        />
        <StatCard
          label="Bank Holdings"
          value={formatPKR(summary.bank_holdings_value)}
          icon={Building2}
          accentColor="warning"
        />
        <StatCard
          label="Goals Saved"
          value={formatPKR(summary.total_goals_saved)}
          icon={Target}
          accentColor="purple"
        />
        <StatCard
          label="Loans Remaining"
          value={formatPKR(summary.total_loans_remaining)}
          icon={CreditCard}
          accentColor="loss"
        />
      </div>

      {/* P&L row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Unrealized P&L"
          value={formatPKR(summary.unrealized_pnl)}
          sub={summary.unrealized_pnl >= 0 ? "Open positions profit" : "Floating loss"}
          subColor={pnlColor(summary.unrealized_pnl)}
          icon={Activity}
          accentColor={summary.unrealized_pnl >= 0 ? "profit" : "loss"}
        />
        <StatCard
          label="Realized P&L"
          value={formatPKR(summary.realized_pnl)}
          sub="From closed trades"
          subColor={pnlColor(summary.realized_pnl)}
          icon={summary.realized_pnl >= 0 ? TrendingUp : TrendingDown}
          accentColor={summary.realized_pnl >= 0 ? "profit" : "loss"}
        />
        <StatCard
          label="Active Portfolio"
          value={formatPKR(summary.total_invested)}
          sub="Total deployed capital"
          icon={BarChart3}
          accentColor="brand"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Portfolio chart */}
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Portfolio Growth</h2>
              <p className="text-xs text-muted mt-0.5">Net worth trend (30 days)</p>
            </div>
            <span className="text-[10px] font-semibold text-muted bg-surface-elevated px-2.5 py-1 rounded-full uppercase tracking-wider">30D</span>
          </div>
          <PortfolioChart data={summary.portfolio_history} />
        </div>

        {/* Allocation */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-card flex flex-col">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white">Allocation</h2>
            <p className="text-xs text-muted mt-0.5">Active portfolio breakdown</p>
          </div>
          <DonutChart data={allocation} height={180} />
          <div className="mt-4 space-y-2">
            {allocation.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-gray-400">{item.name}</span>
                </div>
                <span className="text-xs text-white font-semibold">{formatPKR(item.value)}</span>
              </div>
            ))}
            {!allocation.length && (
              <div className="flex flex-col items-center py-6 text-center">
                <Wallet2 className="w-8 h-8 text-muted opacity-40 mb-2" />
                <p className="text-xs text-muted">Add investments to see allocation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
