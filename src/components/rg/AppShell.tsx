import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronsUpDown, Menu, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Brand } from "./primitives";
import { ADMIN_NAV, APP_NAV, APP_SECONDARY, type NavItem } from "./nav";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/auth";

const ALL = [...APP_NAV, ...APP_SECONDARY, ...ADMIN_NAV];

function NavList({
  groups,
  path,
  onNavigate,
}: {
  groups: { label: string; items: NavItem[] }[];
  path: string;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            {g.label}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const root = i.to === "/app" || i.to === "/admin";
              const active = root ? path === i.to || path === i.to + "/" : path.startsWith(i.to);
              return (
                <li key={i.to}>
                  <Link
                    to={i.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active && "bg-sidebar-accent font-medium text-sidebar-primary",
                    )}
                  >
                    <i.icon className="h-4 w-4" /> {i.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ variant }: { variant: "app" | "admin" }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSessionUser();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const groups =
    variant === "app"
      ? [
          { label: "Workspace", items: APP_NAV },
          { label: "More", items: APP_SECONDARY },
        ]
      : [{ label: "Super Admin", items: ADMIN_NAV }];

  const segments = path.split("/").filter(Boolean);
  const crumbs = segments.map((seg, idx) => {
    const to = "/" + segments.slice(0, idx + 1).join("/");
    const match = ALL.find((n) => n.to === to);
    return {
      to,
      label:
        match?.title ??
        (idx === 0 ? (seg === "admin" ? "Admin" : "Workspace") : decodeURIComponent(seg)),
    };
  });

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Brand inverted />
      </div>
      {variant === "admin" && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md bg-sidebar-accent p-2 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-sidebar-primary" />
          Super Admin access will be enforced server-side once authentication ships.
        </div>
      )}
      <NavList groups={groups} path={path} onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border p-3 text-xs">
        <Link
          to={variant === "app" ? "/admin" : "/app"}
          onClick={onNavigate}
          className="block rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
        >
          {variant === "app" ? "Super Admin panel →" : "← Back to workspace"}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar()}</aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
                No organization <ChevronsUpDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                Organization workspaces are not available yet.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>

          <ol
            className="hidden min-w-0 items-center gap-1 truncate text-sm text-muted-foreground md:flex"
            aria-label="Breadcrumb"
          >
            {crumbs.map((c, i) => (
              <li key={c.to} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {i === crumbs.length - 1 ? (
                  <span className="text-foreground">{c.label}</span>
                ) : (
                  <Link to={c.to} className="hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search pages</span>
              <kbd className="hidden rounded bg-muted px-1 text-[10px] sm:inline">⌘K</kbd>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-sm">
                <p className="font-medium">Notifications</p>
                <p className="mt-1 text-muted-foreground">
                  No notifications. Delivery starts once the backend is connected.
                </p>
                <Link
                  to="/app/notifications"
                  className="mt-2 inline-block text-xs text-primary underline"
                >
                  Notification settings
                </Link>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Profile menu"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                >
                  ?
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="max-w-56 truncate">
                  {user?.email ?? "Signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/app/profile" })}>
                  Profile & security
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/app/settings" })}>
                  Organization settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/login" })}>
                  Go to sign in
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
          Rating Guard · Powered by Software Vala™
        </footer>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Jump to a page…" />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          <CommandGroup heading="Workspace">
            {[...APP_NAV, ...APP_SECONDARY].map((n) => (
              <CommandItem
                key={n.to}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate({ to: n.to });
                }}
              >
                <n.icon className="mr-2 h-4 w-4" />
                {n.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Super Admin">
            {ADMIN_NAV.map((n) => (
              <CommandItem
                key={n.to}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate({ to: n.to });
                }}
              >
                <n.icon className="mr-2 h-4 w-4" />
                {n.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
