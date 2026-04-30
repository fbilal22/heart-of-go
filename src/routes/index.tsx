import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Brain, PiggyBank, TrendingUp, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pécule — Reprenez le contrôle de vos finances" },
      { name: "description", content: "Voir, comprendre, épargner, investir. Pécule réunit vos finances en un seul endroit." },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  { icon: Eye, title: "Voir", desc: "Tous vos comptes, dépenses et abonnements réunis dans un tableau de bord clair." },
  { icon: Brain, title: "Comprendre", desc: "Catégorisation automatique, score santé financière et alertes intelligentes." },
  { icon: PiggyBank, title: "Épargner", desc: "Des objectifs visuels avec un suivi de progression motivant." },
  { icon: TrendingUp, title: "Investir", desc: "Des recommandations adaptées à votre profil de risque." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Pécule</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Se connecter</Link></Button>
            <Button asChild className="bg-gradient-primary border-0 shadow-soft"><Link to="/auth">Commencer</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.04]" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <ShieldCheck className="size-3.5" /> Sécurisé · Pour les 24–35 ans
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Reprenez le contrôle <br/>
            de vos <span className="text-gradient">finances</span>.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Une app simple pour savoir où passe votre argent, épargner régulièrement
            et faire fructifier ce que vous mettez de côté.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary border-0 shadow-elegant h-12 px-6">
              <Link to="/auth">Créer mon compte gratuit <ArrowRight className="size-4 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6">
              <Link to="/auth">J'ai déjà un compte</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
          Quatre piliers pour des finances saines
        </h2>
        <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">
          Conçu autour de besoins réels validés avec des jeunes actifs.
        </p>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6 bg-gradient-card shadow-soft border-border/50 hover:shadow-elegant transition-shadow">
              <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-hero text-sidebar-foreground">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Prêt·e à y voir clair ?</h2>
          <p className="mt-4 text-sidebar-foreground/70 max-w-xl mx-auto">
            Créez votre compte en moins d'une minute. On charge des données de démo
            pour que vous voyiez l'app en action immédiatement.
          </p>
          <Button asChild size="lg" className="mt-8 bg-gradient-primary border-0 shadow-glow h-12 px-6">
            <Link to="/auth">Démarrer maintenant <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Pécule · Vos données restent les vôtres.
      </footer>
    </div>
  );
}
