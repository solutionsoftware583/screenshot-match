import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Field {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  validate: (v: string, all: Record<string, string>) => string | null;
}

export const rules = {
  email: (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address."),
  required: (label: string) => (v: string) => (v.trim() ? null : `${label} is required.`),
  password: (v: string) => (v.length >= 8 ? null : "Password must be at least 8 characters."),
};

export type SubmitResult = { error?: string; success?: string } | void;

export function AuthForm({
  fields,
  submitLabel,
  onSubmit,
}: {
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<SubmitResult>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<SubmitResult>();
  const [busy, setBusy] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string | null> = {};
    for (const f of fields) next[f.name] = f.validate(values[f.name] ?? "", values);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    setResult(undefined);
    try {
      setResult(await onSubmit(values));
    } catch {
      setResult({ error: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} noValidate className="space-y-4">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
          {errors[f.name] && <p id={`${f.name}-err`} className="text-xs text-destructive">{errors[f.name]}</p>}
        </div>
      ))}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : submitLabel}</Button>
      {result?.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{result.error}</p>}
      {result?.success && <p role="status" className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">{result.success}</p>}
    </form>
  );
}
