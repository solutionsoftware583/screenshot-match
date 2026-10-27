import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceResult } from "@/lib/contracts";
import { BackendNotice, DataTable, PageHeader, type Column } from "./primitives";

export function ListPage<T extends { id: string }>({
  title, description, queryKey, load, columns, emptyTitle, emptyDescription, actions, filter,
}: {
  title: string;
  description: string;
  queryKey: string;
  load: () => Promise<ServiceResult<T[]>>;
  columns: Column<T>[];
  emptyTitle: string;
  emptyDescription?: string;
  actions?: ReactNode;
  filter?: { key: keyof T & string; label: string; options: { value: string; label: string }[] };
}) {
  const { data, isLoading, isError } = useQuery({ queryKey: [queryKey], queryFn: load });
  const [fv, setFv] = useState("all");
  const rows = (data?.data ?? []).filter((r) => !filter || fv === "all" || String(r[filter.key]) === fv);

  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      {data && !data.connected && <BackendNotice feature={title} />}
      {isError ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">Couldn't load {title.toLowerCase()}. Please try again.</p>
      ) : isLoading ? (
        <div className="space-y-2" aria-busy>{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          filters={filter && (
            <Select value={fv} onValueChange={setFv}>
              <SelectTrigger className="sm:w-48" aria-label={`Filter by ${filter.label}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                {filter.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </div>
  );
}

export const PLATFORM_OPTIONS = ["google", "yelp", "trustpilot", "facebook", "web", "other"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
export const STATUS_OPTIONS = ["draft", "under_review", "awaiting_approval", "submitted", "platform_responded", "appealed", "closed"].map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
