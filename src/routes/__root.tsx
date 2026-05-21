import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FinanceApp — Reprenez le contrôle de vos finances" },
      { name: "description", content: "FinanceApp, l'app qui vous aide à voir, comprendre, épargner et investir votre argent." },
      { property: "og:title", content: "FinanceApp — Reprenez le contrôle de vos finances" },
      { property: "og:description", content: "FinanceApp, l'app qui vous aide à voir, comprendre, épargner et investir votre argent." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "FinanceApp — Reprenez le contrôle de vos finances" },
      { name: "twitter:description", content: "FinanceApp, l'app qui vous aide à voir, comprendre, épargner et investir votre argent." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b5ffd818-9a2c-4bda-9942-65a1d7767c80/id-preview-20152ce5--85e07f14-ea0d-4a88-a69f-00547d7596b8.lovable.app-1779316004427.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b5ffd818-9a2c-4bda-9942-65a1d7767c80/id-preview-20152ce5--85e07f14-ea0d-4a88-a69f-00547d7596b8.lovable.app-1779316004427.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
