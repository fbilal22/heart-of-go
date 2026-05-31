import { cn } from "@/lib/utils";

export function HealthRing({ score, label, tone, size = 140 }: { score: number; label: string; tone: string; size?: number }) {
  const stroke = Math.max(8, Math.round(size * 0.075));
  const radius = size / 2 - stroke;
  const cx = size / 2;
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
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cx} r={radius} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
          <circle cx={cx} cy={cx} r={radius} stroke={colorVar} strokeWidth={stroke} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl md:text-3xl font-bold tracking-tight">{score}</span>
          <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className={cn("mt-3 text-sm font-medium", `text-${tone}`)}>{label}</p>
    </div>
  );
}
