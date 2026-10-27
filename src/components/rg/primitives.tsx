import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  PlugZap,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Brand({
  inverted = false,
  compact = false,
}: {
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Rating Guard home">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground shadow-glow">
        <ShieldCheck className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span
            className={cn(
              "block font-display text-base font-semibold",
              inverted ? "text-sidebar-accent-foreground" : "text-foreground",
            )}
          >
            Rating Guard
          </span>
          <span
            className={cn(
              "block text-[10px] uppercase tracking-wider",
              inverted ? "text-sidebar-foreground/70" : "text-muted-foreground",
            )}
          >
            Powered by Software Vala™
          </span>
        </span>
      )}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function BackendNotice({ feature }: { feature?: string }) {
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground"
    >
      <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p>
        <strong className="font-medium">Backend not connected.</strong> {feature ?? "This area"}{" "}
        shows only real data, and no data source is connected yet. Actions that need the server are
        disabled.
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function UnavailableButton({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "outline";
}) {
  return (
    <Button variant={variant} disabled title="Requires backend — not connected yet" aria-disabled>
      {children}
    </Button>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hint ?? (value === null ? "No data source connected" : "")}
      </p>
    </div>
  );
}

export interface Column<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  filters,
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  emptyTitle: string;
  emptyDescription?: string | undefined;
  filters?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle
      ? rows.filter((r) =>
          columns.some((c) =>
            String(r[c.key] ?? "")
              .toLowerCase()
              .includes(needle),
          ),
        )
      : rows;
    if (sort)
      out = [...out].sort((a, b) =>
        String((a as never)[sort.key]) > String((b as never)[sort.key]) ? sort.dir : -sort.dir,
      );
    return out;
  }, [rows, q, sort, columns]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search records"
            placeholder="Search…"
            className="pl-8"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {filters}
      </div>
      {current.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={q ? "No matching records" : emptyTitle}
            description={q ? "Try a different search term." : emptyDescription}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-2 font-medium">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() =>
                        setSort((s) => ({
                          key: c.key,
                          dir: s?.key === c.key && s.dir === 1 ? -1 : 1,
                        }))
                      }
                    >
                      {c.label} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr key={r.id} className="border-t">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2">
                      {c.render ? c.render(r) : String(r[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next page"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
