import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, TrendingUp, Bell, MessageCircle, LogOut, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true as boolean | undefined },
  { to: "/app/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/savings", label: "Épargne", icon: Target },
  { to: "/app/investments", label: "Investir", icon: TrendingUp },
  { to: "/app/chat", label: "Assistant IA", icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("alerts").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("is_read", false);
      setUnread(count ?? 0);
    };
    void load();
    const ch = supabase.channel("alerts-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const handleSignOut = async () => { await signOut(); router.navigate({ to: "/" }); };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Pécule</span>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <Link to="/app/alerts"
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              location.pathname.startsWith("/app/alerts")
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
            <span className="flex items-center gap-3"><Bell className="size-4" /> Alertes</span>
            {unread > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning text-warning-foreground">{unread}</span>
            )}
          </Link>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-3 rounded-lg bg-sidebar-accent">
            <p className="text-sm font-medium text-sidebar-accent-foreground">
              {profile?.first_name ?? "Utilisateur"} {profile?.last_name ?? ""}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" className="w-full mt-2 justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
            <LogOut className="size-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar text-sidebar-foreground border-t border-sidebar-border flex justify-around py-2">
        {NAV.slice(0, 5).map((item) => {
          const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-md text-[10px] font-medium",
                active ? "text-primary-glow" : "text-sidebar-foreground/60"
              )}>
              <Icon className="size-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
