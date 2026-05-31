import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, CATEGORY_META, categorize, formatEUR, type Category } from "@/lib/finance";
import { MonthPicker, monthRange, currentMonth, type MonthValue } from "@/components/finance/MonthPicker";
import { Plus, Search, AlertCircle, Loader2, Link2, ArrowDownRight, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/app/transactions")({
  head: () => ({ meta: [{ title: "Transactions — FinanceApp" }] }),
  component: TransactionsPage,
});

type Tx = { id: string; amount: number; label: string; category: Category; transaction_date: string; is_unexpected: boolean; account_id: string };

function TransactionsPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Array<{id:string;account_name:string}>>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [period, setPeriod] = useState<MonthValue>(() => currentMonth());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = () => ({
    type: "EXPENSE" as "EXPENSE" | "INCOME",
    label: "",
    amount: "",
    date: new Date().toISOString().slice(0,10),
    category: "OTHER" as Category,
    accountId: "",
  });
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), accountId: accounts[0]?.id ?? "" });
    setOpen(true);
  };
  const openEdit = (t: Tx) => {
    setEditingId(t.id);
    setForm({
      type: t.amount >= 0 ? "INCOME" : "EXPENSE",
      label: t.label,
      amount: String(Math.abs(Number(t.amount))),
      date: t.transaction_date,
      category: t.category,
      accountId: t.account_id,
    });
    setOpen(true);
  };

  const load = async () => {
    if (!user) return;
    const { startISO, endISO } = monthRange(period);
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id)
        .gte("transaction_date", startISO).lt("transaction_date", endISO)
        .order("transaction_date", { ascending: false }).limit(500),
      supabase.from("bank_accounts").select("id,account_name").eq("user_id", user.id),
    ]);
    setTxs((t as Tx[]) ?? []);
    setAccounts(a ?? []);
    if (a?.[0] && !form.accountId) setForm(f => ({...f, accountId: a[0].id}));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user, period]);

  const filtered = useMemo(() => {
    return txs.filter(t => {
      if (filter !== "ALL" && t.category !== filter) return false;
      if (q && !t.label.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [txs, q, filter]);

  const breakdown = useMemo(() => {
    const totals = new Map<Category, number>();
    for (const t of filtered) {
      if (t.amount >= 0) continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    const total = Array.from(totals.values()).reduce((s, v) => s + v, 0);
    const rows = Array.from(totals.entries())
      .map(([category, value]) => ({ category, value, pct: total ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    return { rows, total };
  }, [filtered]);

  const submit = async () => {
    if (!user || !form.accountId || !form.label || !form.amount) return toast.error("Remplissez tous les champs.");
    setBusy(true);
    const raw = Math.abs(parseFloat(form.amount));
    if (!raw || Number.isNaN(raw)) { setBusy(false); return toast.error("Montant invalide."); }
    const signed = form.type === "INCOME" ? raw : -raw;
    const cat = form.type === "INCOME"
      ? (form.category === "OTHER" ? "SALARY" : form.category)
      : (form.category === "OTHER" ? categorize(form.label).category : form.category);
    const payload = {
      account_id: form.accountId, amount: signed, label: form.label,
      category: cat, transaction_date: form.date,
    };
    const { error } = editingId
      ? await supabase.from("transactions").update(payload).eq("id", editingId).eq("user_id", user.id)
      : await supabase.from("transactions").insert({ ...payload, user_id: user.id, is_recurring: false, is_unexpected: false });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Opération modifiée" : (form.type === "INCOME" ? "Revenu ajouté" : "Dépense ajoutée"));
    setOpen(false); setEditingId(null);
    void load();
  };

  const remove = async () => {
    if (!user || !editingId) return;
    if (!confirm("Supprimer cette opération ?")) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").delete().eq("id", editingId).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Opération supprimée");
    setOpen(false); setEditingId(null);
    void load();
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-5 md:space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{filtered.length} opérations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthPicker value={period} onChange={setPeriod} />
          <Link to="/app/connect" className="shrink-0 inline-flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors font-medium">
            <Link2 className="size-3.5" /> <span className="hidden sm:inline">Connecter ma banque</span><span className="sm:hidden">Banque</span>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <>
                {/* Bouton classique sur desktop */}
                <Button size="default" className="bg-gradient-primary border-0 shrink-0 hidden md:inline-flex">
                  <Plus className="size-4 mr-1" /> Ajouter
                </Button>
                {/* FAB sur mobile */}
                <Button size="icon" className="md:hidden fixed right-4 fab-bottom z-40 size-14 rounded-full bg-gradient-primary border-0 shadow-elegant active:scale-95 transition-transform" aria-label="Ajouter une transaction">
                  <Plus className="size-6" />
                </Button>
              </>
            </DialogTrigger>
            <DialogContent>
          <Button size="default" onClick={openCreate} className="bg-gradient-primary border-0 shrink-0 hidden md:inline-flex">
            <Plus className="size-4 mr-1" /> Ajouter
          </Button>
          <Button size="icon" onClick={openCreate} className="md:hidden fixed right-4 fab-bottom z-40 size-14 rounded-full bg-gradient-primary border-0 shadow-elegant active:scale-95 transition-transform" aria-label="Ajouter une transaction">
            <Plus className="size-6" />
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Modifier l'opération" : "Nouvelle opération"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {/* Toggle Dépense / Revenu */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: "EXPENSE"})}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "EXPENSE" ? "bg-card shadow-sm text-destructive" : "text-muted-foreground"}`}
                  >
                    <ArrowDownRight className="size-4" /> Dépense
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: "INCOME", category: form.category === "OTHER" ? "SALARY" : form.category})}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "INCOME" ? "bg-card shadow-sm text-success" : "text-muted-foreground"}`}
                  >
                    <ArrowUpRight className="size-4" /> Revenu
                  </button>
                </div>
                <div><Label>Libellé</Label><Input value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder={form.type === "INCOME" ? "Ex: Salaire, Freelance…" : "Ex: Carrefour"} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant (€)</Label><Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="42.50" /></div>
                  <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as Category})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Compte</Label>
                    <Select value={form.accountId} onValueChange={(v) => setForm({...form, accountId: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                {editingId ? (
                  <Button variant="outline" onClick={remove} disabled={busy} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4 mr-1.5" /> Supprimer
                  </Button>
                ) : <span />}
                <Button onClick={submit} disabled={busy} className="bg-gradient-primary border-0">{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="p-3 md:p-4 shadow-soft border-border/60 flex gap-2 md:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 md:w-48 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>


      {breakdown.total > 0 && (
        <Card className="p-5 shadow-soft border-border/60 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Répartition des dépenses</h2>
            <span className="text-xs text-muted-foreground">Total : {formatEUR(-breakdown.total, { sign: true })}</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {breakdown.rows.map(r => (
              <div key={r.category} style={{ width: `${r.pct}%`, background: CATEGORY_META[r.category].color }} title={`${CATEGORY_META[r.category].label} · ${r.pct.toFixed(0)}%`} />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {breakdown.rows.map(r => {
              const meta = CATEGORY_META[r.category]; const Icon = meta.icon;
              return (
                <button
                  key={r.category}
                  onClick={() => setFilter(filter === r.category ? "ALL" : r.category)}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50 ${filter === r.category ? "border-primary/60 bg-muted/40" : "border-border/60"}`}
                >
                  <div className="size-8 rounded-md flex items-center justify-center shrink-0" style={{ background: meta.color + "22", color: meta.color }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{formatEUR(r.value)} · {r.pct.toFixed(0)}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="shadow-soft border-border/60 divide-y divide-border">
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucune transaction.</p>}
        {filtered.map(t => {
          const meta = CATEGORY_META[t.category]; const Icon = meta.icon;
          return (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: meta.color + "22", color: meta.color }}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {t.label}
                  {t.is_unexpected && <span title="Imprévue"><AlertCircle className="size-3.5 text-warning-foreground" /></span>}
                </p>
                <p className="text-xs text-muted-foreground">{meta.label} · {new Date(t.transaction_date).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className={`font-semibold ${t.amount > 0 ? "text-success" : ""}`}>{formatEUR(t.amount, { sign: true })}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
