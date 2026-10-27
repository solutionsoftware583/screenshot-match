import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BackendNotice, EmptyState, PageHeader, UnavailableButton } from "@/components/rg/primitives";
import { services } from "@/services";
import type { Case } from "@/lib/contracts";

export const Route = createFileRoute("/app/cases/$id")({
  head: () => ({ meta: [{ title: "Case workspace — Rating Guard" }, { name: "description", content: "Case details, evidence and timeline." }, { name: "robots", content: "noindex" }] }),
  component: CaseWorkspace,
});

function Field({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function CaseWorkspace() {
  const { id } = Route.useParams();
  const { data: c, isLoading } = useQuery({ queryKey: ["case", id], queryFn: () => services.cases.get(id) });
  if (isLoading) return <div className="h-40 animate-pulse rounded bg-muted" />;
  const ev = (type: string, vis?: "internal" | "client") => (c?.events ?? []).filter((e) => e.type === type || (vis && e.visibility === vis));

  return (
    <div>
      <PageHeader
        title={c ? `Case ${c.reference}` : `Case ${id}`}
        description={c ? c.targetUrl : "No case record found."}
        actions={<><UnavailableButton variant="outline">Request approval</UnavailableButton><UnavailableButton>Prepare submission</UnavailableButton></>}
      />
      <BackendNotice feature="The case workspace" />
      {!c && (
        <div className="mb-6">
          <EmptyState title="Case not found" description="Below is the workspace layout; every section is empty because no case record exists." action={<Button asChild variant="outline"><Link to="/app/cases">Back to cases</Link></Button>} />
        </div>
      )}
      <CaseBody c={c} ev={ev} />
    </div>
  );
}

function CaseBody({ c, ev }: { c: Case | null | undefined; ev: (t: string, v?: "internal" | "client") => Case["events"] }) {
  const list = (items: Case["events"], empty: string) =>
    items.length ? (
      <ol className="space-y-3 border-l pl-4">{items.map((e) => <li key={e.id} className="text-sm"><p className="text-xs text-muted-foreground">{e.at} · {e.actor}</p>{e.message}</li>)}</ol>
    ) : <EmptyState title={empty} />;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <aside className="space-y-5 lg:order-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Status: {c?.status ?? "—"}</Badge>
            <Badge variant="secondary">Priority: {c?.priority ?? "—"}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Case ID" value={c?.reference} />
            <Field label="Platform" value={c?.platform} />
            <Field label="Category" value={c?.category} />
            <Field label="Owner" value={c?.ownerName} />
            <Field label="Team" value={c?.team} />
            <Field label="Follow-up" value={c?.followUpAt} />
          </dl>
          <div className="mt-4"><Field label="Target URL" value={c?.targetUrl} /></div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">AI assessment</h3>
          {c?.assessment ? (
            <div className="mt-2 text-sm"><p>{c.assessment.verdict} ({Math.round(c.assessment.confidence * 100)}%)</p><p className="mt-2 text-muted-foreground">{c.assessment.rationale}</p></div>
          ) : <p className="mt-2 text-sm text-muted-foreground">No assessment. AI analysis is not connected. Assessments are advisory and require human review.</p>}
        </div>
      </aside>
      <div className="lg:col-span-2">
        <Tabs defaultValue="internal">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="internal"><Lock className="mr-1 h-3.5 w-3.5" />Internal</TabsTrigger>
            <TabsTrigger value="client"><Eye className="mr-1 h-3.5 w-3.5" />Client-visible</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="appeals">Appeals</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="internal" className="space-y-4">
            <p className="flex items-center gap-2 rounded-md bg-primary p-2 text-xs text-primary-foreground"><Lock className="h-3.5 w-3.5" /> Internal only — never shown to clients.</p>
            <Textarea placeholder="Add an internal note…" aria-label="Internal note" disabled />
            {list(ev("note", "internal"), "No internal notes")}
          </TabsContent>
          <TabsContent value="client" className="space-y-4">
            <p className="flex items-center gap-2 rounded-md bg-accent/30 p-2 text-xs"><Eye className="h-3.5 w-3.5" /> Visible to the client.</p>
            {list((c?.events ?? []).filter((e) => e.visibility === "client"), "No client communications")}
          </TabsContent>
          <TabsContent value="evidence">{c?.evidence.length ? <ul className="text-sm">{c.evidence.map((e) => <li key={e.id}>{e.fileName}</li>)}</ul> : <EmptyState title="No evidence attached" />}</TabsContent>
          <TabsContent value="approvals">{list(ev("approval"), "No approval history")}</TabsContent>
          <TabsContent value="submissions" className="space-y-4">{list(ev("submission"), "No submissions")}{list(ev("platform_response"), "No platform responses")}</TabsContent>
          <TabsContent value="appeals">{list(ev("appeal"), "No appeals")}</TabsContent>
          <TabsContent value="audit">{list(ev("audit"), "No audit events")}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
