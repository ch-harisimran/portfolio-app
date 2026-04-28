"use client";
import { useEffect, useState } from "react";
import { RefreshCw, User } from "lucide-react";
import { getUser } from "@/lib/auth";
import { settingsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { User as UserType } from "@/types";

export default function Header({ title }: { title: string }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([settingsApi.refreshPSX(), settingsApi.refreshMUFAP()]);
      toast.success("Market data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="h-14 border-b border-surface-border bg-surface-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        <div className="hidden sm:block w-px h-4 bg-surface-border" />
        <span className="hidden sm:block text-xs text-muted">
          {new Date().toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-gray-300 hover:bg-surface-elevated transition-all disabled:opacity-40 border border-transparent hover:border-surface-border"
          title="Refresh market data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>

        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-surface-border">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shadow-glow-brand-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">{user.full_name || user.email}</p>
              <p className="text-[10px] text-muted leading-tight">{user.currency}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
