import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shows a freshly created invitation link once. Only its hash is stored, so it can't be shown again. */
export function InviteLink({ token }: { token: string }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite?token=${token}`;
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
      <p className="mb-2 font-medium">Invitation created. Email sending isn't set up yet — send this link to the person yourself. It is shown only once and expires in 7 days.</p>
      <div className="flex gap-2">
        <Input readOnly value={url} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
