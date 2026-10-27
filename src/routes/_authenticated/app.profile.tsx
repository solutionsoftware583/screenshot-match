import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { EmptyState, UnavailableButton } from "@/components/rg/primitives";
import { ActionMessage, QueryState, errMsg } from "@/components/rg/manage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyProfile, updateMyProfile } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: meta("Profile & Security", "Your personal details, password and sessions."),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (q.data) {
      setName(q.data.full_name ?? "");
      setOrg(q.data.organization ?? "");
    }
  }, [q.data]);
  const m = useMutation({
    mutationFn: () => save({ data: { full_name: name, organization: org } }),
    onMutate: () => setMsg(null),
    onSuccess: async () => {
      setMsg({ ok: true, text: "Profile saved" });
      await qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
  });
  const nameError =
    name.trim().length > 0 && name.trim().length < 2 ? "At least 2 characters" : null;

  return (
    <InfoPage
      connected
      title="Profile & Security"
      description="Your personal details, password and sessions."
    >
      <Section
        title="Profile"
        description="Your name and organization label. Roles and permissions are managed by administrators and can't be changed here."
      >
        <QueryState q={q}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="n">Full name</Label>
                <Input
                  id="n"
                  value={name}
                  maxLength={100}
                  required
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e">Email</Label>
                <Input id="e" value={q.data?.email ?? ""} disabled readOnly />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="o">Organization (label)</Label>
                <Input
                  id="o"
                  value={org}
                  maxLength={120}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={m.isPending || name.trim().length < 2}>
                {m.isPending ? "Saving…" : "Save profile"}
              </Button>
              <ActionMessage msg={msg} />
            </div>
          </form>
        </QueryState>
      </Section>
      <Section title="Security">
        <div className="flex flex-wrap gap-2">
          <UnavailableButton variant="outline">Change password</UnavailableButton>
          <UnavailableButton variant="outline">Enable two-factor</UnavailableButton>
        </div>
      </Section>
      <Section title="Active sessions">
        <EmptyState title="No sessions" />
      </Section>
    </InfoPage>
  );
}
