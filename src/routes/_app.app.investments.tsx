import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { INVESTMENT_PRODUCTS, formatEUR } from "@/lib/finance";
import { TrendingUp, TrendingDown, Shield, Plus, Trash2, Target, Minus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/investments")({
  head: () => ({ meta: [{ title: "Investir — FinanceApp" }] }),
  component: InvestmentsPage,
});

const RISK_LABEL = { CONSERVATIVE: "Prudent", MODERATE: "Équilibré", AGGRESSIVE: "Dynamique" } as const;

type Investment = {
  id: string;
  name: string;
  type: string;
  invested_amount: number;
  current_value: number;
  target_amount: number | null;
};

function InvestmentsPage() {
  const { user, profile } = useAuth();
  const risk = profile?.risk_level ?? "MODERATE";
  const products = INVESTMENT_PRODUCTS[risk];

  const [items, setItems] = useState<Investment[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = { name: "", type: "ETF", invested_amount: "", current_value: "", target_amount: "" };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("investments").select("*").order("created_at", { ascending: false });
    setItems((data as Investment[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (it: Investment) => {
    setEditingId(it.id);
    setForm({
      name: it.name, type: it.type,
      invested_amount: String(it.invested_amount),
      current_value: String(it.current_value),
      target_amount: it.target_amount != null ? String(it.target_amount) : "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      type: form.type.trim() || "ETF",
      invested_amount: Number(form.invested_amount) || 0,
      current_value: Number(form.current_value) || 0,
      target_amount: form.target_amount === "" ? null : Number(form.target_amount),
    };
    const res = editingId
      ? await supabase.from("investments").update(payload).eq("id", editingId)
      : await supabase.from("investments").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editingId ? "Investissement mis à jour" : "Investissement ajouté");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!editingId) return;
    if (!confirm("Supprimer cet investissement ?")) return;
    const { error } = await supabase.from("investments").delete().eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    setOpen(false);
    load();
  };

  const totalInvested = items.reduce((s, i) => s + Number(i.invested_amount || 0), 0);
  const totalValue = items.reduce((s, i) => s + Number(i.current_value || 0), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalTarget = items.reduce((s, i) => s + Number(i.target_amount || 0), 0);
  const goalPct = totalTarget > 0 ? Math.min(100, (totalValue / totalTarget) * 100) : 0;

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-5 md:space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Investir</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Recommandations pour votre profil <strong>{RISK_LABEL[risk]}</strong>.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="size-4 mr-1" />Ajouter</Button>
      </header>

      {/* Portfolio summary */}
      <Card className="p-4 md:p-6 shadow-soft border-border/60">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Mon portefeuille</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Investi</p>
            <p className="text-lg md:text-xl font-semibold tracking-tight">{formatEUR(totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valeur actuelle</p>
            <p className="text-lg md:text-xl font-semibold tracking-tight">{formatEUR(totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">+/- Value</p>
            <p className={`text-lg md:text-xl font-semibold tracking-tight flex items-center gap-1 ${totalPnl > 0 ? "text-success" : totalPnl < 0 ? "text-destructive" : ""}`}>
              {totalPnl > 0 ? <TrendingUp className="size-4" /> : totalPnl < 0 ? <TrendingDown className="size-4" /> : <Minus className="size-4" />}
              {formatEUR(Math.abs(totalPnl))}
            </p>
            <p className={`text-xs ${totalPnl > 0 ? "text-success" : totalPnl < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {totalPnl >= 0 ? "+" : "-"}{Math.abs(totalPnlPct).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="size-3" />Objectif</p>
            {totalTarget > 0 ? (
              <>
                <p className="text-lg md:text-xl font-semibold tracking-tight">{Math.round(goalPct)}%</p>
                <p className="text-xs text-muted-foreground">{formatEUR(totalValue)} / {formatEUR(totalTarget)}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Aucun objectif défini</p>
            )}
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="mt-4">
            <Progress value={goalPct} />
            <p className="text-xs text-muted-foreground mt-2">
              {goalPct >= 100 ? "🎉 Objectif atteint !" : goalPct >= 75 ? "Vous y êtes presque" : goalPct >= 40 ? "Bonne progression" : "Au début de votre parcours"}
            </p>
          </div>
        )}
      </Card>

      {/* Holdings */}
      {items.length > 0 && (
        <Card className="p-4 md:p-6 shadow-soft border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mes positions</h2>
          <div className="space-y-2">
            {items.map((it) => {
              const pnl = Number(it.current_value) - Number(it.invested_amount);
              const pnlPct = Number(it.invested_amount) > 0 ? (pnl / Number(it.invested_amount)) * 100 : 0;
              const tone = pnl > 0 ? "text-success" : pnl < 0 ? "text-destructive" : "text-muted-foreground";
              return (
                <button
                  key={it.id}
                  onClick={() => openEdit(it)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.type} · investi {formatEUR(Number(it.invested_amount))}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatEUR(Number(it.current_value))}</p>
                    <p className={`text-xs flex items-center justify-end gap-1 ${tone}`}>
                      {pnl > 0 ? <TrendingUp className="size-3" /> : pnl < 0 ? <TrendingDown className="size-3" /> : null}
                      {pnl >= 0 ? "+" : "-"}{formatEUR(Math.abs(pnl))} ({pnl >= 0 ? "+" : "-"}{Math.abs(pnlPct).toFixed(1)}%)
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-6 bg-gradient-hero text-sidebar-foreground shadow-elegant border-0">
        <div className="flex items-center gap-3">
          <div className="size-10 md:size-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"><Shield className="size-5 md:size-6 text-primary-glow" /></div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs uppercase tracking-wider text-sidebar-foreground/60">Votre profil</p>
            <p className="text-lg md:text-2xl font-semibold">{RISK_LABEL[risk]}</p>
          </div>
          <div className="ml-auto shrink-0"><Button size="sm" asChild variant="secondary"><Link to="/app/onboarding">Refaire</Link></Button></div>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recommandations</h2>
        <div className="grid gap-3 md:gap-4 md:grid-cols-2">
          {products.map(p => (
            <Card key={p.name} className="p-6 shadow-soft border-border/60">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><TrendingUp className="size-5" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.type}</p>
                </div>
                <span className="text-sm font-semibold text-success">{p.yield}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({length: 4}).map((_,i) => (
                  <span key={i} className={`h-1.5 w-8 rounded-full ${i < p.risk ? "bg-primary" : "bg-muted"}`} />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">Risque {p.risk}/4</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">* Performances passées non garanties. Informations à but pédagogique uniquement, ce ne sont pas des conseils en investissement.</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'investissement" : "Nouvel investissement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ETF MSCI World" />
            </div>
            <div>
              <Label>Type</Label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="ETF, Action, PEA…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant investi (€)</Label>
                <Input type="number" step="0.01" value={form.invested_amount} onChange={(e) => setForm({ ...form, invested_amount: e.target.value })} />
              </div>
              <div>
                <Label>Valeur actuelle (€)</Label>
                <Input type="number" step="0.01" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Objectif (€) — optionnel</Label>
              <Input type="number" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="ex. 10000" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingId && (
              <Button variant="ghost" size="icon" onClick={remove} className="mr-auto text-destructive hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
