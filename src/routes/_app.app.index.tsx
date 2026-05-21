import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/finance/StatCard";
import { HealthRing } from "@/components/finance/HealthRing";
import { ArrowDownRight, ArrowUpRight, Wallet, AlertTriangle, PiggyBank, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, calculateHealthScore, formatEUR, type Category } from "@/lib/finance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/app/")({
  head: () => ({ meta: [{ title: "Tableau de bord — FinanceApp" }] }),
  component: Dashboard,
});

type Tx = { id: string; amount: number; label: string; category: Category; transaction_date: string; is_unexpected: boolean };
type Account = { id: string; bank_name: string; account_name: string; account_type: string; balance: number };

function Dashboard() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budgets, setBudgets] = useState<Array<{ category: string; planned_amount: number }>>([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    void Promise.all([
      supabase.from("bank_accounts").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("id,amount,label,category,transaction_date,is_unexpected")
        .eq("user_id", user.id).gte("transaction_date", start).order("transaction_date", { ascending: false }),
      supabase.from("budgets").select("category,planned_amount")
        .eq("user_id", user.id).eq("month", now.getMonth()+1).eq("year", now.getFullYear()),
    ]).then(([a, t, b]) => {
      setAccounts((a.data as Account[]) ?? []);
      setTxs((t.data as Tx[]) ?? []);
      setBudgets(b.data ?? []);
    });
  }, [user]);

  const stats = useMemo(() => {
    const totalIncome = txs.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs.filter(t => t.amount < 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const savingsAmount = txs.filter(t => t.category === "SAVINGS").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const unexpectedExpenses = expenses.filter(t => t.is_unexpected).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const spentByCat: Record<string, number> = {};
    for (const t of expenses) spentByCat[t.category] = (spentByCat[t.category] ?? 0) + Math.abs(Number(t.amount));
    const exceeded = budgets.filter(b => (spentByCat[b.category] ?? 0) > Number(b.planned_amount)).length;
    return { totalIncome, totalExpenses, savingsAmount, unexpectedExpenses, exceeded, spentByCat };
  }, [txs, budgets]);

  const health = calculateHealthScore({
    totalIncome: stats.totalIncome,
    totalExpenses: stats.totalExpenses,
    unexpectedExpenses: stats.unexpectedExpenses,
    budgetExceededCategories: stats.exceeded,
    savingsAmount: stats.savingsAmount,
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const pieData = Object.entries(stats.spentByCat)
    .filter(([cat]) => cat !== "SAVINGS")
    .map(([cat, value]) => ({ name: CATEGORY_META[cat as Category].label, value, color: CATEGORY_META[cat as Category].color }))
    .sort((a, b) => b.value - a.value);

  // Last 7 days bar
  const last7 = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of txs) {
      if (t.amount < 0 && map[t.transaction_date] !== undefined) {
        map[t.transaction_date] += Math.abs(Number(t.amount));
      }
    }
    return Object.entries(map).map(([d, v]) => ({
      day: new Date(d).toLocaleDateString("fr-FR", { weekday: "short" }),
      depenses: Math.round(v),
    }));
  }, [txs]);

  const recent = txs.slice(0, 6);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour {profile?.first_name} 👋</p>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mt-1">Tableau de bord</h1>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard label="Solde total" value={formatEUR(totalBalance)} icon={Wallet} hint={`${accounts.length} comptes`} tone="primary" />
        <StatCard label="Revenus du mois" value={formatEUR(stats.totalIncome)} icon={ArrowUpRight} tone="success" />
        <StatCard label="Dépenses du mois" value={formatEUR(stats.totalExpenses)} icon={ArrowDownRight} tone="destructive" />
        <StatCard label="Épargné ce mois" value={formatEUR(stats.savingsAmount)} icon={PiggyBank} tone="primary" hint={`${Math.round(health.savingsRate*100)}% de vos revenus`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Health */}
        <Card className="p-6 shadow-soft border-border/60 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-2">Santé financière</h2>
          <p className="text-sm text-muted-foreground mb-6">Un score qui résume comment se passe votre mois.</p>
          <HealthRing score={health.score} label={health.label} tone={health.tone} />
          {health.mainIssue ? (
            <div className="mt-6 p-3 rounded-lg bg-warning/10 text-sm text-foreground/80 flex gap-2">
              <AlertTriangle className="size-4 text-warning-foreground shrink-0 mt-0.5" />
              <span>{health.mainIssue}</span>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground text-center">Tout va bien ce mois-ci 🎉</p>
          )}
        </Card>

        {/* Pie spending */}
        <Card className="p-6 shadow-soft border-border/60 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dépenses par catégorie</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/app/budget">Voir le budget</Link></Button>
          </div>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Pas encore de dépenses ce mois-ci.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatEUR(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm">
                {pieData.slice(0, 6).map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: d.color }} />{d.name}</span>
                    <span className="font-medium">{formatEUR(d.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* 7 days chart + recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 shadow-soft border-border/60 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Dépenses des 7 derniers jours</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => formatEUR(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="depenses" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-soft border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dernières transactions</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/app/transactions">Voir tout</Link></Button>
          </div>
          <ul className="space-y-3">
            {recent.length === 0 && <li className="text-sm text-muted-foreground">Pas de transactions.</li>}
            {recent.map((t) => {
              const meta = CATEGORY_META[t.category];
              const Icon = meta.icon;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: meta.color + "22", color: meta.color }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`text-sm font-semibold ${t.amount > 0 ? "text-success" : ""}`}>
                    {formatEUR(t.amount, { sign: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* CTA cards */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <Card className="p-4 md:p-6 bg-gradient-card shadow-soft border-border/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm md:text-base flex items-center gap-2"><PiggyBank className="size-4 text-primary shrink-0" /> <span className="truncate">Objectif d'épargne</span></h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Vacances, achat, projet : visualisez votre progression.</p>
          </div>
          <Button size="sm" asChild className="shrink-0"><Link to="/app/savings">Créer</Link></Button>
        </Card>
        <Card className="p-4 md:p-6 bg-gradient-card shadow-soft border-border/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm md:text-base flex items-center gap-2"><TrendingUp className="size-4 text-primary shrink-0" /> <span className="truncate">Investir</span></h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Profil <strong>{profile?.risk_level ?? "?"}</strong>. Recos sur mesure.</p>
          </div>
          <Button size="sm" asChild className="shrink-0"><Link to="/app/investments">Découvrir</Link></Button>
        </Card>
      </div>
    </div>
  );
}
