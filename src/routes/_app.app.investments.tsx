import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INVESTMENT_PRODUCTS } from "@/lib/finance";
import { TrendingUp, Shield } from "lucide-react";

export const Route = createFileRoute("/_app/app/investments")({
  head: () => ({ meta: [{ title: "Investir — Pécule" }] }),
  component: InvestmentsPage,
});

const RISK_LABEL = { CONSERVATIVE: "Prudent", MODERATE: "Équilibré", AGGRESSIVE: "Dynamique" } as const;

function InvestmentsPage() {
  const { profile } = useAuth();
  const risk = profile?.risk_level ?? "MODERATE";
  const products = INVESTMENT_PRODUCTS[risk];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Investir</h1>
        <p className="text-sm text-muted-foreground mt-1">Recommandations pour votre profil <strong>{RISK_LABEL[risk]}</strong>.</p>
      </header>

      <Card className="p-6 bg-gradient-hero text-sidebar-foreground shadow-elegant border-0">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center"><Shield className="size-6 text-primary-glow" /></div>
          <div>
            <p className="text-xs uppercase tracking-wider text-sidebar-foreground/60">Votre profil</p>
            <p className="text-2xl font-semibold">{RISK_LABEL[risk]}</p>
          </div>
          <div className="ml-auto"><Button asChild variant="secondary"><Link to="/app/onboarding">Refaire le test</Link></Button></div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
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
      <p className="text-xs text-muted-foreground italic">* Performances passées non garanties. Informations à but pédagogique uniquement, ce ne sont pas des conseils en investissement.</p>
    </div>
  );
}
