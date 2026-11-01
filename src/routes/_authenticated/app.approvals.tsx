import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { ActionMessage, MKEY, NoOrg, NoPermission, QueryState, fmtDate, useAction, useCurrentOrg } from "@/components/rg/manage";
import { EvidenceList } from "@/components/rg/evidence";
import { listPendingApprovals, transitionCase } from "@/lib/cases.functions";

export const Route = createFileRoute("/_authenticated/app/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — Rating Guard" },
      { name: "description", content: "Review pending removal cases and their evidence, then approve or reject." },
      { property: "og:title", content: "Approval Queue — Rating Guard" },
      { property: "og:description", content: "Review pending removal cases and their evidence, then approve or reject." },
    ],
  }),
  component: Page,
});

type Data = Awaited<ReturnType<typeof listPendingApprovals>>;

function Page() {
  const { orgId, orgs } = useCurrentOrg();
  const fn = useServerFn(listPendingApprovals);
  const q = useQuery({ queryKey: [...MKEY, "approvals", orgId], queryFn: () => fn({ data: { orgId: orgId! } }), enabled: !!orgId });
  if (!orgs.isLoading && !orgId) return <NoOrg />;
  return (
    <div className="space-y-6">
      <PageHeader title="Approval Queue" description="Removal cases waiting for an approver before they can be submitted." />
      <QueryState q={q}>
        {q.data && !q.data.canApprove && <NoPermission what="approve cases" />}
        {q.data && q.data.cases.length === 0 ? (
          <EmptyState title="Nothing awaiting approval" description="Cases sent for approval appear here." />
        ) : (
          <div className="space-y-4">{q.data?.cases.map((c) => <Item key={c.id} c={c} canApprove={q.data!.canApprove} me={q.data!.me} />)}</div>
        )}
      </QueryState>
    </div>
  );
}

function Item({ c, canApprove, me }: { c: Data["cases"][number]; canApprove: boolean; me: string }) {
  const t = useServerFn(transitionCase);
  const [note, setNote] = useState("");
  const act = useAction((to: "approved" | "rejected") => t({ data: { id: c.id, to, note } }), "Decision saved");
  const own = c.created_by === me;
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/app/cases/$id" params={{ id: c.id }} className="font-mono text-primary underline">{c.reference}</Link>
        <span className="font-medium">{c.title}</span>
        <Badge variant="secondary">{c.platform}</Badge>
        <Badge variant="outline" className="capitalize">{c.priority}</Badge>
        <span className="text-xs text-muted-foreground">waiting since {fmtDate(c.updated_at)}</span>
      </div>
      <p className="text-sm"><span className="text-muted-foreground">Reason: </span>{c.reason}</p>
      {c.review_url && <a className="text-sm text-primary underline break-all" href={c.review_url} target="_blank" rel="noreferrer noopener">{c.review_url}</a>}
      <div>
        <h3 className="mb-1 text-sm font-semibold">Evidence ({c.evidence.length})</h3>
        <EvidenceList items={c.evidence} />
      </div>
      {canApprove && (own ? (
        <p className="text-sm text-muted-foreground">You created this case, so another approver must decide.</p>
      ) : (
        <div className="space-y-2">
          <Textarea aria-label={`Decision note for ${c.reference}`} placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={act.isPending} onClick={() => act.mutate("approved")}>Approve</Button>
            <Button variant="outline" disabled={act.isPending} onClick={() => act.mutate("rejected")}>Reject</Button>
            <ActionMessage msg={act.msg} />
          </div>
        </div>
      ))}
    </article>
  );
}
