import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { formatEUR } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/savings")({
  head: () => ({ meta: [{ title: "Épargne — Pécule" }] }),
  component: SavingsPage,
});

type Goal = { id: string; name: string; target_amount: number; current_amount: number; target_date: string|null; emoji: string; is_completed: boolean };
const EMOJI = ["🎯","🏖️","🏠","🚗","💍","🎓","💻","✈️","🎁"];

function SavingsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", target: "", date: "", emoji: "🎯" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setGoals((data as Goal[]) ?? []);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  const add = async () => {
    if (!user || !form.name || !form.target) return toast.error("Nom et montant requis.");
    setBusy(true);
    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id, name: form.name, target_amount: parseFloat(form.target),
      target_date: form.date || null, emoji: form.emoji,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ name: "", target: "", date: "", emoji: "🎯" }); void load();
  };

  const contrib = async (g: Goal, amount: number) => {
    const next = Math.max(0, Number(g.current_amount) + amount);
    await supabase.from("savings_goals").update({ current_amount: next, is_completed: next >= Number(g.target_amount) }).eq("id", g.id);
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
            <Button size="sm" className="bg-gradient-primary border-0 shrink-0 md:size-default">
              <Plus className="size-4 md:mr-1" /> <span className="hidden sm:inline">Nouvel objectif</span>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
