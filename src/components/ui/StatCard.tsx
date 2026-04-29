import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: LucideIcon;
  iconColor?: string;
  accentColor?: string;
  className?: string;
}

const accentMap: Record<string, { bar: string; icon: string; glow: string }> = {
  brand: {
    bar: "from-brand to-brand-dark",
    icon: "bg-gradient-brand shadow-glow-brand-sm",
    glow: "hover:shadow-glow-brand-sm",
  },
  profit: {
    bar: "from-profit to-emerald-600",
    icon: "bg-gradient-profit shadow-glow-profit",
    glow: "hover:shadow-glow-profit",
  },
  loss: {
    bar: "from-loss to-red-600",
    icon: "bg-gradient-loss shadow-glow-loss",
    glow: "hover:shadow-glow-loss",
  },
  warning: {
    bar: "from-warning to-amber-600",
    icon: "bg-gradient-warning shadow-glow-warning",
    glow: "hover:shadow-glow-warning",
  },
  purple: {
    bar: "from-purple-500 to-violet-600",
    icon: "bg-gradient-purple",
    glow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]",
  },
};

export default function StatCard({
  label, value, sub, subColor, icon: Icon, accentColor = "brand", className,
}: Props) {
  const accent = accentMap[accentColor] || accentMap.brand;

  return (
    <div className={cn(
      "relative bg-surface-card border border-surface-border rounded-2xl p-4 sm:p-5 overflow-hidden transition-all duration-300 shadow-card min-w-0",
      accent.glow,
      "hover:border-opacity-80 hover:-translate-y-0.5",
      className
    )}>
      {/* Top gradient accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-80", accent.bar)} />

      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-8 translate-x-8 bg-brand blur-2xl" />

      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-widest">{label}</p>
        {Icon && (
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0", accent.icon)}>
            <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
        )}
      </div>

      <div>
        <p className="text-lg sm:text-2xl font-bold text-white leading-tight tracking-tight break-words">{value}</p>
        {sub && (
          <p className={cn("text-xs mt-1.5 font-medium", subColor || "text-muted")}>{sub}</p>
        )}
      </div>
    </div>
  );
}
