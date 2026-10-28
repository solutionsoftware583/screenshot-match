import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import {
  ActionMessage,
  MKEY,
  NoOrg,
  NoPermission,
  QueryState,
  fmtDate,
  useAction,
  useCurrentOrg,
  useOrgDetail,
} from "@/components/rg/manage";
import { createCase, listCases } from "@/lib/cases.functions";
import { CASE_STATUSES, STATUS_LABEL, isRecheckDue } from "@/lib/caseflow";

export const Route = createFileRoute("/_authenticated/app/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — Rating Guard" },
      { name: "description", content: "Removal cases with status, priority and recheck dates." },
      { property: "og:title", content: "Cases — Rating Guard" },
      { property: "og:description", content: "Removal cases with status, priority and recheck dates." },
    ],
  }),
  component: Page,
});

function Page() {
  const { orgId, orgs } = useCurrentOrg();
  const detail = useOrgDetail(orgId);
  const list = useServerFn(listCases);
  const q = useQuery({
    queryKey: [...MKEY, "cases", orgId],
    queryFn: () => list({ data: { orgId: orgId! } }),
    enabled: !!orgId,
  });
  const [status, setStatus] = useState("all");
  const [show, setShow] = useState(false);
  const canEdit = detail.data?.permissions.includes("cases.edit");

  if (!orgs.isLoading && !orgId) return <NoOrg />;
  const rows = (q.data ?? []).filter((r) => status === "all" || r.status === status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Every removal case, with status, priority and recheck date."
        actions={canEdit ? <Button onClick={() => setShow((s) => !s)}>New case</Button> : undefined}
      />
      {show && canEdit && orgId && <NewCase orgId={orgId} onDone={() => setShow(false)} />}
      {detail.data && !canEdit && <NoPermission what="create cases" />}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted-foreground" htmlFor="st">Status</label>
        <select id="st" className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <QueryState q={q}>
        {rows.length === 0 ? (
          <EmptyState title="No cases" description="Create a case to start a removal request." />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Case</th><th className="p-3">Title</th><th className="p-3">Platform</th><th className="p-3">Status</th><th className="p-3">Priority</th><th className="p-3">Created</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3"><Link to="/app/cases/$id" params={{ id: r.id }} className="font-mono text-primary underline">{r.reference}</Link></td>
                    <td className="p-3">{r.title}</td>
                    <td className="p-3">{r.platform}</td>
                    <td className="p-3"><Badge variant="secondary">{STATUS_LABEL[r.status]}</Badge>{isRecheckDue(r) && <Badge className="ml-1">Recheck due</Badge>}</td>
                    <td className="p-3 capitalize">{r.priority}</td>
                    <td className="p-3">{fmtDate(r.created_at)}</td>
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

function NewCase({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const fn = useServerFn(createCase);
  const nav = useNavigate();
  const [f, setF] = useState({ title: "", platform: "Google", reviewUrl: "", reason: "", priority: "normal", recheckDays: 30 });
  const act = useAction((d: typeof f) => fn({ data: { orgId, ...d } }));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: k === "recheckDays" ? Number(e.target.value) : e.target.value });
  return (
    <form
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        act.mutate(f, { onSuccess: (id) => { onDone(); nav({ to: "/app/cases/$id", params: { id } }); } });
      }}
    >
      <Input aria-label="Title" placeholder="Title" value={f.title} onChange={set("title")} required />
      <Input aria-label="Platform" placeholder="Platform (e.g. Google)" value={f.platform} onChange={set("platform")} required />
      <Input aria-label="Review link" placeholder="https://… link to the review" value={f.reviewUrl} onChange={set("reviewUrl")} />
      <div className="flex gap-2">
        <select aria-label="Priority" className="h-9 flex-1 rounded-md border bg-background px-2 text-sm" value={f.priority} onChange={set("priority")}>
          {["low", "normal", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Input aria-label="Recheck after days" type="number" min={0} max={365} className="w-28" value={f.recheckDays} onChange={set("recheckDays")} title="Recheck after (days)" />
      </div>
      <Textarea aria-label="Reason" className="sm:col-span-2" placeholder="Why this content breaks the platform's policy (10+ characters)" value={f.reason} onChange={set("reason")} required />
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={act.isPending}>{act.isPending ? "Creating…" : "Create case"}</Button>
        <ActionMessage msg={act.msg} />
      </div>
    </form>
  );
}
