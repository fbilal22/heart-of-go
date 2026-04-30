import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_META, formatEUR, type Category, DEFAULT_BUDGETS } from "@/lib/finance";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/app/budget")({
  head: () => ({ meta: [{ title: "Budget — Pécule" }] }),
  component: BudgetPage,
});

type Budget = { id?: string; category: Category; planned_amount: number };

function BudgetPage() {
  const { user } = useAuth();
  const now = new Date();
  const month = now.getMonth() + 1; const year = now.getFullYear();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const start = `${year}-${String(month).padStart(2,"0")}-01`;
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", month).eq("year", year),
      supabase.from("transactions").select("category,amount").eq("user_id", user.id).gte("transaction_date", start).lt("amount", 0),
    ]);
    let list = (b ?? []) as Budget[];
    if (list.length === 0) list = DEFAULT_BUDGETS.map(d => ({ category: d.category, planned_amount: d.amount }));
    setBudgets(list);
    const sp: Record<string, number> = {};
    for (const x of (t ?? [])) sp[x.category] = (sp[x.category] ?? 0) + Math.abs(Number(x.amount));
    setSpent(sp);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  const total = useMemo(() => ({
    planned: budgets.reduce((s, b) => s + Number(b.planned_amount), 0),
    spent: Object.values(spent).reduce((s, v) => s + v, 0),
  }), [budgets, spent]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const rows = budgets.map(b => ({ user_id: user.id, month, year, category: b.category, planned_amount: Number(b.planned_amount) || 0 }));
    const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "user_id,month,year,category" });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Budget enregistré");
    void load();
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Budget mensuel</h1>
        <p className="text-sm text-muted-foreground mt-1">{now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
      </header>

      <Card className="p-6 shadow-soft border-border/60 bg-gradient-card">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total dépensé</p>
            <p className="text-3xl font-bold">{formatEUR(total.spent)} <span className="text-base text-muted-foreground font-normal">/ {formatEUR(total.planned)}</span></p>
          </div>
          <Button onClick={save} disabled={busy} className="bg-gradient-primary border-0">{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Enregistrer</Button>
        </div>
        <Progress value={total.planned > 0 ? Math.min(100, (total.spent/total.planned)*100) : 0} />
      </Card>

      <div className="space-y-3">
        {budgets.map((b, idx) => {
          const meta = CATEGORY_META[b.category]; const Icon = meta.icon;
          const used = spent[b.category] ?? 0;
          const pct = b.planned_amount > 0 ? (used / Number(b.planned_amount)) * 100 : 0;
          const over = pct > 100;
          return (
            <Card key={b.category} className="p-4 shadow-soft border-border/60">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: meta.color + "22", color: meta.color }}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{meta.label}</p>
                    <p className={`text-sm font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
                      {formatEUR(used)} / <Input type="number" value={b.planned_amount} onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        setBudgets(budgets.map((x, i) => i === idx ? {...x, planned_amount: v} : x));
                      }} className="inline-block w-24 h-7 ml-1" />
                    </p>
                  </div>
                  <Progress value={Math.min(100, pct)} className="mt-2" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
