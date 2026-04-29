"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, TrendingUp, Landmark, Target, CreditCard,
  History, Settings, LogOut, ChevronLeft, ChevronRight, CalendarDays, Wallet, Zap, X, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearTokens, getUser } from "@/lib/auth";
import { useEffect, useState } from "react";
import type { User as UserType } from "@/types";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stocks", label: "PSX Stocks", icon: TrendingUp },
  { href: "/mutual-funds", label: "Mutual Funds", icon: Landmark },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/loans", label: "Loans", icon: CreditCard },
  { href: "/history", label: "History", icon: History },
  { href: "/summary", label: "Summary", icon: CalendarDays },
];

const separateModules = [
  { href: "/bank-accounts", label: "Bank Accounts", icon: Landmark },
  { href: "/expenses", label: "Expenses", icon: Wallet },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const logout = () => {
    clearTokens();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-surface-card border-r border-surface-border transition-transform duration-300 shadow-[1px_0_0_rgba(255,255,255,0.02)]",
        "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-[68px]" : "w-[220px]"
      )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-surface-border gap-3 px-4",
        collapsed && "justify-center px-2"
      )}>
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-brand-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-brand opacity-20 blur-md -z-10" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-white text-[15px] leading-none">PakFinance</p>
            <p className="text-[10px] text-brand mt-0.5 font-medium tracking-wider">INVESTOR</p>
          </div>
        )}
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                active
                  ? "bg-brand/15 text-brand"
                  : "text-gray-500 hover:bg-surface-elevated hover:text-gray-200",
                collapsed && "justify-center px-2"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
              )}
              <Icon className={cn(
                "shrink-0 transition-colors",
                active ? "text-brand" : "text-gray-600 group-hover:text-gray-300",
                collapsed ? "w-5 h-5" : "w-4.5 h-4.5"
              )} style={{ width: collapsed ? 20 : 17, height: collapsed ? 20 : 17 }} />
              {!collapsed && <span className={active ? "text-brand" : ""}>{label}</span>}
            </Link>
          );
        })}

        {/* Separate module section */}
        <div className={cn("pt-3 mt-2 border-t border-surface-border/50", collapsed && "pt-2 mt-1")}>
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-muted/60 font-semibold">
              Separate
            </p>
          )}
          {separateModules.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative group",
                  active
                    ? "bg-brand text-white shadow-glow-brand-sm"
                    : "bg-brand/10 text-brand hover:bg-brand/20",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon style={{ width: 17, height: 17 }} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-surface-border py-2 px-2 space-y-0.5">
        <Link
          href="/settings"
          onClick={onCloseMobile}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-surface-elevated hover:text-gray-200 transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings style={{ width: 17, height: 17 }} className="shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        {user?.is_admin && (
          <Link
            href="/admin"
            onClick={onCloseMobile}
            title={collapsed ? "Admin" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-surface-elevated hover:text-gray-200 transition-all",
              collapsed && "justify-center px-2"
            )}
          >
            <ShieldCheck style={{ width: 17, height: 17 }} className="shrink-0" />
            {!collapsed && "Admin"}
          </Link>
        )}
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-loss/10 hover:text-loss transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut style={{ width: 17, height: 17 }} className="shrink-0" />
          {!collapsed && "Logout"}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted hover:text-gray-400 transition-all hover:bg-surface-elevated/50",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </div>
      </aside>
    </>
  );
}
