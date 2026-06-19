import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createDemoAccount } from "@/lib/demo.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — FinEase" },
      { name: "description", content: "Connectez-vous ou créez votre compte FinEase." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/app" });
  }, [user, loading, router]);

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { first_name: first, last_name: last },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé, redirection…");
  };

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
  };

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/app` });
    if (r.error) { toast.error("Échec Google: " + (r.error?.message ?? "inconnu")); setBusy(false); }
  };

  const createDemo = useServerFn(createDemoAccount);
  const tryDemo = async () => {
    setBusy(true);
    try {
      const creds = await createDemo();
      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw error;
      toast.success("Compte démo prêt — exploration en cours…");
    } catch (e) {
      toast.error("Impossible de créer le compte démo: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="hidden md:flex md:w-1/2 bg-gradient-hero text-sidebar-foreground relative overflow-hidden">
        <div className="relative z-10 m-auto max-w-md px-12">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">FinEase</span>
          </Link>
          <h2 className="text-4xl font-bold tracking-tight">Vos finances, enfin claires.</h2>
          <p className="mt-4 text-sidebar-foreground/70">
            Tableau de bord unifié, alertes intelligentes, objectifs visuels et recommandations
            d'investissement personnalisées.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-elegant">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Se connecter</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" /></div>
              <div className="space-y-2"><Label>Mot de passe</Label>
                <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
              <Button className="w-full bg-gradient-primary border-0" disabled={busy} onClick={signIn}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />} Se connecter
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Prénom</Label>
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
                <div className="space-y-2"><Label>Nom</Label>
                  <Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Mot de passe</Label>
                <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Au moins 8 caractères" /></div>
              <Button className="w-full bg-gradient-primary border-0" disabled={busy} onClick={signUp}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />} Créer mon compte
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={google}>
            <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuer avec Google
          </Button>

          <Button
            variant="secondary"
            className="w-full mt-3"
            disabled={busy}
            onClick={tryDemo}
          >
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Wand2 className="size-4 mr-2" />}
            Essayer avec un compte démo
          </Button>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            Compte pré-rempli avec comptes bancaires, transactions, budgets, objectifs et investissements.
          </p>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos conditions. <Link to="/" className="underline">Retour à l'accueil</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
