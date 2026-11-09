import type { ReactNode } from "react";
import { BackendNotice, PageHeader } from "./primitives";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-primary/10 bg-card shadow-card p-5">
      <h2 className="flex items-center gap-2 font-semibold"><span className="h-4 w-1 rounded-full bg-gradient-primary" />{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function InfoPage({
  title,
  description,
  actions,
  connected = false,
  children,
}: {
  /** Set when the page reads real data, to hide the "not connected" notice. */
  connected?: boolean;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      {!connected && <BackendNotice feature={title} />}
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
