import { PublicLayout } from "./PublicLayout";

export function LegalPage({ title, sections }: { title: string; sections: string[] }) {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-semibold">{title}</h1>
        <div
          role="note"
          className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm"
        >
          <strong>Legal content placeholder.</strong> This document has not been drafted or reviewed
          by counsel and is not in effect.
        </div>
        {sections.map((s, i) => (
          <section key={s} className="mt-8">
            <h2 className="text-lg font-semibold">
              {i + 1}. {s}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              [PLACEHOLDER — to be provided by Software Vala™ legal team.]
            </p>
          </section>
        ))}
      </article>
    </PublicLayout>
  );
}
