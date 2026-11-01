import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ActionMessage, fmtDate } from "./manage";
import type { EvidenceRow } from "@/lib/cases.functions";

/** Evidence items with a short-lived signed download link (storage RLS decides access). */
export function EvidenceList({ items }: { items: EvidenceRow[] }) {
  const [err, setErr] = useState<string | null>(null);
  const download = async (e: EvidenceRow) => {
    setErr(null);
    const r = await supabase.storage.from("case-evidence").createSignedUrl(e.storage_path!, 60, { download: e.file_name ?? true });
    if (r.error || !r.data) return setErr(r.error?.message ?? "Could not open the file");
    window.open(r.data.signedUrl, "_blank", "noopener");
  };
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No evidence yet.</p>;
  return (
    <>
      {err && <ActionMessage msg={{ ok: false, text: err }} />}
      <ul className="space-y-2 text-sm">
        {items.map((e) => (
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
    </>
  );
}
