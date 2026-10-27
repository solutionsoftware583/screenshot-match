import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoPage, Section, meta } from "@/components/rg/InfoPage";
import { PLATFORM_OPTIONS } from "@/components/rg/ListPage";

export const Route = createFileRoute("/app/removals")({
  head: meta("Removal Request Preparation", "Draft a removal request for approval."),
  component: Removals,
});

function Removals() {
  const [v, setV] = useState({ platform: "", url: "", policy: "", statement: "" });
  const [errors, setErrors] = useState<
    Partial<Record<"platform" | "url" | "policy" | "statement", string>>
  >({});
  const [checked, setChecked] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Partial<Record<"platform" | "url" | "policy" | "statement", string>> = {};
    if (!v.platform) er.platform = "Choose a platform.";
    try {
      new URL(v.url);
    } catch {
      er.url = "Enter a valid URL (https://…).";
    }
    if (!v.policy.trim()) er.policy = "Name the policy this content violates.";
    if (v.statement.trim().length < 30)
      er.statement = "Explain the violation in at least 30 characters.";
    setErrors(er);
    setChecked(Object.keys(er).length === 0);
  }

  return (
    <InfoPage
      title="Removal Request Preparation"
      description="Draft a request. It must be approved before anything is filed with a platform."
    >
      <Section
        title="Request draft"
        description="Requests are filed only through the platform's official reporting channel."
      >
        <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Select value={v.platform} onValueChange={(platform) => setV({ ...v, platform })}>
              <SelectTrigger id="platform" aria-invalid={!!errors.platform}>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.platform && <p className="text-xs text-destructive">{errors.platform}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">Content URL</Label>
            <Input
              id="url"
              value={v.url}
              aria-invalid={!!errors.url}
              onChange={(e) => setV({ ...v, url: e.target.value })}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="policy">Policy violated</Label>
            <Input
              id="policy"
              value={v.policy}
              aria-invalid={!!errors.policy}
              onChange={(e) => setV({ ...v, policy: e.target.value })}
            />
            {errors.policy && <p className="text-xs text-destructive">{errors.policy}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="statement">Statement</Label>
            <Textarea
              id="statement"
              rows={5}
              value={v.statement}
              aria-invalid={!!errors.statement}
              onChange={(e) => setV({ ...v, statement: e.target.value })}
            />
            {errors.statement && <p className="text-xs text-destructive">{errors.statement}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" variant="outline">
              Validate draft
            </Button>
            <Button type="button" disabled title="Requires backend — not connected yet">
              Send for approval
            </Button>
          </div>
          {checked && (
            <p
              role="status"
              className="rounded-md border border-success/40 bg-success/10 p-3 text-sm md:col-span-2"
            >
              Draft is complete. It has not been saved or submitted — saving requires the backend.
            </p>
          )}
        </form>
      </Section>
    </InfoPage>
  );
}
