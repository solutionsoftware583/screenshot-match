import type { ReactNode } from "react";
import { BackendNotice, PageHeader } from "./primitives";

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function InfoPage({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      <BackendNotice feature={title} />
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export function meta(title: string, description: string, area = "Rating Guard") {
  return () => ({
    meta: [
      { title: `${title} — ${area}` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — ${area}` },
      { property: "og:description", content: description },
    ],
  });
}
