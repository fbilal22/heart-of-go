import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MonthValue = { month: number; year: number }; // month: 1-12

export function monthRange({ month, year }: MonthValue) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startISO: iso(start), endISO: iso(end) };
}

export function currentMonth(): MonthValue {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function MonthPicker({
  value,
  onChange,
  className = "",
}: {
  value: MonthValue;
  onChange: (v: MonthValue) => void;
  className?: string;
}) {
  const date = new Date(value.year, value.month - 1, 1);
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const now = new Date();
  const isCurrent = value.month === now.getMonth() + 1 && value.year === now.getFullYear();

  const shift = (delta: number) => {
    const d = new Date(value.year, value.month - 1 + delta, 1);
    onChange({ month: d.getMonth() + 1, year: d.getFullYear() });
  };

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-soft ${className}`}>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => shift(-1)} aria-label="Mois précédent">
        <ChevronLeft className="size-4" />
      </Button>
      <button
        onClick={() => onChange(currentMonth())}
        className="px-2 text-xs md:text-sm font-medium capitalize min-w-[110px] text-center hover:text-primary transition-colors"
        title={isCurrent ? "Mois actuel" : "Revenir au mois actuel"}
      >
        {label}
      </button>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => shift(1)} disabled={isCurrent} aria-label="Mois suivant">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
