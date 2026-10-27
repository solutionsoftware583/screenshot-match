import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAudit, listAuditActions } from "@/lib/workspace.functions";
import { EmptyState } from "./primitives";
import { QueryState, useCurrentOrg } from "./manage";

const ALL = "__all";

/** Read-only audit history. Scope "org" follows the header organization picker. */
export function AuditLogView({ scope }: { scope: "platform" | "org" }) {
  const { orgId } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [action, setAction] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const fetchAudit = useServerFn(listAudit);
  const fetchActions = useServerFn(listAuditActions);
  const org = scope === "org" ? orgId : null;

  const actions = useQuery({ queryKey: ["audit", "actions"], queryFn: () => fetchActions() });
  const q = useQuery({
    queryKey: ["audit", scope, org, applied, action, from, to, page],
    enabled: scope === "platform" || !!org,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchAudit({
        data: {
          orgId: org,
          search: applied,
          action: action === ALL ? undefined : action,
          from: from || undefined,
          // inclusive end date: everything before the next midnight
          to: to ? new Date(new Date(to).getTime() + 864e5).toISOString().slice(0, 10) : undefined,
          page,
          pageSize,
        },
      }),
  });
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(search);
          reset();
        }}
      >
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="audit-search">Search</Label>
          <div className="flex gap-2">
            <Input
              id="audit-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Actor, action, target…"
              maxLength={100}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v);
              reset();
            }}
          >
            <SelectTrigger aria-label="Action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {(actions.data ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              reset();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              reset();
            }}
          />
        </div>
      </form>

      {scope === "org" && !org ? (
        <EmptyState
          title="No organization selected"
          description="Pick an organization in the header to see its history."
        />
      ) : (
        <QueryState q={q}>
          {total === 0 ? (
            <EmptyState
              title="No audit events"
              description="Nothing matches these filters, or you don't have permission to read this history."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Actor</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Resource</th>
                      <th className="px-3 py-2">Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data!.rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {new Date(r.at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {r.actor_email ?? (r.actor_id ? "Deleted user" : "System")}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                        <td className="px-3 py-2">
                          {r.target_type ?? "—"}
                          {r.target_id && (
                            <span className="block font-mono text-xs text-muted-foreground break-all">
                              {r.target_id}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.org_name ?? (r.organization_id ? "Deleted organization" : "Platform")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {total} event{total === 1 ? "" : "s"} · page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </QueryState>
      )}
    </div>
  );
}
