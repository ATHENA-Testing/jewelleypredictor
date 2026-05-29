import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lastUpdated?: string | Date;
  source?: string;
  className?: string;
}

export const ConfidenceBadge = ({ lastUpdated, source, className }: Props) => {
  const updated = lastUpdated ? new Date(lastUpdated) : null;
  const ageHrs = updated ? (Date.now() - updated.getTime()) / (1000 * 60 * 60) : 999;
  const trusted = source && /LiveChennai|GoodReturns|Manual|Admin/i.test(source);

  let level: "high" | "medium" | "low" = "low";
  if (trusted && ageHrs < 6) level = "high";
  else if (ageHrs < 24) level = "medium";

  const cfg = {
    high:   { Icon: ShieldCheck, label: "High",   color: "text-success bg-success/10 border-success/30" },
    medium: { Icon: Shield,      label: "Medium", color: "text-warning bg-warning/10 border-warning/30" },
    low:    { Icon: ShieldAlert, label: "Low",    color: "text-danger bg-danger/10 border-danger/30" },
  }[level];

  return (
    <span
      className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium", cfg.color, className)}
      title={`Confidence: ${cfg.label} • Source: ${source ?? "unknown"} • Updated ${updated ? `${ageHrs.toFixed(1)}h ago` : "unknown"}`}
    >
      <cfg.Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
};
