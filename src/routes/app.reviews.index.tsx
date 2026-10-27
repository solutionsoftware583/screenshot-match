import { createFileRoute, Link } from "@tanstack/react-router";
import type { Review } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage, PLATFORM_OPTIONS } from "@/components/rg/ListPage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/reviews/")({
  head: () => ({
    meta: [
      { title: "Reviews — Rating Guard" },
      { name: "description", content: "Reviews from connected platforms across all locations." },
      { property: "og:title", content: "Reviews — Rating Guard" },
      {
        property: "og:description",
        content: "Reviews from connected platforms across all locations.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Review>
      title="Reviews"
      description="Reviews from connected platforms across all locations."
      queryKey="app.reviews.index"
      load={services.reviews.list}
      columns={[
        { key: "author", label: "Author" },
        { key: "rating", label: "Rating" },
        { key: "platform", label: "Platform" },
        { key: "postedAt", label: "Posted" },
        {
          key: "id",
          label: "",
          render: (r) => (
            <Link to="/app/reviews/$id" params={{ id: r.id }} className="text-primary underline">
              Open
            </Link>
          ),
        },
      ]}
      emptyTitle="No reviews"
      emptyDescription="Connect a review platform under Integrations to start monitoring."
      filter={{ key: "platform", label: "Platforms", options: PLATFORM_OPTIONS }}
      actions={
        <Button asChild variant="outline">
          <Link to="/app/integrations">View integrations</Link>
        </Button>
      }
    />
  );
}
