import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, TrendingUp, Bell, LogOut, Sparkles, Link2, MessageCircle, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/app", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, exact: true },
  { to: "/app/transactions", label: "Transactions", short: "Opés", icon: ArrowLeftRight },
  { to: "/app/budget", label: "Budget", short: "Budget", icon: Wallet },
  { to: "/app/savings", label: "Épargne", short: "Épargne", icon: Target },
  { to: "/app/investments", label: "Investir", short: "Invest", icon: TrendingUp },
  { to: "/app/connect", label: "Ma banque", short: "Banque", icon: Link2 },
] as const;

// Bottom nav mobile : 4 essentiels uniquement
const MOBILE_NAV = [
  { to: "/app", label: "Accueil", icon: LayoutDashboard, exact: true },
  { to: "/app/transactions", label: "Opés", icon: ArrowLeftRight },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/investments", label: "Invest", icon: TrendingUp },
] as const;

// Toutes les fonctionnalités accessibles via le menu déroulant
const MENU_ITEMS = [
  { to: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/app/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/savings", label: "Épargne", icon: Target },
  { to: "/app/investments", label: "Investir", icon: TrendingUp },
  { to: "/app/connect", label: "Ma banque", icon: Link2 },
  { to: "/app/alerts", label: "Alertes", icon: Bell },
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
          <span className="text-lg font-semibold tracking-tight">FinEase</span>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((item) => {
            const isExact = "exact" in item && item.exact;
            const active = isExact ? location.pathname === item.to : location.pathname.startsWith(item.to);
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

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-sidebar/95 backdrop-blur text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-4">
        <Link to="/app" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">FinEase</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/app/alerts" className="relative size-9 rounded-lg flex items-center justify-center hover:bg-sidebar-accent">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-warning text-warning-foreground text-[10px] font-semibold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-9 rounded-lg flex items-center justify-center hover:bg-sidebar-accent" aria-label="Menu">
                <Menu className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Toutes les fonctionnalités</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="flex items-center gap-2 cursor-pointer">
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="size-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={handleSignOut} className="size-9 rounded-lg flex items-center justify-center hover:bg-sidebar-accent" aria-label="Déconnexion">
            <LogOut className="size-5" />
          </button>
        </div>

      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground border-t border-sidebar-border flex justify-around shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        {MOBILE_NAV.map((item) => {
          const isExact = "exact" in item && item.exact;
          const active = isExact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-all relative flex-1 min-h-[56px] active:scale-95",
                active ? "text-primary-glow" : "text-sidebar-foreground/60"
              )}>
              <span className={cn(
                "relative flex items-center justify-center transition-all",
                active && "size-9 rounded-full bg-primary-glow/15"
              )}>
                <Icon className={cn("transition-all", active ? "size-5" : "size-[22px]")} />
              </span>
              <span className={cn("transition-opacity whitespace-nowrap", active ? "opacity-100" : "opacity-80")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>


      {/* Floating chat button */}
      <Link
        to="/app/chat"
        className={cn(
          "fixed z-[60] flex items-center justify-center rounded-full shadow-glow transition-transform active:scale-90 hover:scale-105",
          "size-14 bg-gradient-primary text-primary-foreground",
          "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-8"
        )}
        aria-label="Assistant IA"
      >
        <MessageCircle className="size-6" />
        <span className="absolute top-0 right-0 size-3 rounded-full bg-warning border-2 border-background" />
      </Link>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
        {children}
      </main>
    </div>
  );
}
