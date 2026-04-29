"use client";
import { useEffect, useState } from "react";
import { Menu, RefreshCw, User } from "lucide-react";
import { getUser } from "@/lib/auth";
import { settingsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { User as UserType } from "@/types";

export default function Header({ title, onOpenMobileNav }: { title: string; onOpenMobileNav?: () => void }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const results = await Promise.allSettled([settingsApi.refreshPSX(), settingsApi.refreshMUFAP()]);
      const failed = results.filter((result) => result.status === "rejected");
      if (!failed.length) {
        toast.success("PSX and MUFAP data refreshed");
      } else if (failed.length === 1) {
        const message = (failed[0] as PromiseRejectedResult).reason?.response?.data?.detail || "One market source failed to refresh";
        toast.error(message);
      } else {
        toast.error("PSX and MUFAP refresh both failed");
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="h-14 border-b border-surface-border bg-surface-card/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>
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
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs text-muted hover:text-gray-300 hover:bg-surface-elevated transition-all disabled:opacity-40 border border-transparent hover:border-surface-border"
          title="Refresh market data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 ml-1 border-l border-surface-border">
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
