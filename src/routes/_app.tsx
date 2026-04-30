import { createFileRoute, Outlet, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.navigate({ to: "/auth" }); return; }
    if (profile && !profile.onboarding_completed && !location.pathname.startsWith("/app/onboarding")) {
      router.navigate({ to: "/app/onboarding" });
    }
  }, [user, profile, loading, location.pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  // Onboarding renders without sidebar
  if (profile && !profile.onboarding_completed) {
    return <Outlet />;
  }
  return <AppShell><Outlet /></AppShell>;
}
