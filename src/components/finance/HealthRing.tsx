import { cn } from "@/lib/utils";

export function HealthRing({ score, label, tone }: { score: number; label: string; tone: string }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorVar = {
    success: "var(--success)",
    primary: "var(--primary)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
  }[tone] ?? "var(--primary)";
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} stroke="var(--muted)" strokeWidth="10" fill="none" />
          <circle cx="70" cy="70" r={radius} stroke={colorVar} strokeWidth="10" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight">{score}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className={cn("mt-3 text-sm font-medium", `text-${tone}`)}>{label}</p>
    </div>
  );
}
