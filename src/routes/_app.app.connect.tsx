import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOCK_BANKS, generateMockTransactions, estimateBalance, type MockBank } from "@/lib/mock-banks";
import { ArrowLeft, Check, Loader2, Lock, Search, Shield, Sparkles, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatEUR } from "@/lib/finance";

export const Route = createFileRoute("/_app/app/connect")({
  head: () => ({ meta: [{ title: "Connecter ma banque — FinEase" }] }),
  component: ConnectPage,
});

type LinkedAccount = {
  id: string;
  bank_name: string;
  account_name: string;
  balance: number;
  is_mock: boolean;
  last_sync_at: string | null;
};

type Step = "credentials" | "mfa" | "syncing" | "done";

function ConnectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [linked, setLinked] = useState<LinkedAccount[]>([]);
  const [selected, setSelected] = useState<MockBank | null>(null);
  const [step, setStep] = useState<Step>("credentials");
  const [creds, setCreds] = useState({ id: "", password: "", code: "" });
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);

  const loadLinked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("id,bank_name,account_name,balance,is_mock,last_sync_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLinked((data ?? []) as LinkedAccount[]);
  };
  useEffect(() => { void loadLinked(); }, [user]);

  const filtered = MOCK_BANKS.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));

  const openBank = (b: MockBank) => {
    setSelected(b);
    setStep("credentials");
    setCreds({ id: "", password: "", code: "" });
    setProgress(0);
    setImported(0);
  };

  const submitCreds = async () => {
    if (!creds.id || !creds.password) return toast.error("Identifiant et mot de passe requis");
    setStep("mfa");
  };

  const submitMfa = async () => {
    if (creds.code.length < 4) return toast.error("Code à 6 chiffres requis");
    if (!user || !selected) return;
    setStep("syncing");

    // Simulate connection + sync with a progress bar
    const steps = [
      { p: 15, msg: "Authentification sécurisée…" },
      { p: 35, msg: "Récupération des comptes…" },
      { p: 60, msg: "Import des transactions…" },
      { p: 85, msg: "Catégorisation IA…" },
      { p: 100, msg: "Finalisation…" },
    ];
    for (const s of steps) {
      await new Promise(r => setTimeout(r, 450));
      setProgress(s.p);
    }

    // Generate data
    const txs = generateMockTransactions(selected.id, 3);
    const balance = estimateBalance(txs);

    // Create account
    const { data: acc, error: accErr } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        bank_name: selected.name,
        account_name: `Compte courant ${selected.shortName}`,
        account_type: "CHECKING",
        balance,
        currency: "EUR",
        is_mock: true,
        last_sync_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (accErr || !acc) {
      toast.error(accErr?.message ?? "Erreur création compte");
      setStep("credentials");
      return;
    }

    // Insert transactions
    const rows = txs.map(t => ({ ...t, user_id: user.id, account_id: acc.id }));
    const { error: txErr } = await supabase.from("transactions").insert(rows);
    if (txErr) toast.error(txErr.message);

    setImported(txs.length);
    setStep("done");
    void loadLinked();
  };

  const disconnect = async (acc: LinkedAccount) => {
    if (!confirm(`Déconnecter ${acc.bank_name} ? Les transactions importées seront supprimées.`)) return;
    await supabase.from("transactions").delete().eq("account_id", acc.id);
    await supabase.from("bank_accounts").delete().eq("id", acc.id);
    toast.success("Compte déconnecté");
    void loadLinked();
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link to="/app/transactions" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Retour aux transactions
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Connecter ma banque</h1>
        <p className="text-sm text-muted-foreground">Importez automatiquement vos transactions via une connexion sécurisée.</p>
      </header>

      {/* Trust banner */}
      <Card className="p-4 md:p-5 shadow-soft border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="size-5" />
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold">Connexion sécurisée DSP2</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Vos identifiants ne sont jamais stockés. La synchronisation passe par un agrégateur agréé (Bridge / Powens) en lecture seule. Vous pouvez révoquer l'accès à tout moment.
            </p>
          </div>
        </div>
      </Card>

      {linked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Comptes connectés</h2>
          <div className="grid gap-2">
            {linked.map(acc => {
              const bank = MOCK_BANKS.find(b => b.name === acc.bank_name);
              return (
                <Card key={acc.id} className="p-4 shadow-soft border-border/60 flex items-center gap-3">
                  <div className="size-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: bank?.bg ?? "var(--primary)" }}>
                    {bank?.initials ?? <Building2 className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{acc.bank_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {acc.account_name}
                      {acc.last_sync_at && <> · Sync {new Date(acc.last_sync_at).toLocaleDateString("fr-FR")}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums text-sm">{formatEUR(acc.balance)}</p>
                    {acc.is_mock && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">démo</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => disconnect(acc)} aria-label="Déconnecter">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Choisissez votre banque</h2>
          <span className="text-xs text-muted-foreground">{MOCK_BANKS.length} disponibles</span>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une banque…" className="pl-9" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(b => (
            <button
              key={b.id}
              onClick={() => openBank(b)}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:shadow-elegant hover:border-primary/40 active:scale-[0.98]"
            >
              <div className="size-12 rounded-xl flex items-center justify-center text-white font-bold text-sm mb-3 shadow-soft" style={{ background: b.bg }}>
                {b.initials}
              </div>
              <p className="font-semibold text-sm leading-tight">{b.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{b.tagline}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-6">Aucune banque trouvée.</p>
          )}
        </div>
      </section>

      {/* Connect dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: selected.bg }}>
                    {selected.initials}
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selected.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground">Connexion sécurisée</p>
                  </div>
                </div>
              </DialogHeader>

              {step === "credentials" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                    <Lock className="size-3.5 mt-0.5 shrink-0" />
                    <span>Identifiez-vous comme sur le site de votre banque. Connexion chiffrée de bout en bout.</span>
                  </div>
                  <div>
                    <Label>Identifiant client</Label>
                    <Input value={creds.id} onChange={e => setCreds({...creds, id: e.target.value})} placeholder="Ex: 12345678" autoFocus />
                  </div>
                  <div>
                    <Label>Mot de passe</Label>
                    <Input type="password" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} placeholder="••••••••" />
                  </div>
                  <Button onClick={submitCreds} className="w-full bg-gradient-primary border-0">
                    Continuer
                  </Button>
                </div>
              )}

              {step === "mfa" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Un code de validation a été envoyé sur votre application <strong className="text-foreground">{selected.shortName}</strong>. Saisissez-le pour confirmer.
                  </p>
                  <div>
                    <Label>Code de validation</Label>
                    <Input
                      value={creds.code}
                      onChange={e => setCreds({...creds, code: e.target.value.replace(/\D/g,"").slice(0,6)})}
                      placeholder="123456"
                      inputMode="numeric"
                      className="text-center text-lg tracking-[0.5em] font-mono"
                      autoFocus
                    />
                  </div>
                  <Button onClick={submitMfa} className="w-full bg-gradient-primary border-0">
                    Valider et synchroniser
                  </Button>
                </div>
              )}

              {step === "syncing" && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="size-7 text-primary animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {progress < 35 && "Authentification sécurisée…"}
                      {progress >= 35 && progress < 60 && "Récupération des comptes…"}
                      {progress >= 60 && progress < 85 && "Import des transactions…"}
                      {progress >= 85 && progress < 100 && "Catégorisation IA…"}
                      {progress >= 100 && "Finalisation…"}
                    </p>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="space-y-4 py-2 text-center">
                  <div className="size-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="size-8 text-success" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">Connexion réussie !</p>
                    <p className="text-sm text-muted-foreground">
                      <Sparkles className="size-3.5 inline -mt-0.5 mr-1 text-primary" />
                      {imported} transactions importées et catégorisées
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Fermer</Button>
                    <Button className="flex-1 bg-gradient-primary border-0" onClick={() => { setSelected(null); router.navigate({ to: "/app/transactions" }); }}>
                      Voir mes opérations
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
