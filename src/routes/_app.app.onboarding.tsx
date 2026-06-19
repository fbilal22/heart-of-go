import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { RISK_QUESTIONS, scoreToRiskLevel, generateMockTransactions, DEFAULT_BUDGETS } from "@/lib/finance";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState("2800");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const totalSteps = 2 + RISK_QUESTIONS.length;
  const progress = ((step) / totalSteps) * 100;

  const finish = async () => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      const score = Object.values(answers).reduce((a, b) => a + b, 0);
      const riskLevel = scoreToRiskLevel(score);

      // Update profile
      await supabase.from("profiles").update({
        monthly_income: Number(income) || null,
        risk_level: riskLevel,
        onboarding_completed: true,
      }).eq("id", user.id);

      // Save risk assessment
      await supabase.from("risk_assessments").insert({
        user_id: user.id, answers, score, risk_level: riskLevel,
      });

      // Create checking + savings accounts
      const { data: accounts } = await supabase.from("bank_accounts").insert([
        { user_id: user.id, bank_name: "Boursorama", account_name: "Compte courant", account_type: "CHECKING", balance: 1850.42 },
        { user_id: user.id, bank_name: "Boursorama", account_name: "Livret épargne", account_type: "SAVINGS", balance: 3200 },
      ]).select();

      // Seed transactions on the checking account
      const checking = accounts?.find((a) => a.account_type === "CHECKING");
      if (checking) {
        const tx = generateMockTransactions(user.id, checking.id);
        // chunk into 100s
        for (let i = 0; i < tx.length; i += 100) {
          await supabase.from("transactions").insert(tx.slice(i, i + 100));
        }
      }

      // Seed default budgets for current month
      const now = new Date();
      await supabase.from("budgets").insert(
        DEFAULT_BUDGETS.map((b) => ({
          user_id: user.id, month: now.getMonth() + 1, year: now.getFullYear(),
          category: b.category, planned_amount: b.amount,
        }))
      );

      // Welcome alert
      await supabase.from("alerts").insert({
        user_id: user.id, type: "WELCOME",
        title: "Bienvenue sur FinEase 👋",
        message: "Vos données ont été configurées. Explorez votre tableau de bord !",
      });

      await refreshProfile();
      router.navigate({ to: "/app" });
    } catch (e) {
      toast.error("Erreur: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-xl p-8 shadow-elegant">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center"><Sparkles className="size-4 text-primary-foreground" /></div>
          <span className="font-semibold">FinEase</span>
        </div>
        <Progress value={progress} className="mb-6" />

        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold tracking-tight">Bienvenue {profile?.first_name} 👋</h2>
            <p className="text-muted-foreground">
              On va vous aider à mieux gérer votre argent. Quelques questions rapides
              pour personnaliser votre expérience.
            </p>
            <Button className="bg-gradient-primary border-0" onClick={() => setStep(1)}>
              Commencer <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Vos revenus mensuels</h2>
            <p className="text-sm text-muted-foreground">Approximativement, combien gagnez-vous net par mois ?</p>
            <div className="space-y-2">
              <Label>Revenu mensuel net (€)</Label>
              <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Retour</Button>
              <Button className="bg-gradient-primary border-0" onClick={() => setStep(2)}>Suivant</Button>
            </div>
          </div>
        )}

        {step >= 2 && step < 2 + RISK_QUESTIONS.length && (() => {
          const q = RISK_QUESTIONS[step - 2];
          return (
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Profil investisseur · {step - 1}/{RISK_QUESTIONS.length}</p>
              <h2 className="text-xl font-semibold">{q.question}</h2>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.score;
                  return (
                    <button key={opt.label} type="button" onClick={() => setAnswers({ ...answers, [q.id]: opt.score })}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selected ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40"}`}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(step - 1)}>Retour</Button>
                <Button className="bg-gradient-primary border-0"
                  disabled={answers[q.id] === undefined}
                  onClick={() => step === 1 + RISK_QUESTIONS.length ? finish() : setStep(step + 1)}>
                  {step === 1 + RISK_QUESTIONS.length ? (busy ? <><Loader2 className="size-4 mr-2 animate-spin"/>Finalisation…</>: "Terminer") : "Suivant"}
                </Button>
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
