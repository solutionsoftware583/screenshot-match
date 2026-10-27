import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Brand } from "./primitives";

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/workflows", label: "Workflows" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Brand />
          <nav className="ml-6 hidden gap-6 text-sm md:flex">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>{l.label}</Link>
            ))}
          </nav>
          <div className="ml-auto hidden gap-2 md:flex">
            <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/register">Get started</Link></Button>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Menu className="h-5 w-5" /></Button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
            {LINKS.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-1.5 text-sm">{l.label}</Link>)}
            <Link to="/login" className="py-1.5 text-sm">Sign in</Link>
            <Link to="/register" className="py-1.5 text-sm font-medium text-primary">Get started</Link>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/app" className="hover:text-foreground">App preview</Link>
          </div>
          <p>© {new Date().getFullYear()} Software Vala™</p>
        </div>
      </footer>
    </div>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </PublicLayout>
  );
}
