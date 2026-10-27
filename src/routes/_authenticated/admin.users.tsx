import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionMessage, MKEY, QueryState, fmtDate, useAction, useMyAccess } from "@/components/rg/manage";
import { listPlatformPeople, setPlatformRole } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: meta("Users", "Every account on the platform and its platform-level roles.", "Super Admin"),
  component: Page,
});

const PLATFORM_ROLES: Record<string, string> = {
  super_admin: "Super Admin",
  global_manager: "Global Manager",
  auditor: "Read-only Auditor",
};

function Page() {
  const access = useMyAccess();
  const fn = useServerFn(listPlatformPeople);
  const q = useQuery({ queryKey: [...MKEY, "platform-people"], queryFn: () => fn() });
  const act = useAction(useServerFn(setPlatformRole), "Platform role updated");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("global_manager");
  const [search, setSearch] = useState("");
  const isSuper = !!access.data?.is_super_admin;
  const rows = (q.data ?? []).filter((p) => `${p.email} ${p.full_name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="All accounts. Platform roles (Super Admin, Global Manager, Auditor) apply across every organization." />
      {isSuper && (
        <Section title="Grant platform role" description="The person must already have an account. You can't change your own platform roles.">
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); act.mutate({ data: { email, role } }, { onSuccess: () => setEmail("") }); }}>
            <Input type="email" className="max-w-xs" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-48" aria-label="Role"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PLATFORM_ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="submit" disabled={act.isPending}>Grant</Button>
          </form>
        </Section>
      )}
      <ActionMessage msg={act.msg} />
      <Input className="max-w-xs" placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
      <QueryState q={q}>
        {rows.length === 0 ? <EmptyState title="No users" description="No accounts match, or you lack platform access." /> : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">User</th><th>Platform roles</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.user_id} className="border-t">
                    <td className="p-3">{p.full_name ?? "—"}<div className="text-xs text-muted-foreground">{p.email}</div></td>
                    <td className="space-x-1">
                      {p.platform_roles.length === 0 ? <span className="text-muted-foreground">None</span> :
                        p.platform_roles.map((r) => (
                          <Badge key={r} variant="secondary" className="gap-1">
                            {PLATFORM_ROLES[r] ?? r}
                            {isSuper && (
                              <button type="button" aria-label={`Remove ${PLATFORM_ROLES[r]}`} className="ml-1 hover:text-destructive"
                                onClick={() => confirm(`Remove ${PLATFORM_ROLES[r]} from ${p.email}?`) && act.mutate({ data: { email: p.email, role: r, remove: true } })}>×</button>
                            )}
                          </Badge>
                        ))}
                    </td>
                    <td>{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
