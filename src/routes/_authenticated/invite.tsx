import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brand } from "@/components/rg/primitives";
import { Button } from "@/components/ui/button";
import { ActionMessage, MKEY, QueryState, useAction } from "@/components/rg/manage";
import { getInvitationByToken, respondInvitation } from "@/lib/management.functions";

export const Route = createFileRoute("/_authenticated/invite")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s["token"] === "string" ? s["token"] : "" }),
  head: () => ({
    meta: [
      { title: "Accept invitation — Rating Guard" },
      { name: "description", content: "Join an organization on Rating Guard." },
      { property: "og:title", content: "Accept invitation — Rating Guard" },
      { property: "og:description", content: "Join an organization on Rating Guard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const fn = useServerFn(getInvitationByToken);
  const q = useQuery({ queryKey: [...MKEY, "invite", token], queryFn: () => fn({ data: { token } }), enabled: !!token });
  const respond = useAction(useServerFn(respondInvitation));
  const inv = q.data;
  const where = inv ? [inv.org_name ?? inv.reseller_name, inv.team_name && `team ${inv.team_name}`].filter(Boolean).join(", ") : "";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Brand />
      <div className="mt-8 rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Invitation</h1>
        {!token ? <p className="mt-2 text-sm text-muted-foreground">This link is missing its invitation code.</p> : (
          <QueryState q={q}>
            {!inv ? <p className="mt-2 text-sm text-muted-foreground">This invitation doesn't exist.</p> : (
              <div className="mt-3 space-y-4 text-sm">
                <p>You've been invited to join <strong>{where}</strong> as <strong>{inv.role_name}</strong>.</p>
                {inv.status !== "pending" ? (
                  <p className="text-muted-foreground">This invitation is {inv.status}.</p>
                ) : !inv.email_matches ? (
                  <p className="text-destructive">This invitation was sent to {inv.email}. Sign in with that email to accept it.</p>
                ) : (
                  <div className="flex gap-2">
                    <Button disabled={respond.isPending} onClick={() => respond.mutate({ data: { token, accept: true } }, { onSuccess: () => navigate({ to: "/app/team" }) })}>Accept</Button>
                    <Button variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ data: { token, accept: false } })}>Decline</Button>
                  </div>
                )}
                <ActionMessage msg={respond.msg} />
              </div>
            )}
          </QueryState>
        )}
        <Link to="/app" className="mt-6 inline-block text-sm text-primary underline">Go to workspace</Link>
      </div>
    </div>
  );
}
