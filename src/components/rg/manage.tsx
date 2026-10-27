import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyAccess, getOrgDetail, listOrganizations, listRoleCatalog } from "@/lib/management.functions";
import { EmptyState } from "./primitives";

export const MKEY = ["mgmt"] as const;

export function useMyAccess() {
  const fn = useServerFn(getMyAccess);
  return useQuery({ queryKey: [...MKEY, "access"], queryFn: () => fn() });
}
export function useOrganizations() {
  const fn = useServerFn(listOrganizations);
  return useQuery({ queryKey: [...MKEY, "orgs"], queryFn: () => fn() });
}
export function useRoleCatalog() {
  const fn = useServerFn(listRoleCatalog);
  return useQuery({ queryKey: [...MKEY, "roles"], queryFn: () => fn(), staleTime: 5 * 60_000 });
}
export function useOrgDetail(orgId: string | null) {
  const fn = useServerFn(getOrgDetail);
  return useQuery({
    queryKey: [...MKEY, "org", orgId],
    queryFn: () => fn({ data: { orgId: orgId! } }),
    enabled: !!orgId,
  });
}

const ORG_KEY = "rg.currentOrg"; // UI preference only; access is decided by the database.

/** Currently selected organization among those the user can see. */
export function useCurrentOrg() {
  const orgs = useOrganizations();
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(window.localStorage.getItem(ORG_KEY)), []);
  const list = orgs.data ?? [];
  const orgId = list.find((o) => o.id === picked)?.id ?? list[0]?.id ?? null;
  const select = (id: string) => {
    window.localStorage.setItem(ORG_KEY, id);
    setPicked(id);
  };
  return { orgs, list, orgId, select };
}

export function OrgPicker({ list, orgId, select }: ReturnType<typeof useCurrentOrg>) {
  if (list.length < 2) return null;
  return (
    <Select value={orgId ?? ""} onValueChange={select}>
      <SelectTrigger className="w-60" aria-label="Organization">
        <SelectValue placeholder="Organization" />
      </SelectTrigger>
      <SelectContent>
        {list.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Wraps a query's loading / error state. */
export function QueryState({ q, children }: { q: { isLoading: boolean; error: unknown; refetch: () => unknown }; children: ReactNode }) {
  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (q.error)
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" />{errMsg(q.error)}</span>
        <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button>
      </div>
    );
  return <>{children}</>;
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Shows the "pick / create an organization first" state. */
export function NoOrg() {
  return (
    <EmptyState
      title="No organization yet"
      description="You aren't a member of any organization. Ask an administrator to invite you, or create one under Super Admin → Organizations."
    />
  );
}

/** Mutation that reports real success/failure and refreshes management data. */
export function useAction<A, R>(fn: (a: A) => Promise<R>, success?: string) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const m = useMutation({
    mutationFn: fn,
    onMutate: () => setMsg(null),
    onSuccess: () => {
      if (success) setMsg({ ok: true, text: success });
      return qc.invalidateQueries({ queryKey: MKEY });
    },
    onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
  });
  return { ...m, msg, clear: () => setMsg(null) };
}

export function ActionMessage({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
      {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg.text}
    </p>
  );
}

export function NoPermission({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground">You don't have permission to {what} in this organization.</p>;
}

export const LEVEL_LABEL: Record<string, string> = {
  country: "Country",
  state: "State",
  division: "Division",
  district: "District",
};
export const GEO_ROLE_LEVEL: Record<string, string> = {
  country_manager: "country",
  state_manager: "state",
  divisional_manager: "division",
  district_manager: "district",
};

export function personLabel(p: { email: string; full_name: string | null } | undefined, fallback: string) {
  if (!p) return fallback;
  return p.full_name ? `${p.full_name} (${p.email})` : p.email;
}

export function inviteStatus(i: { accepted_at: string | null; rejected_at: string | null; revoked_at: string | null; expires_at: string }) {
  if (i.accepted_at) return "Accepted";
  if (i.revoked_at) return "Revoked";
  if (i.rejected_at) return "Declined";
  if (new Date(i.expires_at) <= new Date()) return "Expired";
  return "Pending";
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
