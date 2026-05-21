import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, hint, tone = "default",
}: {
  label: string; value: string; icon: LucideIcon; hint?: string;
  tone?: "default" | "success" | "destructive" | "primary" | "warning";
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  return (
    <Card className="p-3.5 md:p-5 shadow-soft border-border/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
          <p className="mt-1.5 md:mt-2 text-lg md:text-2xl font-semibold tracking-tight truncate">{value}</p>
          {hint && <p className="mt-1 text-[10px] md:text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
        <div className={cn("size-8 md:size-10 rounded-xl flex items-center justify-center shrink-0", toneClass)}>
          <Icon className="size-4 md:size-5" />
        </div>
      </div>
    </Card>
  );
}
