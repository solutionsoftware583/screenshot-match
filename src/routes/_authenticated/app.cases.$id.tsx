import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { ActionMessage, MKEY, QueryState, fmtDate, useAction } from "@/components/rg/manage";
import { addEvidence, attachEvidenceFile, draftLetter, getCase, listLetters, recordRecheck, saveLetter, transitionCase } from "@/lib/cases.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery as useQ } from "@tanstack/react-query";
import { STATUS_LABEL, nextStatuses, recheckDueAt, sha256Hex, type CaseStatus } from "@/lib/caseflow";

export const Route = createFileRoute("/_authenticated/app/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case workspace — Rating Guard" },
      { name: "description", content: "Case details, evidence, approvals and timeline." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CaseWorkspace,
});

function CaseWorkspace() {
  const { id } = Route.useParams();
  const fn = useServerFn(getCase);
  const q = useQuery({ queryKey: [...MKEY, "case", id], queryFn: () => fn({ data: { id } }) });
  return (
    <QueryState q={q}>
      {q.data === null ? (
        <EmptyState title="Case not found" description="It doesn't exist or you don't have access." />
      ) : q.data ? (
        <Body d={q.data} />
      ) : null}
    </QueryState>
  );
}

type D = NonNullable<Awaited<ReturnType<typeof getCase>>>;

function Body({ d }: { d: D }) {
  const c = d.case;
  const due = recheckDueAt(c);
  return (
    <div className="space-y-6">
      <Link to="/app/cases" className="text-sm text-primary underline">← All cases</Link>
      <PageHeader title={`${c.reference} · ${c.title}`} description={`${c.platform} · priority ${c.priority}`} />
      <div className="flex flex-wrap gap-2">
        <Badge>{STATUS_LABEL[c.status]}</Badge>
        {due && <Badge variant="secondary">Recheck {due <= new Date() ? "due now" : `on ${fmtDate(due.toISOString())}`}</Badge>}
      </div>
      <section className="rounded-lg border p-4 text-sm space-y-2">
        <p><span className="text-muted-foreground">Reason: </span>{c.reason}</p>
        {c.review_url && <p><span className="text-muted-foreground">Review: </span><a className="text-primary underline break-all" href={c.review_url} target="_blank" rel="noreferrer noopener">{c.review_url}</a></p>}
        <p className="text-muted-foreground">Outcomes depend on the platform's decision; removal is never guaranteed.</p>
      </section>
      <Actions d={d} />
      <Evidence d={d} />
      {d.permissions.includes("roles.assign") && <Letter d={d} />}
      <section>
        <h2 className="mb-2 font-semibold">Timeline</h2>
        <ol className="space-y-2 text-sm">
          {d.events.map((e) => (
            <li key={e.id} className="rounded border p-2">
              <span className="text-muted-foreground">{fmtDate(e.at)} · </span>
              {e.kind === "status" ? `${STATUS_LABEL[e.from_status as CaseStatus] ?? e.from_status} → ${STATUS_LABEL[e.to_status as CaseStatus] ?? e.to_status}` : e.kind.replace(/_/g, " ")}
              {e.channel && ` · via ${e.channel}`}{e.external_ref && ` · ref ${e.external_ref}`}
              {e.note && <div className="text-muted-foreground">{e.note}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Actions({ d }: { d: D }) {
  const c = d.case;
  const t = useServerFn(transitionCase);
  const r = useServerFn(recordRecheck);
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState("");
  const [ref, setRef] = useState("");
  const act = useAction((to: CaseStatus) => t({ data: { id: c.id, to, note, channel, ref } }), "Case updated");
  const re = useAction((still: boolean) => r({ data: { id: c.id, stillRemoved: still, note } }), "Recheck recorded");
  let next = nextStatuses(c.status, d.permissions);
  if (c.created_by === d.me) next = next.filter((s) => s !== "approved" && s !== "rejected");
  const own = c.status === "pending_approval" && c.created_by === d.me && d.permissions.includes("cases.approve");
  if (next.length === 0 && c.status !== "removed")
    return own ? <p className="text-sm text-muted-foreground">Another approver must review a case you created.</p> : null;
  const needsChannel = next.some((s) => s === "submitted" || s === "appealed");
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">Next step</h2>
      {needsChannel && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Submitted via" placeholder="Submitted via (e.g. Google report form)" value={channel} onChange={(e) => setChannel(e.target.value)} />
          <Input aria-label="Platform reference" placeholder="Platform ticket / reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
      )}
      <Textarea aria-label="Note" placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button key={s} variant={s === "rejected" || s === "closed" ? "outline" : "default"} disabled={act.isPending} onClick={() => act.mutate(s)}>
            {s === "pending_approval" ? "Request approval" : `Mark ${STATUS_LABEL[s].toLowerCase()}`}
          </Button>
        ))}
        {c.status === "removed" && d.permissions.includes("cases.edit") && (
          <>
            <Button variant="outline" disabled={re.isPending} onClick={() => re.mutate(true)}>Recheck: still removed</Button>
            <Button variant="outline" disabled={re.isPending} onClick={() => re.mutate(false)}>Recheck: found again</Button>
          </>
        )}
      </div>
      <ActionMessage msg={act.msg ?? re.msg} />
    </section>
  );
}

function Evidence({ d }: { d: D }) {
  const add = useServerFn(addEvidence);
  const canAdd = d.permissions.includes("evidence.upload") && d.case.status !== "closed";
  const [f, setF] = useState({ title: "", kind: "screenshot", sourceUrl: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const attach = useServerFn(attachEvidenceFile);
  const act = useAction(async () => {
    if (file && file.size > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller");
    const meta = file ? { fileName: file.name, fileSize: file.size, sha256: await sha256Hex(await file.arrayBuffer()) } : {};
    const evidenceId = await add({ data: { caseId: d.case.id, ...f, ...meta } });
    if (file) {
      const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-100);
      const path = `${d.case.organization_id}/${d.case.id}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from("case-evidence").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw new Error(`Details saved, but the file upload failed: ${up.error.message}`);
      await attach({ data: { evidenceId, path, mime: file.type } });
    }
    return evidenceId;
  }, file ? "Evidence and file saved" : "Evidence recorded");
  const [dlErr, setDlErr] = useState<string | null>(null);
  const download = async (e: (typeof d.evidence)[number]) => {
    setDlErr(null);
    const r = await supabase.storage.from("case-evidence").createSignedUrl(e.storage_path!, 60, { download: e.file_name ?? true });
    if (r.error || !r.data) return setDlErr(r.error?.message ?? "Could not open the file");
    window.open(r.data.signedUrl, "_blank", "noopener");
  };
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Evidence</h2>
      {dlErr && <ActionMessage msg={{ ok: false, text: dlErr }} />}
      {d.evidence.length === 0 ? (
        <p className="text-sm text-muted-foreground">No evidence yet. At least one item is needed before approval.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {d.evidence.map((e) => (
            <li key={e.id} className="rounded border p-2">
              <div className="font-medium">{e.title} <Badge variant="secondary">{e.kind}</Badge></div>
              <div className="text-muted-foreground">Recorded {fmtDate(e.captured_at)}{e.file_name && ` · ${e.file_name}`}</div>
              {e.sha256 && <div className="font-mono text-xs break-all">SHA-256 {e.sha256}</div>}
              {e.source_url && <a className="text-primary underline break-all" href={e.source_url} target="_blank" rel="noreferrer noopener">{e.source_url}</a>}
              {e.notes && <div>{e.notes}</div>}
              {e.storage_path && <Button size="sm" variant="outline" className="mt-1" onClick={() => download(e)}>Download file</Button>}
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <form className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); act.mutate(undefined, { onSuccess: () => { setF({ title: "", kind: "screenshot", sourceUrl: "", notes: "" }); setFile(null); } }); }}>
          <Input aria-label="Evidence title" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
          <select aria-label="Evidence type" className="h-9 rounded-md border bg-background px-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {["screenshot", "document", "link", "note"].map((k) => <option key={k}>{k}</option>)}
          </select>
          <Input aria-label="Source link" placeholder="https://… (optional)" value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} />
          <Input aria-label="File" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Textarea aria-label="Evidence notes" className="sm:col-span-2" placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <p className="text-xs text-muted-foreground sm:col-span-2">The file's fingerprint (SHA-256), name and size are recorded with a server timestamp. The file itself is not stored yet.</p>
          <div className="flex items-center gap-3"><Button type="submit" disabled={act.isPending}>Add evidence</Button><ActionMessage msg={act.msg} /></div>
        </form>
      )}
    </section>
  );
}

function Letter({ d }: { d: D }) {
  const list = useServerFn(listLetters);
  const draft = useServerFn(draftLetter);
  const save = useServerFn(saveLetter);
  const q = useQ({ queryKey: [...MKEY, "letters", d.case.id], queryFn: () => list({ data: { caseId: d.case.id } }) });
  const [extra, setExtra] = useState("");
  const [body, setBody] = useState<string | null>(null);
  const latest = q.data?.[0];
  const text = body ?? latest?.body ?? "";
  const gen = useAction(async () => { const t = await draft({ data: { caseId: d.case.id, extra } }); setBody(t); return t; }, "Draft ready — review and edit before sending");
  const sv = useAction(() => save({ data: { caseId: d.case.id, body: text } }), "Letter saved");
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">Removal letter (AI-powered draft)</h2>
      <p className="text-sm text-muted-foreground">Drafted from this case's details and evidence. Always review it — facts, names and placeholders must be checked before sending. It is not legal advice.</p>
      <Textarea aria-label="Extra details for the letter" placeholder="Extra details for the letter (optional): dates, policy names, business contact…" value={extra} onChange={(e) => setExtra(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={gen.isPending} onClick={() => gen.mutate(undefined)}>{gen.isPending ? "Drafting…" : latest ? "Draft again" : "Draft letter"}</Button>
        <ActionMessage msg={gen.msg} />
      </div>
      <QueryState q={q}>
        {text ? (
          <>
            <Textarea aria-label="Letter text" className="min-h-80 font-mono text-sm" value={text} onChange={(e) => setBody(e.target.value)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={sv.isPending || body === null} onClick={() => sv.mutate(undefined)}>Save edits</Button>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(text)}>Copy</Button>
              {latest && <span className="text-xs text-muted-foreground">Last saved {fmtDate(latest.created_at)} · {latest.source === "ai_draft" ? "AI draft" : "edited"} · {q.data?.length} version(s)</span>}
              <ActionMessage msg={sv.msg} />
            </div>
          </>
        ) : null}
      </QueryState>
    </section>
  );
}
