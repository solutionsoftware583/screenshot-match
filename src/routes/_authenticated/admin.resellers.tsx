import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ActionMessage,
  MKEY,
  QueryState,
  fmtDate,
  inviteStatus,
  useAction,
  useMyAccess,
} from "@/components/rg/manage";
import { InviteLink } from "@/components/rg/InviteLink";
import {
  assignResellerStaff,
  createInvitation,
  createReseller,
  deleteReseller,
  getResellerDetail,
  listResellers,
  revokeInvitation,
  updateReseller,
} from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/admin/resellers")({
  head: meta(
    "Resellers",
    "Create resellers, invite their staff and assign client organizations.",
    "Super Admin",
  ),
  component: Page,
});

function Page() {
  const access = useMyAccess();
  const listFn = useServerFn(listResellers);
  const q = useQuery({ queryKey: [...MKEY, "resellers"], queryFn: () => listFn() });
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const create = useAction(useServerFn(createReseller), "Reseller created");
  const canManage = !!access.data?.can_manage_resellers;
  const rows = q.data ?? [];
  const current = rows.find((r) => r.id === sel) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Resellers"
        description="Partners who manage client organizations. Resellers only see organizations assigned to them."
      />
      {canManage && (
        <Section title="New reseller">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ data: { name } }, { onSuccess: () => setName("") });
            }}
          >
            <Input
              className="max-w-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Reseller name"
              required
              maxLength={200}
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create reseller"}
            </Button>
            <ActionMessage msg={create.msg} />
          </form>
        </Section>
      )}
      <QueryState q={q}>
        {rows.length === 0 ? (
          <EmptyState
            title="No resellers"
            description={
              canManage
                ? "Create your first reseller above."
                : "You aren't assigned to any reseller."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Reseller</th>
                  <th>Organizations</th>
                  <th>Created</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <ResellerRow
                    key={r.id}
                    r={r}
                    canManage={canManage}
                    selected={sel === r.id}
                    onSelect={() => setSel(sel === r.id ? null : r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      {current && <ResellerDetail id={current.id} name={current.name} canManage={canManage} />}
    </div>
  );
}

function ResellerRow({
  r,
  canManage,
  selected,
  onSelect,
}: {
  r: { id: string; name: string; org_count: number; created_at: string };
  canManage: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [edit, setEdit] = useState<string | null>(null);
  const upd = useAction(useServerFn(updateReseller));
  const del = useAction(useServerFn(deleteReseller));
  return (
    <tr className={`border-t ${selected ? "bg-muted/50" : ""}`}>
      <td className="p-3 font-medium">
        {edit !== null ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              upd.mutate({ data: { id: r.id, name: edit } }, { onSuccess: () => setEdit(null) });
            }}
          >
            <Input
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              required
              maxLength={200}
              aria-label="Reseller name"
            />
            <Button size="sm" type="submit" disabled={upd.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setEdit(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          r.name
        )}
        <ActionMessage msg={upd.msg ?? del.msg} />
      </td>
      <td>{r.org_count}</td>
      <td>{fmtDate(r.created_at)}</td>
      <td className="p-3 text-right whitespace-nowrap">
        <Button size="sm" variant="outline" onClick={onSelect}>
          {selected ? "Close" : "Manage"}
        </Button>
        {canManage && edit === null && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEdit(r.name)}>
              Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={del.isPending}
              onClick={() =>
                confirm(`Delete reseller "${r.name}"?`) && del.mutate({ data: { id: r.id } })
              }
            >
              Delete
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}

function ResellerDetail({ id, name, canManage }: { id: string; name: string; canManage: boolean }) {
  const fn = useServerFn(getResellerDetail);
  const q = useQuery({
    queryKey: [...MKEY, "reseller", id],
    queryFn: () => fn({ data: { resellerId: id } }),
  });
  const invite = useAction(useServerFn(createInvitation));
  const revoke = useAction(useServerFn(revokeInvitation), "Invitation revoked");
  const assign = useAction(useServerFn(assignResellerStaff));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reseller_staff");
  const [token, setToken] = useState<string | null>(null);
  const d = q.data;

  return (
    <Section
      title={`${name} — people & client access`}
      description="Reseller Admins see every client organization of this reseller; Reseller Staff only see organizations ticked below."
    >
      <QueryState q={q}>
        {d && (
          <div className="space-y-6">
            {canManage && (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  invite.mutate(
                    { data: { resellerId: id, email, role } },
                    {
                      onSuccess: (t) => {
                        setToken(t);
                        setEmail("");
                      },
                    },
                  );
                }}
              >
                <Input
                  type="email"
                  className="max-w-xs"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-44" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reseller_admin">Reseller Admin</SelectItem>
                    <SelectItem value="reseller_staff">Reseller Staff</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={invite.isPending}>
                  Invite
                </Button>
                <ActionMessage msg={invite.msg} />
              </form>
            )}
            {token && <InviteLink token={token} />}

            <div>
              <h3 className="mb-2 text-sm font-medium">Members</h3>
              {d.people.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1">Person</th>
                      <th>Role</th>
                      <th>Assigned client organizations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.people.map((p) => (
                      <tr key={p.user_id} className="border-t align-top">
                        <td className="py-2">
                          {p.full_name ?? p.email}
                          <div className="text-xs text-muted-foreground">{p.email}</div>
                        </td>
                        <td>
                          {p.role_key === "reseller_admin" ? "Reseller Admin" : "Reseller Staff"}
                        </td>
                        <td className="py-2">
                          {p.role_key === "reseller_admin" ? (
                            <span className="text-muted-foreground">All</span>
                          ) : d.orgs.length === 0 ? (
                            <span className="text-muted-foreground">No client organizations</span>
                          ) : (
                            d.orgs.map((o) => {
                              const on = d.assignments.some(
                                (a) => a.organization_id === o.id && a.user_id === p.user_id,
                              );
                              return (
                                <label key={o.id} className="mr-4 inline-flex items-center gap-1.5">
                                  <Checkbox
                                    checked={on}
                                    disabled={assign.isPending}
                                    onCheckedChange={(v) =>
                                      assign.mutate({
                                        data: { orgId: o.id, userId: p.user_id, assign: !!v },
                                      })
                                    }
                                  />
                                  {o.name}
                                </label>
                              );
                            })
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <ActionMessage msg={assign.msg} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Invitations</h3>
              {d.invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invitations.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {d.invitations.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2">
                      <span>
                        {i.email} ·{" "}
                        {i.role_key === "reseller_admin" ? "Reseller Admin" : "Reseller Staff"} ·{" "}
                        {inviteStatus(i)}
                      </span>
                      {canManage && inviteStatus(i) === "Pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revoke.mutate({ data: { id: i.id } })}
                        >
                          Revoke
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <ActionMessage msg={revoke.msg} />
            </div>
          </div>
        )}
      </QueryState>
    </Section>
  );
}
