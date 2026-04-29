"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({ open, onClose, title, children, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        "relative w-full max-h-[calc(100vh-1rem)] sm:max-h-[85vh] bg-surface-card border border-surface-border rounded-t-2xl sm:rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] animate-slide-up overflow-hidden",
        sizes[size]
      )}>
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />

        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-surface-border">
          <h2 className="text-sm sm:text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-elevated transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(100vh-5rem)] sm:max-h-[calc(85vh-4.5rem)]">{children}</div>
      </div>
    </div>
  );
}
