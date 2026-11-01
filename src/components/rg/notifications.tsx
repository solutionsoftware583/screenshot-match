import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listNotifications, markNotificationsRead } from "@/lib/cases.functions";
import { MKEY, fmtDate, useAction } from "./manage";
import { Button } from "@/components/ui/button";

export function useNotifications() {
  const fn = useServerFn(listNotifications);
  return useQuery({ queryKey: [...MKEY, "notifications"], queryFn: () => fn(), refetchInterval: 60_000 });
}

export function NotificationList({ limit }: { limit?: number }) {
  const q = useNotifications();
  const mark = useServerFn(markNotificationsRead);
  const act = useAction((ids: string[] | null) => mark({ data: { ids } }));
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.error) return <p role="alert" className="text-sm text-destructive">Couldn't load notifications.</p>;
  const rows = (q.data ?? []).slice(0, limit);
  const unread = (q.data ?? []).filter((n) => !n.read_at).length;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No notifications yet.</p>;
  return (
    <div className="space-y-2">
      {unread > 0 && (
        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate(null)}>Mark all read ({unread})</Button>
      )}
      <ul className="space-y-1.5">
        {rows.map((n) => (
          <li key={n.id} className={`rounded border p-2 text-sm ${n.read_at ? "opacity-70" : "border-primary/40 bg-primary/5"}`}>
            {n.case_id ? (
              <Link to="/app/cases/$id" params={{ id: n.case_id }} className="font-medium text-primary underline" onClick={() => !n.read_at && act.mutate([n.id])}>{n.title}</Link>
            ) : <span className="font-medium">{n.title}</span>}
            {n.body && <div className="text-muted-foreground line-clamp-2">{n.body}</div>}
            <div className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
