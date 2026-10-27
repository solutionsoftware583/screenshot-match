import { createFileRoute } from "@tanstack/react-router";
import type { Business } from "@/lib/contracts";
import { services } from "@/services";
import { ListPage } from "@/components/rg/ListPage";
import { UnavailableButton } from "@/components/rg/primitives";

export const Route = createFileRoute("/app/businesses")({
  head: () => ({
    meta: [
      { title: "Businesses & Locations — Rating Guard" },
      { name: "description", content: "Businesses and locations your organization manages." },
      { property: "og:title", content: "Businesses & Locations — Rating Guard" },
      {
        property: "og:description",
        content: "Businesses and locations your organization manages.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ListPage<Business>
      title="Businesses & Locations"
      description="Businesses and locations your organization manages."
      queryKey="app.businesses"
      load={services.businesses.list}
      columns={[
        { key: "name", label: "Business" },
        { key: "locations", label: "Locations" },
        { key: "createdAt", label: "Added" },
      ]}
      emptyTitle="No businesses"
      emptyDescription="Add businesses once your organization account is connected."
      actions={<UnavailableButton>Add business</UnavailableButton>}
    />
  );
}
