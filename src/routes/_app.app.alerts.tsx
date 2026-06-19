import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";

export const Route = createFileRoute("/_app/app/alerts")({
  head: () => ({ meta: [{ title: "Alertes — FinEase" }] }),
  component: AlertsPage,
});

type Alert = { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string };

function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAlerts((data as Alert[]) ?? []);
  };
  useEffect(() => { void load();
    if (!user) return;
    const ch = supabase.channel("alerts-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  /* eslint-disable-next-line */ }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("alerts").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    void load();
  };

  return (
    <div className="p-4 md:p-10 max-w-3xl mx-auto space-y-5 md:space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alertes</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{alerts.filter(a => !a.is_read).length} non lue(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAll} className="shrink-0">
          <Check className="size-4 md:mr-1" /> <span className="hidden sm:inline">Tout marquer lu</span>
        </Button>
      </header>
      {alerts.length === 0 && <Card className="p-12 text-center text-muted-foreground shadow-soft">Pas d'alertes pour le moment.</Card>}
      <div className="space-y-3">
        {alerts.map(a => (
          <Card key={a.id} className={`p-4 shadow-soft border-border/60 flex gap-3 ${!a.is_read ? "bg-primary/5" : ""}`}>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Bell className="size-4" /></div>
            <div className="flex-1">
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("fr-FR")}</p>
            </div>
            {!a.is_read && <span className="size-2 rounded-full bg-primary mt-2 shrink-0" />}
          </Card>
        ))}
      </div>
    </div>
  );
}
