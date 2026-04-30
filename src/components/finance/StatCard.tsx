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
    <Card className="p-5 shadow-soft border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("size-10 rounded-xl flex items-center justify-center", toneClass)}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
