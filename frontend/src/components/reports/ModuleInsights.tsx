"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DonutChart from "@/components/charts/DonutChart";
import Modal from "@/components/ui/Modal";
import { reportsApi } from "@/lib/api";
import type { ModuleReportSummary, ReportsOverviewResponse } from "@/types";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

interface Props {
  moduleKey: "stocks" | "mutual_funds" | "goals" | "loans" | "expenses";
}

export default function ModuleInsights({ moduleKey }: Props) {
  const [month, setMonth] = useState<string>("");
  const [report, setReport] = useState<ModuleReportSummary | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    setMonth(localStorage.getItem("report_month_filter") || "");
  }, []);

  const load = async (nextMonth: string) => {
    try {
      const params = nextMonth
        ? { filter_mode: "month" as const, month: nextMonth }
        : { filter_mode: "all" as const };
      const { data } = await reportsApi.overview(params);
      const typed = data as ReportsOverviewResponse;
      const moduleData = typed.modules.find((m) => m.module === moduleKey) || null;
      setReport(moduleData);
    } catch {
      toast.error("Failed to load module insights");
    }
  };

  useEffect(() => {
    if (month !== "") {
      localStorage.setItem("report_month_filter", month);
    }
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, month]);

  const chartData = useMemo(
    () =>
      (report?.categories || []).map((c, i) => ({
        name: c.name,
        value: c.value,
        color: COLORS[i % COLORS.length],
      })),
    [report]
  );

  const onExport = async (sections: Record<string, boolean>) => {
    try {
      const payload = {
        ...sections,
        filter_mode: month ? "month" : "all",
        month: month || undefined,
      };
      const { data } = await reportsApi.exportPdf(payload);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pakfinance-export.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Month Filter</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-surface border border-surface-border rounded px-2 py-1 text-xs text-white"
          />
          {month && (
            <button
              onClick={() => setMonth("")}
              className="text-xs text-muted hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="text-xs px-3 py-1.5 rounded-md bg-brand/15 text-brand hover:bg-brand/25"
        >
          Export PDF
        </button>
      </div>
      <DonutChart data={chartData} height={200} />
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export PDF" size="sm">
        <ExportForm onSubmit={onExport} />
      </Modal>
    </div>
  );
}

function ExportForm({ onSubmit }: { onSubmit: (sections: Record<string, boolean>) => Promise<void> }) {
  const [sections, setSections] = useState({
    include_dashboard: false,
    include_stocks: true,
    include_mutual_funds: true,
    include_goals: true,
    include_loans: true,
    include_expenses: true,
    include_summary: true,
  });

  return (
    <div className="space-y-3">
      {Object.keys(sections).map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={sections[k as keyof typeof sections]}
            onChange={(e) => setSections((s) => ({ ...s, [k]: e.target.checked }))}
            className="accent-brand"
          />
          {k.replace("include_", "").replaceAll("_", " ")}
        </label>
      ))}
      <button
        onClick={() => void onSubmit(sections)}
        className="w-full mt-2 bg-brand hover:bg-brand-dark text-white rounded-lg py-2.5 text-sm font-semibold"
      >
        Download PDF
      </button>
    </div>
  );
}
