import { createFileRoute } from "@tanstack/react-router";

import { CtaBand } from "@/components/landing/CtaBand";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { WhyUs } from "@/components/landing/WhyUs";
import { PageHeading, PageShell } from "@/components/site/PageShell";

const title = "Cleaning Services & Prices — CleanConnect Hyderabad";
const description =
  "Home cleaning from ₹899, deep cleaning from ₹2,999, bathrooms from ₹599, kitchens from ₹999, sofa & carpet from ₹799 and office cleaning from ₹1,999.";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Services"
        title="Every service we offer, with starting prices"
        subtitle="Tap any service to start a booking. Final quote is confirmed on a short call before our team is dispatched."
      />
      <ServicesGrid heading={false} />
      <WhyUs />
      <CtaBand />
    </PageShell>
  );
}
