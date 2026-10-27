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
  email: (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address.",
  required: (label: string) => (v: string) => (v.trim() ? null : `${label} is required.`),
  password: (v: string) => (v.length >= 8 ? null : "Password must be at least 8 characters."),
};

export function AuthForm({ fields, submitLabel }: { fields: Field[]; submitLabel: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [notice, setNotice] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string | null> = {};
    for (const f of fields) next[f.name] = f.validate(values[f.name] ?? "", values);
    setErrors(next);
    setNotice(Object.values(next).every((x) => !x));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          {errors[f.name] && (
            <p id={`${f.name}-err`} className="text-xs text-destructive">
              {errors[f.name]}
            </p>
          )}
        </div>
      ))}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
      {notice && (
        <p role="status" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          Your details look valid, but accounts are not connected yet — nothing was sent or saved.
        </p>
      )}
    </form>
  );
}
