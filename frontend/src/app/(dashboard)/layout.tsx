"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { authApi } from "@/lib/api";
import { getOrCreateDeviceId, getUser, isAuthenticated, isPinUnlocked, isRememberMeEnabled, setPinUnlocked } from "@/lib/auth";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/stocks": "PSX Stocks",
  "/mutual-funds": "Mutual Funds",
  "/goals": "Goals",
  "/loans": "Loans",
  "/history": "History",
  "/summary": "Summary",
  "/expenses": "Expenses",
  "/settings": "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    if (!user?.has_pin && pathname !== "/settings") {
      router.replace("/settings");
      return;
    }
    if (isRememberMeEnabled() && user?.has_pin && !isPinUnlocked()) {
      router.replace("/unlock");
    }
  }, [router, pathname]);

  useEffect(() => {
    if (!isRememberMeEnabled()) return;
    const user = getUser();
    const deviceId = getOrCreateDeviceId();
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      void authApi.sessionPing(deviceId).catch(() => undefined);
      timer = setTimeout(() => {
        if (user?.email) {
          void authApi.sessionLock(deviceId).catch(() => undefined);
        }
        setPinUnlocked(false);
        router.replace("/unlock");
      }, 3 * 60 * 1000);
    };
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }));
    arm();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, arm));
    };
  }, [router]);

  const segment = "/" + (pathname.split("/")[1] || "");
  const title = titles[segment] || "PakFinance";

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
