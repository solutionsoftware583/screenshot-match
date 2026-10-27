import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionMessage, MKEY, QueryState, fmtDate, useAction, useMyAccess, useOrganizations } from "@/components/rg/manage";
import {
  createOrganization, deleteOrganization, listResellers, setOrganizationReseller, updateOrganization, type OrgRow,
} from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  head: meta("Organizations", "Create and manage client organizations and their reseller.", "Super Admin"),
  component: Page,
});

const NONE = "__none";

function Page() {
  const access = useMyAccess();
  const orgs = useOrganizations();
  const resFn = useServerFn(listResellers);
  const resellers = useQuery({ queryKey: [...MKEY, "resellers"], queryFn: () => resFn() });
  const create = useAction(useServerFn(createOrganization), "Organization created");
  const [name, setName] = useState("");
  const [reseller, setReseller] = useState(NONE);
  const isPlatform = !!access.data?.can_manage_resellers;
  const adminOf = access.data?.reseller_admin_of ?? [];
  const resellerOptions = (resellers.data ?? []).filter((r) => isPlatform || adminOf.includes(r.id));
  const canCreate = isPlatform || adminOf.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Organizations" description="Client organizations. Each belongs directly to the platform or to one reseller." />
      {canCreate && (
        <Section title="New organization">
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ data: { name, resellerId: reseller === NONE ? null : reseller } }, { onSuccess: () => setName("") });
          }}>
            <Input className="max-w-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" required maxLength={200} />
            <Select value={reseller} onValueChange={setReseller}>
              <SelectTrigger className="w-56" aria-label="Reseller"><SelectValue /></SelectTrigger>
              <SelectContent>
                {isPlatform && <SelectItem value={NONE}>Direct (no reseller)</SelectItem>}
                {resellerOptions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={create.isPending || (!isPlatform && reseller === NONE)}>
              {create.isPending ? "Creating…" : "Create organization"}
            </Button>
            <ActionMessage msg={create.msg} />
          </form>
        </Section>
      )}
      <QueryState q={orgs}>
        {(orgs.data ?? []).length === 0 ? (
          <EmptyState title="No organizations" description={canCreate ? "Create one above." : "You don't have access to any organization."} />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Organization</th><th>Reseller</th><th>Regions</th><th>Teams</th><th>Created</th><th /></tr>
              </thead>
              <tbody>
                {orgs.data!.map((o) => (
                  <OrgRowView key={o.id} o={o} isPlatform={isPlatform} resellers={resellers.data ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function OrgRowView({ o, isPlatform, resellers }: { o: OrgRow; isPlatform: boolean; resellers: { id: string; name: string }[] }) {
  const [edit, setEdit] = useState<string | null>(null);
  const upd = useAction(useServerFn(updateOrganization));
  const move = useAction(useServerFn(setOrganizationReseller), "Reseller changed");
  const del = useAction(useServerFn(deleteOrganization));
  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">
        {edit !== null ? (
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            upd.mutate({ data: { id: o.id, name: edit, geo: o.geo_hierarchy_enabled, teams: o.teams_enabled } }, { onSuccess: () => setEdit(null) });
          }}>
            <Input value={edit} onChange={(e) => setEdit(e.target.value)} required maxLength={200} aria-label="Organization name" />
            <Button size="sm" type="submit">Save</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          </form>
        ) : o.name}
        <ActionMessage msg={upd.msg ?? move.msg ?? del.msg} />
      </td>
      <td className="py-2">
        {isPlatform ? (
          <Select value={o.reseller_id ?? NONE} onValueChange={(v) => move.mutate({ data: { id: o.id, resellerId: v === NONE ? null : v } })}>
            <SelectTrigger className="h-8 w-44" aria-label="Reseller"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Direct</SelectItem>
              {resellers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : o.reseller_name ?? "Direct"}
      </td>
      <td className="py-3">{o.geo_hierarchy_enabled ? "On" : "Off"}</td>
      <td className="py-3">{o.teams_enabled ? "On" : "Off"}</td>
      <td className="py-3">{fmtDate(o.created_at)}</td>
      <td className="p-3 text-right whitespace-nowrap">
        {edit === null && <Button size="sm" variant="ghost" onClick={() => setEdit(o.name)}>Rename</Button>}
        {isPlatform && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={del.isPending}
            onClick={() => confirm(`Delete "${o.name}"? Only empty organizations can be deleted.`) && del.mutate({ data: { id: o.id } })}>
            Delete
          </Button>
        )}
      </td>
    </tr>
  );
}
