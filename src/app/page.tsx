"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated, isPinUnlocked, isRememberMeEnabled } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    if (!user?.has_pin) {
      router.replace("/settings");
      return;
    }
    if (isRememberMeEnabled() && !isPinUnlocked()) {
      router.replace("/unlock");
      return;
    }
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
