import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { meta, Section } from "@/components/rg/InfoPage";
import { EmptyState, PageHeader } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionMessage, GEO_ROLE_LEVEL, LEVEL_LABEL, NoOrg, QueryState, personLabel, useAction, useCurrentOrg, useOrgDetail,
} from "@/components/rg/manage";
import { createRegion, deleteRegion, renameRegion } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/app/geography")({
  head: meta("Geographic Management", "Countries, states, divisions and districts with their managers."),
  component: Page,
});

const NEXT: Record<string, string> = { country: "state", state: "division", division: "district" };
type Detail = NonNullable<ReturnType<typeof useOrgDetail>["data"]>;

function Page() {
  const cur = useCurrentOrg();
  const q = useOrgDetail(cur.orgId);
  const d = q.data;
  const canManage = !!d?.permissions.includes("geo.manage");
  const add = useAction(useServerFn(createRegion), "Country added");
  const [name, setName] = useState("");

  return (
    <div className="space-y-5">
      <PageHeader title="Geographic Management" description="Optional hierarchy: Country → State → Division → District. Assign Country, State, Divisional and District Managers to a region from Members & Roles. Global Managers are platform-wide and set under Super Admin → Users." />
      <QueryState q={cur.orgs}>
        {!cur.orgId ? <NoOrg /> : (
          <QueryState q={q}>
            {d && (!d.org.geo_hierarchy_enabled ? (
              <EmptyState title="Geographic hierarchy is off" description="An Organization Admin can turn it on in Members & Roles → Organization settings." />
            ) : (
              <>
                {canManage && (
                  <Section title="Add country">
                    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ data: { orgId: d.org.id, level: "country", name } }, { onSuccess: () => setName("") }); }}>
                      <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Country name" required maxLength={200} />
                      <Button type="submit" disabled={add.isPending}>Add country</Button>
                      <ActionMessage msg={add.msg} />
                    </form>
                  </Section>
                )}
                {d.geo.filter((g) => !g.parent_id).length === 0 ? <EmptyState title="No regions yet" /> : (
                  <div className="rounded-lg border bg-card p-4">
                    <ul className="space-y-1">
                      {d.geo.filter((g) => !g.parent_id).map((g) => <Node key={g.id} node={g} d={d} canManage={canManage} />)}
                    </ul>
                  </div>
                )}
              </>
            ))}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function Node({ node, d, canManage }: { node: Detail["geo"][number]; d: Detail; canManage: boolean }) {
  const children = d.geo.filter((g) => g.parent_id === node.id);
  const managers = d.memberships.filter((m) => m.geographic_scope_id === node.id && GEO_ROLE_LEVEL[m.role_key] === node.level);
  const [mode, setMode] = useState<"add" | "rename" | null>(null);
  const [text, setText] = useState("");
  const add = useAction(useServerFn(createRegion));
  const ren = useAction(useServerFn(renameRegion));
  const del = useAction(useServerFn(deleteRegion));
  const next = NEXT[node.level];

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
        <span className="text-xs uppercase text-muted-foreground">{LEVEL_LABEL[node.level]}</span>
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">
          {managers.length ? `Manager: ${managers.map((m) => personLabel(d.people.find((p) => p.user_id === m.user_id), "member")).join(", ")}` : "No manager"}
        </span>
        {canManage && (
          <span className="ml-auto flex gap-1">
            {next && <Button size="sm" variant="ghost" onClick={() => { setMode("add"); setText(""); }}>+ {LEVEL_LABEL[next]}</Button>}
            <Button size="sm" variant="ghost" onClick={() => { setMode("rename"); setText(node.name); }}>Rename</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${node.name}?`) && del.mutate({ data: { id: node.id } })}>Delete</Button>
          </span>
        )}
      </div>
      {mode && (
        <form className="ml-6 flex gap-2 py-1" onSubmit={(e) => {
          e.preventDefault();
          const done = { onSuccess: () => setMode(null) };
          if (mode === "add") add.mutate({ data: { orgId: d.org.id, parentId: node.id, level: next!, name: text } }, done);
          else ren.mutate({ data: { id: node.id, name: text } }, done);
        }}>
          <Input className="h-8 max-w-xs" value={text} onChange={(e) => setText(e.target.value)} required maxLength={200} aria-label="Region name"
            placeholder={mode === "add" ? `${LEVEL_LABEL[next!]} name` : "New name"} />
          <Button size="sm" type="submit">Save</Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setMode(null)}>Cancel</Button>
        </form>
      )}
      <div className="ml-6"><ActionMessage msg={add.msg ?? ren.msg ?? del.msg} /></div>
      {children.length > 0 && (
        <ul className="ml-6 border-l pl-2">
          {children.map((c) => <Node key={c.id} node={c} d={d} canManage={canManage} />)}
        </ul>
      )}
    </li>
  );
}
