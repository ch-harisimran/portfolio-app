import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function ProgressBar({ value, max = 100, color = "#3b82f6", size = "md", showLabel }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="w-full">
      <div className={cn(
        "w-full rounded-full overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2",
        "bg-surface-elevated"
      )}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${pct}%`, backgroundColor: color }}
        >
          {/* Shimmer shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]" />
        </div>
      </div>
      {showLabel && <p className="text-xs text-muted mt-1">{pct.toFixed(1)}%</p>}
    </div>
  );
}
