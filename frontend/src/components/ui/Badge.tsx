import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  variant?: "default" | "profit" | "loss" | "warning" | "muted";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-brand/10 text-brand",
  profit: "bg-profit/10 text-profit",
  loss: "bg-loss/10 text-loss",
  warning: "bg-warning/10 text-warning",
  muted: "bg-surface-elevated text-muted",
};

export default function Badge({ children, variant = "default", size = "sm" }: Props) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      variants[variant]
    )}>
      {children}
    </span>
  );
}
