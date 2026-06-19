import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Repeat } from "lucide-react";
import { formatEUR } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/savings")({
  head: () => ({ meta: [{ title: "Épargne — FinEase" }] }),
  component: SavingsPage,
});

type Goal = {
  id: string; name: string; target_amount: number; current_amount: number;
  target_date: string|null; emoji: string; is_completed: boolean;
  auto_debit_enabled: boolean; auto_debit_amount: number|null;
  auto_debit_day: number|null; auto_debit_last_run: string|null;
};
const EMOJI = ["🎯","🏖️","🏠","🚗","💍","🎓","💻","✈️","🎁"];

function SavingsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", target: "", date: "", emoji: "🎯",
    autoEnabled: false, autoAmount: "", autoDay: "1",
  });
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setGoals((data as Goal[]) ?? []);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  // Apply due auto-debits when the page loads
  useEffect(() => {
    if (!user || goals.length === 0) return;
    void runDueAutoDebits();
    /* eslint-disable-next-line */
  }, [user, goals.length]);

  const runDueAutoDebits = async () => {
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];
    const dom = today.getDate();
    for (const g of goals) {
      if (!g.auto_debit_enabled || !g.auto_debit_amount || !g.auto_debit_day) continue;
      if (dom < g.auto_debit_day) continue;
      const last = g.auto_debit_last_run ? new Date(g.auto_debit_last_run) : null;
      const sameMonth = last && last.getFullYear() === today.getFullYear() && last.getMonth() === today.getMonth();
      if (sameMonth) continue;
      await contrib(g, Number(g.auto_debit_amount), { silent: true, auto: true });
      await supabase.from("savings_goals").update({ auto_debit_last_run: todayISO }).eq("id", g.id);
    }
  };

  const add = async () => {
    if (!user || !form.name || !form.target) return toast.error("Nom et montant requis.");
    setBusy(true);
    const autoAmt = form.autoEnabled ? parseFloat(form.autoAmount) : null;
    const autoDay = form.autoEnabled ? parseInt(form.autoDay, 10) : null;
    if (form.autoEnabled && (!Number.isFinite(autoAmt!) || autoAmt! <= 0 || !autoDay || autoDay < 1 || autoDay > 28)) {
      setBusy(false);
      return toast.error("Montant auto et jour (1-28) requis.");
    }
    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id, name: form.name, target_amount: parseFloat(form.target),
      target_date: form.date || null, emoji: form.emoji,
      auto_debit_enabled: form.autoEnabled,
      auto_debit_amount: autoAmt,
      auto_debit_day: autoDay,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ name: "", target: "", date: "", emoji: "🎯", autoEnabled: false, autoAmount: "", autoDay: "1" });
    void load();
  };

  const contrib = async (g: Goal, amount: number, opts?: { silent?: boolean; auto?: boolean }) => {
    if (!user || !amount || !Number.isFinite(amount)) return;
    const next = Math.max(0, Number(g.current_amount) + amount);
    const { error: gErr } = await supabase.from("savings_goals")
      .update({ current_amount: next, is_completed: next >= Number(g.target_amount) })
      .eq("id", g.id);
    if (gErr) return toast.error(gErr.message);

    const { data: accs } = await supabase.from("bank_accounts")
      .select("id, balance").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1);
    const acc = accs?.[0];
    if (acc) {
      const txAmount = -amount;
      const prefix = opts?.auto ? "Versement auto épargne" : (amount > 0 ? "Versement épargne" : "Retrait épargne");
      await supabase.from("transactions").insert({
        user_id: user.id, account_id: acc.id, amount: txAmount,
        label: `${prefix} — ${g.name}`,
        category: "SAVINGS", is_recurring: !!opts?.auto, is_unexpected: false,
        transaction_date: new Date().toISOString().split("T")[0],
      });
      await supabase.from("bank_accounts")
        .update({ balance: Number(acc.balance) + txAmount })
        .eq("id", acc.id);
    }
    if (!opts?.silent) {
      toast.success(amount > 0 ? `+${formatEUR(amount)} ajoutés` : `${formatEUR(Math.abs(amount))} retirés`);
    }
    setCustomAmounts(s => ({ ...s, [g.id]: "" }));
    void load();
  };
  const del = async (id: string) => { await supabase.from("savings_goals").delete().eq("id", id); void load(); };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-5 md:space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mes objectifs</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{goals.length} objectif(s) d'épargne</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="default" className="bg-gradient-primary border-0 shrink-0">
              <Plus className="size-4 mr-1" /> Nouvel objectif
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel objectif</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Vacances en Italie" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Montant cible (€)</Label><Input type="number" value={form.target} onChange={e => setForm({...form, target: e.target.value})} /></div>
                <div><Label>Date cible</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              </div>
              <div><Label>Emoji</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EMOJI.map(e => <button key={e} type="button" onClick={() => setForm({...form, emoji: e})}
                    className={`size-9 rounded-lg text-lg ${form.emoji===e ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>)}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="size-4 text-primary" />
                    <Label className="cursor-pointer">Prélèvement automatique mensuel</Label>
                  </div>
                  <Switch checked={form.autoEnabled} onCheckedChange={(v) => setForm({...form, autoEnabled: v})} />
                </div>
                {form.autoEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Montant (€)</Label>
                      <Input type="number" inputMode="decimal" value={form.autoAmount}
                        onChange={e => setForm({...form, autoAmount: e.target.value})} placeholder="50" />
                    </div>
                    <div>
                      <Label>Jour du mois (1-28)</Label>
                      <Input type="number" min={1} max={28} value={form.autoDay}
                        onChange={e => setForm({...form, autoDay: e.target.value})} />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">
                      Le montant sera déduit automatiquement de votre solde chaque mois à la date choisie.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter><Button onClick={add} disabled={busy} className="bg-gradient-primary border-0">{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Créer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {goals.length === 0 && <Card className="p-12 text-center text-muted-foreground shadow-soft">Aucun objectif. Créez-en un pour commencer ✨</Card>}

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {goals.map(g => {
          const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
          return (
            <Card key={g.id} className="p-4 md:p-6 shadow-soft border-border/60 bg-gradient-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    {g.target_date && <p className="text-xs text-muted-foreground">Pour le {new Date(g.target_date).toLocaleDateString("fr-FR")}</p>}
                    {g.auto_debit_enabled && g.auto_debit_amount && g.auto_debit_day && (
                      <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                        <Repeat className="size-3" /> {formatEUR(Number(g.auto_debit_amount))} le {g.auto_debit_day} du mois
                      </p>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del(g.id)}><Trash2 className="size-4" /></Button>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{formatEUR(g.current_amount)} <span className="text-sm text-muted-foreground font-normal">/ {formatEUR(g.target_amount)}</span></p>
                <Progress value={pct} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{Math.round(pct)}% atteint</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="flex-1 min-w-[70px]" onClick={() => contrib(g, 50)}>+50 €</Button>
                <Button size="sm" variant="outline" className="flex-1 min-w-[70px]" onClick={() => contrib(g, 100)}>+100 €</Button>
                <Button size="sm" variant="outline" className="flex-1 min-w-[70px]" onClick={() => contrib(g, -50)}>-50 €</Button>
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Montant personnalisé (€)"
                  value={customAmounts[g.id] ?? ""}
                  onChange={e => setCustomAmounts(s => ({ ...s, [g.id]: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  className="bg-gradient-primary border-0"
                  onClick={() => {
                    const v = parseFloat(customAmounts[g.id] ?? "");
                    if (!Number.isFinite(v) || v === 0) return toast.error("Saisis un montant valide.");
                    void contrib(g, v);
                  }}
                >Ajouter</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const v = parseFloat(customAmounts[g.id] ?? "");
                    if (!Number.isFinite(v) || v === 0) return toast.error("Saisis un montant valide.");
                    void contrib(g, -Math.abs(v));
                  }}
                >Retirer</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
