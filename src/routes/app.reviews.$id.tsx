import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackendNotice, EmptyState, PageHeader } from "@/components/rg/primitives";
import { services } from "@/services";

export const Route = createFileRoute("/app/reviews/$id")({
  head: () => ({ meta: [{ title: "Review details — Rating Guard" }, { name: "description", content: "Review details and AI analysis." }, { name: "robots", content: "noindex" }] }),
  component: ReviewDetail,
});

function ReviewDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["review", id], queryFn: () => services.reviews.get(id) });
  return (
    <div>
      <PageHeader title="Review details" description={`Review ${id}`} />
      <BackendNotice feature="Review details" />
      {isLoading ? <div className="h-32 animate-pulse rounded bg-muted" /> : !data && (
        <EmptyState title="Review not found" description="This review doesn't exist or no data source is connected." action={<Button asChild variant="outline"><Link to="/app/reviews">Back to reviews</Link></Button>} />
      )}
    </div>
  );
}
